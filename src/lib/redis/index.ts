import Redis from "ioredis";

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Lazy Redis client initialization
let _redis: Redis | null = null;
let _subscriber: Redis | null = null;
let _publisher: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    _redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    _redis.on("connect", () => {
      console.log("Redis connected");
    });
  }
  return _redis;
}

export function getSubscriber(): Redis {
  if (!_subscriber) {
    _subscriber = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return _subscriber;
}

export function getPublisher(): Redis {
  if (!_publisher) {
    _publisher = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return _publisher;
}

// Export proxy for lazy initialization
export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return getRedis()[prop as keyof Redis];
  },
});

// Key prefixes for different data types
export const REDIS_KEYS = {
  // Session routing
  SESSION: (sessionId: string) => `termflux:session:${sessionId}`,
  SESSION_OUTPUT: (sessionId: string) => `termflux:session:${sessionId}:output`,
  SESSION_INPUT: (sessionId: string) => `termflux:session:${sessionId}:input`,

  // Workspace state
  WORKSPACE: (workspaceId: string) => `termflux:workspace:${workspaceId}`,
  WORKSPACE_SESSIONS: (workspaceId: string) => `termflux:workspace:${workspaceId}:sessions`,

  // User sessions
  USER_SESSIONS: (userId: string) => `termflux:user:${userId}:sessions`,
  USER_WORKSPACES: (userId: string) => `termflux:user:${userId}:workspaces`,

  // Authentication
  AUTH_TOKEN: (token: string) => `termflux:auth:${token}`,

  // Terminal buffer (last N lines for reconnection)
  TERMINAL_BUFFER: (sessionId: string) => `termflux:terminal:${sessionId}:buffer`,

  // Pub/Sub channels
  CHANNEL_SESSION_INPUT: (sessionId: string) => `termflux:channel:session:${sessionId}:input`,
  CHANNEL_SESSION_OUTPUT: (sessionId: string) => `termflux:channel:session:${sessionId}:output`,
  CHANNEL_WORKSPACE_EVENTS: (workspaceId: string) => `termflux:channel:workspace:${workspaceId}:events`,
} as const;

// Session state stored in Redis
export interface RedisSessionState {
  id: string;
  workspaceId: string;
  userId: string;
  containerId: string;
  tmuxSession: string;
  tmuxWindow: number;
  status: "active" | "disconnected" | "terminated";
  createdAt: string;
  lastActivity: string;
  shellPid?: number;
}

// Workspace state stored in Redis
export interface RedisWorkspaceState {
  id: string;
  userId: string;
  containerId: string;
  status: "starting" | "running" | "stopping" | "stopped" | "error";
  lastActivity: string;
  activeSessions: number;
}

/**
 * Session manager using Redis for state
 */
