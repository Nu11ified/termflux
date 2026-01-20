import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { containerManager } from "@/lib/docker";
import { sessionManager, type RedisSessionState } from "@/lib/redis";
import { db } from "@/lib/db";
import { sessions, workspaces, authSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// Message types for WebSocket protocol
export interface WSMessage {
  type: "input" | "output" | "resize" | "ping" | "pong" | "error" | "ready" | "reconnect";
  data?: string;
  cols?: number;
  rows?: number;
  sessionId?: string;
  error?: string;
}

// Active connection state
interface ConnectionState {
  ws: WebSocket;
  sessionId: string;
  workspaceId: string;
  userId: string;
  containerId: string;
  tmuxSession: string;
  stream: Duplex | null;
  lastPing: number;
  isAlive: boolean;
}

/**
 * Terminal WebSocket Server
 * Handles real-time terminal I/O between browser and Docker containers
 */
export class TerminalWSServer {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, ConnectionState> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(port: number = 3001): WebSocketServer {
    this.wss = new WebSocketServer({
      port,
      path: "/ws/terminal",
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    this.wss.on("connection", this.handleConnection.bind(this));
    this.wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    // Start ping interval
    this.startPingInterval();

    console.log(`Terminal WebSocket server started on port ${port}`);
    return this.wss;
  }

  /**
   * Handle upgrade from HTTP server (for integration with Next.js)
   */
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    if (!this.wss) {
      socket.destroy();
      return;
    }

    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/ws/terminal") {
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss!.emit("connection", ws, request);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const token = url.searchParams.get("token");
    const sessionId = url.searchParams.get("sessionId");
    const workspaceId = url.searchParams.get("workspaceId");

    // Validate required parameters
    if (!token || !workspaceId) {
      this.sendError(ws, "Missing required parameters");
      ws.close(4001, "Missing required parameters");
      return;
    }

    // Authenticate user
    const user = await this.authenticateUser(token);
    if (!user) {
      this.sendError(ws, "Authentication failed");
      ws.close(4002, "Authentication failed");
      return;
    }

    // Verify workspace access
    const workspace = await this.verifyWorkspaceAccess(workspaceId, user.id);
    if (!workspace) {
      this.sendError(ws, "Workspace not found or access denied");
      ws.close(4003, "Workspace not found or access denied");
      return;
    }

    try {
      let connectionState: ConnectionState;

      if (sessionId) {
        // Reconnect to existing session
        connectionState = await this.reconnectSession(ws, sessionId, user.id);
      } else {
        // Create new session
        connectionState = await this.createSession(ws, workspaceId, user.id, workspace.containerId!);
      }

      // Set up message handlers
      ws.on("message", (data) => this.handleMessage(connectionState, data));
      ws.on("close", () => this.handleClose(connectionState));
      ws.on("error", (error) => this.handleError(connectionState, error));
      ws.on("pong", () => {
        connectionState.isAlive = true;
        connectionState.lastPing = Date.now();
      });

      // Store connection
      this.connections.set(connectionState.sessionId, connectionState);

      // Send ready message
      this.send(ws, {
        type: "ready",
        sessionId: connectionState.sessionId,
      });
    } catch (error) {
      console.error("Connection setup error:", error);
      this.sendError(ws, `Connection failed: ${(error as Error).message}`);
      ws.close(4004, "Connection failed");
    }
  }

  /**
   * Create new terminal session
   */
  private async createSession(
    ws: WebSocket,
    workspaceId: string,
    userId: string,
    containerId: string
  ): Promise<ConnectionState> {
    const sessionId = nanoid(12);
    const tmuxSession = `termflux-${sessionId}`;

    // Create tmux session in container
    const container = await containerManager.getContainer(workspaceId);
    if (!container) {
      throw new Error("Container not found");
    }

    // Initialize tmux session
    await this.initTmuxSession(container, tmuxSession);

    // Create database session record
    await db.insert(sessions).values({
      id: sessionId,
      workspaceId,
      name: `Terminal ${sessionId.slice(0, 6)}`,
      shellPath: "/bin/bash",
      tmuxSession,
      tmuxWindow: 0,
      status: "active",
    });

    // Store in Redis
    const redisState: RedisSessionState = {
      id: sessionId,
      workspaceId,
      userId,
      containerId,
      tmuxSession,
      tmuxWindow: 0,
      status: "active",
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    await sessionManager.setSession(redisState);

    // Attach to tmux session
    const stream = await this.attachToTmux(container, tmuxSession);

    const connectionState: ConnectionState = {
      ws,
      sessionId,
      workspaceId,
      userId,
      containerId,
      tmuxSession,
      stream,
      lastPing: Date.now(),
      isAlive: true,
    };

    // Pipe output to WebSocket
    if (stream) {
      stream.on("data", (data: Buffer) => {
        const output = this.stripDockerHeader(data);
        this.send(ws, { type: "output", data: output });
        sessionManager.appendTerminalBuffer(sessionId, output).catch(console.error);
      });

      stream.on("end", () => {
        this.handleStreamEnd(connectionState);
      });
    }

    return connectionState;
  }

  /**
   * Reconnect to existing session
   */
  private async reconnectSession(
    ws: WebSocket,
    sessionId: string,
    userId: string
  ): Promise<ConnectionState> {
    // Get session from Redis
    const redisSession = await sessionManager.getSession(sessionId);
    if (!redisSession) {
      throw new Error("Session not found");
    }

    if (redisSession.userId !== userId) {
      throw new Error("Session access denied");
    }

    // Get container
    const container = await containerManager.getContainer(redisSession.workspaceId);
    if (!container) {
      throw new Error("Container not found");
    }

    // Send buffered output for reconnection
    const buffer = await sessionManager.getTerminalBuffer(sessionId);
    if (buffer.length > 0) {
      this.send(ws, {
        type: "reconnect",
        data: buffer.join(""),
      });
    }

    // Reattach to tmux session
    const stream = await this.attachToTmux(container, redisSession.tmuxSession);

    // Update session status
    await sessionManager.setSession({
      ...redisSession,
      status: "active",
    });

    const connectionState: ConnectionState = {
      ws,
      sessionId,
      workspaceId: redisSession.workspaceId,
      userId,
      containerId: redisSession.containerId,
      tmuxSession: redisSession.tmuxSession,
      stream,
      lastPing: Date.now(),
      isAlive: true,
    };

    // Pipe output to WebSocket
    if (stream) {
      stream.on("data", (data: Buffer) => {
        const output = this.stripDockerHeader(data);
        this.send(ws, { type: "output", data: output });
        sessionManager.appendTerminalBuffer(sessionId, output).catch(console.error);
      });

      stream.on("end", () => {
        this.handleStreamEnd(connectionState);
      });
    }

    return connectionState;
  }

  /**
   * Initialize tmux session in container
   */
  private async initTmuxSession(container: ReturnType<typeof containerManager.getContainer> extends Promise<infer T> ? NonNullable<T> : never, tmuxSession: string): Promise<void> {
    const exec = await container.exec({
      Cmd: [
        "tmux",
        "new-session",
        "-d",
        "-s",
        tmuxSession,
        "-x",
        "120",
        "-y",
        "30",
      ],
      AttachStdout: true,
      AttachStderr: true,
      User: "1000:1000",
    });

    await exec.start({ Detach: false });
  }

  /**
   * Attach to tmux session and return stream
   */
  private async attachToTmux(
    container: ReturnType<typeof containerManager.getContainer> extends Promise<infer T> ? NonNullable<T> : never,
    tmuxSession: string
  ): Promise<Duplex> {
    const exec = await container.exec({
      Cmd: ["tmux", "attach-session", "-t", tmuxSession],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      User: "1000:1000",
    });

    const stream = await exec.start({
      Detach: false,
      hijack: true,
      stdin: true,
    });

    return stream;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(state: ConnectionState, rawData: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      const data = Buffer.isBuffer(rawData)
        ? rawData.toString()
        : Array.isArray(rawData)
        ? Buffer.concat(rawData).toString()
        : Buffer.from(rawData).toString();

      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case "input":
          this.handleInput(state, message.data || "");
          break;

        case "resize":
          this.handleResize(state, message.cols || 80, message.rows || 24);
          break;

        case "ping":
          this.send(state.ws, { type: "pong" });
          break;
      }

      // Update activity
      sessionManager.updateActivity(state.sessionId).catch(console.error);
    } catch (error) {
      console.error("Message handling error:", error);
    }
  }

  /**
   * Handle terminal input
   */
  private handleInput(state: ConnectionState, data: string): void {
    if (state.stream && state.stream.writable) {
      state.stream.write(data);
    }
  }

  /**
   * Handle terminal resize
   */
  private async handleResize(state: ConnectionState, cols: number, rows: number): Promise<void> {
    try {
      const container = await containerManager.getContainer(state.workspaceId);
      if (!container) return;

      // Resize tmux window
      const exec = await container.exec({
        Cmd: ["tmux", "resize-window", "-t", state.tmuxSession, "-x", cols.toString(), "-y", rows.toString()],
        AttachStdout: true,
        AttachStderr: true,
        User: "1000:1000",
      });

      await exec.start({ Detach: false });
    } catch (error) {
      console.error("Resize error:", error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private async handleClose(state: ConnectionState): Promise<void> {
    console.log(`Connection closed: ${state.sessionId}`);

    // Mark session as disconnected (not terminated - allows reconnection)
    await sessionManager.setSession({
      id: state.sessionId,
      workspaceId: state.workspaceId,
      userId: state.userId,
      containerId: state.containerId,
      tmuxSession: state.tmuxSession,
      tmuxWindow: 0,
      status: "disconnected",
      createdAt: "",
      lastActivity: new Date().toISOString(),
    });

    // Clean up stream
    if (state.stream) {
      state.stream.end();
    }

    this.connections.delete(state.sessionId);
  }

  /**
   * Handle WebSocket error
   */
  private handleError(state: ConnectionState, error: Error): void {
    console.error(`Connection error for ${state.sessionId}:`, error);
  }

  /**
   * Handle stream end (tmux session ended)
   */
  private async handleStreamEnd(state: ConnectionState): Promise<void> {
    // Update session status
    await db
      .update(sessions)
      .set({ status: "terminated", closedAt: new Date() })
      .where(eq(sessions.id, state.sessionId));

    await sessionManager.removeSession(state.sessionId);

    // Notify client
    this.send(state.ws, {
      type: "error",
      error: "Session terminated",
    });

    state.ws.close(1000, "Session terminated");
  }

  /**
   * Authenticate user by token
   */
  private async authenticateUser(token: string): Promise<{ id: string } | null> {
    // First check Redis cache
    const cachedUserId = await sessionManager.getUserFromToken(token);
    if (cachedUserId) {
      return { id: cachedUserId };
    }

    // Check database
    const [authSession] = await db
      .select()
      .from(authSessions)
      .where(and(eq(authSessions.token, token), eq(authSessions.isValid, true)));

    if (!authSession || new Date(authSession.expiresAt) < new Date()) {
      return null;
    }

    // Cache in Redis
    const expiresIn = Math.floor((new Date(authSession.expiresAt).getTime() - Date.now()) / 1000);
    await sessionManager.setAuthToken(token, authSession.userId, expiresIn);

    return { id: authSession.userId };
  }

  /**
   * Verify workspace access
   */
  private async verifyWorkspaceAccess(
    workspaceId: string,
    userId: string
  ): Promise<{ id: string; containerId: string | null } | null> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)));

    if (!workspace) {
      return null;
    }

    return {
      id: workspace.id,
      containerId: workspace.containerId,
    };
  }

  /**
   * Send message to WebSocket
   */
  private send(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: "error", error });
  }

  /**
   * Strip Docker multiplexing header from output
   */
  private stripDockerHeader(data: Buffer): string {
    // Docker multiplexes stdout/stderr with 8-byte header
    // Header format: [stream_type (1 byte), 0, 0, 0, size (4 bytes BE)]
    if (data.length > 8 && (data[0] === 1 || data[0] === 2)) {
      return data.slice(8).toString("utf8");
    }
    return data.toString("utf8");
  }

  /**
   * Start ping interval for connection health checks
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [sessionId, state] of this.connections) {
        if (!state.isAlive) {
          console.log(`Connection ${sessionId} timed out`);
          state.ws.terminate();
          this.connections.delete(sessionId);
          continue;
        }

        state.isAlive = false;
        state.ws.ping();
      }
    }, 30000);
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const state = this.connections.get(sessionId);
    if (state) {
      // Kill tmux session
      const container = await containerManager.getContainer(state.workspaceId);
      if (container) {
        const exec = await container.exec({
          Cmd: ["tmux", "kill-session", "-t", state.tmuxSession],
          AttachStdout: true,
          AttachStderr: true,
          User: "1000:1000",
        });
        await exec.start({ Detach: false });
      }

      state.ws.close(1000, "Session terminated");
    }

    await sessionManager.removeSession(sessionId);
    this.connections.delete(sessionId);
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const state of this.connections.values()) {
      state.ws.close(1001, "Server shutting down");
    }

    this.connections.clear();
    this.wss?.close();
  }
}

// Export singleton
export const terminalWSServer = new TerminalWSServer();