export class RedisSessionManager {
  private redis: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    this.redis = getRedis();
    this.subscriber = getSubscriber();
    this.publisher = getPublisher();
  }

  /**
   * Store session state
   */
  async setSession(session: RedisSessionState): Promise<void> {
    const key = REDIS_KEYS.SESSION(session.id);
    await this.redis.hset(key, {
      ...session,
      createdAt: session.createdAt || new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    });

    // Add to workspace sessions set
    await this.redis.sadd(REDIS_KEYS.WORKSPACE_SESSIONS(session.workspaceId), session.id);

    // Add to user sessions set
    await this.redis.sadd(REDIS_KEYS.USER_SESSIONS(session.userId), session.id);

    // Set TTL (24 hours for inactive sessions)
    await this.redis.expire(key, 86400);
  }

  /**
   * Get session state
   */
  async getSession(sessionId: string): Promise<RedisSessionState | null> {
    const key = REDIS_KEYS.SESSION(sessionId);
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0 || !data.id) {
      return null;
    }

    return {
      id: data.id,
      workspaceId: data.workspaceId || "",
      userId: data.userId || "",
      containerId: data.containerId || "",
      tmuxSession: data.tmuxSession || "",
      tmuxWindow: parseInt(data.tmuxWindow || "0", 10),
      status: (data.status as RedisSessionState["status"]) || "active",
      createdAt: data.createdAt || "",
      lastActivity: data.lastActivity || "",
      shellPid: data.shellPid ? parseInt(data.shellPid, 10) : undefined,
    };
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<void> {
    const key = REDIS_KEYS.SESSION(sessionId);
    await this.redis.hset(key, "lastActivity", new Date().toISOString());
    await this.redis.expire(key, 86400); // Reset TTL
  }

  /**
   * Remove session
   */
  async removeSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const key = REDIS_KEYS.SESSION(sessionId);
    await this.redis.del(key);
    await this.redis.del(REDIS_KEYS.TERMINAL_BUFFER(sessionId));
    await this.redis.srem(REDIS_KEYS.WORKSPACE_SESSIONS(session.workspaceId), sessionId);
    await this.redis.srem(REDIS_KEYS.USER_SESSIONS(session.userId), sessionId);
  }

  /**
   * Get all sessions for a workspace
   */
  async getWorkspaceSessions(workspaceId: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.WORKSPACE_SESSIONS(workspaceId));
  }

  /**
   * Store terminal output in circular buffer for reconnection
   */
  async appendTerminalBuffer(sessionId: string, data: string): Promise<void> {
    const key = REDIS_KEYS.TERMINAL_BUFFER(sessionId);
    const maxLines = 1000;

    // Append to list
    await this.redis.rpush(key, data);

    // Trim to max lines
    await this.redis.ltrim(key, -maxLines, -1);

    // Set TTL
    await this.redis.expire(key, 86400);
  }

  /**
   * Get terminal buffer for reconnection
   */
  async getTerminalBuffer(sessionId: string): Promise<string[]> {
    const key = REDIS_KEYS.TERMINAL_BUFFER(sessionId);
    return this.redis.lrange(key, 0, -1);
  }

  /**
   * Publish terminal input (from WebSocket to PTY)
   */
  async publishInput(sessionId: string, data: string): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_SESSION_INPUT(sessionId);
    await this.publisher.publish(channel, data);
  }

  /**
   * Publish terminal output (from PTY to WebSocket)
   */
  async publishOutput(sessionId: string, data: string): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_SESSION_OUTPUT(sessionId);
    await this.publisher.publish(channel, data);

    // Also append to buffer for reconnection
    await this.appendTerminalBuffer(sessionId, data);
  }

  /**
   * Subscribe to terminal input
   */
  async subscribeInput(sessionId: string, callback: (data: string) => void): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_SESSION_INPUT(sessionId);
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * Subscribe to terminal output
   */
  async subscribeOutput(sessionId: string, callback: (data: string) => void): Promise<void> {
    const channel = REDIS_KEYS.CHANNEL_SESSION_OUTPUT(sessionId);
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (ch, message) => {
      if (ch === channel) {
        callback(message);
      }
    });
  }

  /**
   * Unsubscribe from session channels
   */
  async unsubscribe(sessionId: string): Promise<void> {
    await this.subscriber.unsubscribe(
      REDIS_KEYS.CHANNEL_SESSION_INPUT(sessionId),
      REDIS_KEYS.CHANNEL_SESSION_OUTPUT(sessionId)
    );
  }

  /**
   * Store workspace state
   */
  async setWorkspace(workspace: RedisWorkspaceState): Promise<void> {
    const key = REDIS_KEYS.WORKSPACE(workspace.id);
    await this.redis.hset(key, {
      ...workspace,
      lastActivity: new Date().toISOString(),
    });

    // Add to user workspaces
    await this.redis.sadd(REDIS_KEYS.USER_WORKSPACES(workspace.userId), workspace.id);
  }

  /**
   * Get workspace state
   */
  async getWorkspace(workspaceId: string): Promise<RedisWorkspaceState | null> {
    const key = REDIS_KEYS.WORKSPACE(workspaceId);
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0 || !data.id) {
      return null;
    }

    return {
      id: data.id,
      userId: data.userId || "",
      containerId: data.containerId || "",
      status: (data.status as RedisWorkspaceState["status"]) || "stopped",
      lastActivity: data.lastActivity || "",
      activeSessions: parseInt(data.activeSessions || "0", 10),
    };
  }

  /**
   * Update workspace status
   */
  async updateWorkspaceStatus(workspaceId: string, status: RedisWorkspaceState["status"]): Promise<void> {
    const key = REDIS_KEYS.WORKSPACE(workspaceId);
    await this.redis.hset(key, {
      status,
      lastActivity: new Date().toISOString(),
    });
  }

  /**
   * Store auth token
   */
  async setAuthToken(token: string, userId: string, expiresInSeconds: number = 86400 * 7): Promise<void> {
    const key = REDIS_KEYS.AUTH_TOKEN(token);
    await this.redis.set(key, userId, "EX", expiresInSeconds);
  }

  /**
   * Get user ID from auth token
   */
  async getUserFromToken(token: string): Promise<string | null> {
    const key = REDIS_KEYS.AUTH_TOKEN(token);
    return this.redis.get(key);
  }

  /**
   * Remove auth token
   */
  async removeAuthToken(token: string): Promise<void> {
    const key = REDIS_KEYS.AUTH_TOKEN(token);
    await this.redis.del(key);
  }
}

// Export singleton
export const sessionManager = new RedisSessionManager();
