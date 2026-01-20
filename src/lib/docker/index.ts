import type Docker from "dockerode";
import type { Container, ContainerCreateOptions, ContainerInfo } from "dockerode";
import { EventEmitter } from "events";

// Docker client singleton - lazy loaded to avoid Turbopack issues
let _docker: Docker | null = null;
let _DockerClass: typeof Docker | null = null;

async function getDockerClass(): Promise<typeof Docker> {
  if (!_DockerClass) {
    const module = await import("dockerode");
    _DockerClass = module.default;
  }
  return _DockerClass;
}

async function getDocker(): Promise<Docker> {
  if (!_docker) {
    const DockerClass = await getDockerClass();
    _docker = new DockerClass({
      socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
    });
  }
  return _docker;
}

// Lazy docker proxy for synchronous access patterns
export const docker = {
  async getContainer(id: string) {
    const d = await getDocker();
    return d.getContainer(id);
  },
  async getVolume(name: string) {
    const d = await getDocker();
    return d.getVolume(name);
  },
  async createContainer(opts: ContainerCreateOptions) {
    const d = await getDocker();
    return d.createContainer(opts);
  },
  async createVolume(opts: { Name: string; Labels?: Record<string, string> }) {
    const d = await getDocker();
    return d.createVolume(opts);
  },
  async listContainers(opts?: { all?: boolean; filters?: Record<string, string[]> }) {
    const d = await getDocker();
    return d.listContainers(opts);
  },
};

// Workspace image configuration
export const WORKSPACE_IMAGE = process.env.WORKSPACE_IMAGE || "termflux-workspace:latest";
export const WORKSPACE_NETWORK = process.env.WORKSPACE_NETWORK || "termflux-network";

// Security configuration for containers
export const SECURITY_OPTS = [
  "no-new-privileges:true",
  // "seccomp=unconfined", // Use custom seccomp profile in production
];

export const CAP_DROP = [
  "ALL", // Drop all capabilities
];

export const CAP_ADD = [
  "CHOWN",
  "DAC_OVERRIDE",
  "FOWNER",
  "FSETID",
  "KILL",
  "SETGID",
  "SETUID",
  "SETPCAP",
  "NET_BIND_SERVICE",
  "SYS_CHROOT",
  "MKNOD",
  "AUDIT_WRITE",
  "SETFCAP",
];

export interface WorkspaceConfig {
  id: string;
  name: string;
  userId: string;
  image?: string;
  cpuLimit?: number; // CPU cores (e.g., 2)
  memoryLimit?: number; // Memory in MB (e.g., 2048)
  diskLimit?: number; // Disk in MB (e.g., 10240)
  env?: Record<string, string>;
  volumes?: string[];
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
}

export class ContainerManager extends EventEmitter {
  private containers: Map<string, Container> = new Map();

  /**
   * Create and start a new workspace container
   */
  async createWorkspace(config: WorkspaceConfig): Promise<string> {
    const {
      id,
      name,
      userId,
      image = WORKSPACE_IMAGE,
      cpuLimit = 2,
      memoryLimit = 2048,
      env = {},
    } = config;

    const containerName = `termflux-${id}`;
    const volumeName = `termflux-vol-${id}`;

    // Ensure volume exists
    await this.ensureVolume(volumeName);

    // Container configuration with security hardening
    const createOptions: ContainerCreateOptions = {
      name: containerName,
      Image: image,
      Hostname: name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase(),
      User: "1000:1000", // Non-root user
      WorkingDir: "/home/dev",
      Env: [
        `WORKSPACE_ID=${id}`,
        `WORKSPACE_NAME=${name}`,
        `USER_ID=${userId}`,
        "TERM=xterm-256color",
        "LANG=en_US.UTF-8",
        "HOME=/home/dev",
        ...Object.entries(env).map(([k, v]) => `${k}=${v}`),
      ],
      Labels: {
        "termflux.workspace.id": id,
        "termflux.workspace.name": name,
        "termflux.user.id": userId,
        "termflux.managed": "true",
      },
      HostConfig: {
        // Resource limits
        NanoCpus: cpuLimit * 1e9, // Convert cores to nanocores
        Memory: memoryLimit * 1024 * 1024, // Convert MB to bytes
        MemorySwap: memoryLimit * 1024 * 1024 * 2, // 2x memory for swap
        PidsLimit: 256,

        // Storage
        Binds: [`${volumeName}:/home/dev:rw`],

        // Security
        SecurityOpt: SECURITY_OPTS,
        CapDrop: CAP_DROP,
        CapAdd: CAP_ADD,
        ReadonlyRootfs: false, // Set to true in production with proper mounts

        // Network
        NetworkMode: "bridge",

        // Restart policy
        RestartPolicy: {
          Name: "unless-stopped",
          MaximumRetryCount: 3,
        },

        // Logging
        LogConfig: {
          Type: "json-file",
          Config: {
            "max-size": "10m",
            "max-file": "3",
          },
        },
      },
      // Enable tty for terminal
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    };

    try {
      // Check if container already exists
      const existing = await this.getContainer(id);
      if (existing) {
        // Remove existing container
        await this.removeWorkspace(id);
      }

      // Create container
      const container = await docker.createContainer(createOptions);
      this.containers.set(id, container);

      // Start container
      await container.start();

      // Initialize workspace (create directories, setup dotfiles, etc.)
      await this.initializeWorkspace(container, config);

      this.emit("workspace:created", { id, containerId: container.id });
      return container.id;
    } catch (error) {
      this.emit("workspace:error", { id, error });
      throw error;
    }
  }

  /**
   * Initialize workspace with default configuration
   */
  private async initializeWorkspace(container: Container, config: WorkspaceConfig): Promise<void> {
    const initScript = `
      # Create standard directories
      mkdir -p /home/dev/.config
      mkdir -p /home/dev/.ssh
      mkdir -p /home/dev/.local/bin
      mkdir -p /home/dev/projects

      # Set permissions
      chmod 700 /home/dev/.ssh
      chmod 755 /home/dev/.local/bin

      # Create default bashrc if not exists
      if [ ! -f /home/dev/.bashrc ]; then
        cat > /home/dev/.bashrc << 'BASHRC'
# Termflux Workspace
export PATH="$HOME/.local/bin:$PATH"
export EDITOR=vim
export VISUAL=vim

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git log --oneline -10'

# Prompt
PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '

# History
HISTSIZE=10000
HISTFILESIZE=20000
HISTCONTROL=ignoreboth

# Enable programmable completion
if [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
fi
BASHRC
      fi

      # Create default gitconfig if not exists
      if [ ! -f /home/dev/.gitconfig ]; then
        cat > /home/dev/.gitconfig << 'GITCONFIG'
[core]
    editor = vim
    autocrlf = input
[color]
    ui = auto
[pull]
    rebase = false
[init]
    defaultBranch = main
GITCONFIG
      fi

      # Ensure tmux is available and configured
      if [ ! -f /home/dev/.tmux.conf ]; then
        cat > /home/dev/.tmux.conf << 'TMUXCONF'
# Termflux tmux configuration
set -g default-terminal "xterm-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# Mouse support
set -g mouse on

# History
set -g history-limit 50000

# Start windows and panes at 1
set -g base-index 1
setw -g pane-base-index 1

# Renumber windows on close
set -g renumber-windows on

# Status bar
set -g status-style 'bg=#1a1a24 fg=#e4e4e7'
set -g status-left '#[fg=#22d3ee]#S #[fg=#52525b]| '
set -g status-right '#[fg=#52525b]| #[fg=#e4e4e7]%H:%M'

# Window status
setw -g window-status-current-style 'fg=#22d3ee bold'
setw -g window-status-style 'fg=#71717a'
TMUXCONF
      fi

      echo "Workspace initialized successfully"
    `;

    const exec = await container.exec({
      Cmd: ["bash", "-c", initScript],
      AttachStdout: true,
      AttachStderr: true,
      User: "1000:1000",
    });

    await exec.start({ Detach: false });
  }

  /**
   * Start an existing workspace container
   */
  async startWorkspace(workspaceId: string): Promise<void> {
    const container = await this.getContainer(workspaceId);
    if (!container) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const info = await container.inspect();
    if (!info.State.Running) {
      await container.start();
      this.emit("workspace:started", { id: workspaceId });
    }
  }

  /**
   * Stop a workspace container
   */
  async stopWorkspace(workspaceId: string): Promise<void> {
    const container = await this.getContainer(workspaceId);
    if (!container) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const info = await container.inspect();
    if (info.State.Running) {
      await container.stop({ t: 10 }); // 10 second timeout
      this.emit("workspace:stopped", { id: workspaceId });
    }
  }

  /**
   * Remove a workspace container and optionally its volume
   */
  async removeWorkspace(workspaceId: string, removeVolume = false): Promise<void> {
    const containerName = `termflux-${workspaceId}`;

    try {
      const container = await docker.getContainer(containerName);
      const info = await container.inspect();

      // Stop if running
      if (info.State.Running) {
        await container.stop({ t: 5 });
      }

      // Remove container
      await container.remove({ force: true });
      this.containers.delete(workspaceId);

      // Remove volume if requested
      if (removeVolume) {
        const volumeName = `termflux-vol-${workspaceId}`;
        try {
          const volume = await docker.getVolume(volumeName);
          await volume.remove();
        } catch {
          // Volume might not exist
        }
      }

      this.emit("workspace:removed", { id: workspaceId });
    } catch (error: unknown) {
      if ((error as { statusCode?: number }).statusCode !== 404) {
        throw error;
      }
    }
  }

  /**
   * Get container by workspace ID
   */
  async getContainer(workspaceId: string): Promise<Container | null> {
    // Check cache first
    if (this.containers.has(workspaceId)) {
      return this.containers.get(workspaceId)!;
    }

    const containerName = `termflux-${workspaceId}`;
    try {
      const container = await docker.getContainer(containerName);
      await container.inspect(); // Verify it exists
      this.containers.set(workspaceId, container);
      return container;
    } catch {
      return null;
    }
  }

  /**
   * Get container status
   */
  async getWorkspaceStatus(workspaceId: string): Promise<"running" | "stopped" | "not_found"> {
    const container = await this.getContainer(workspaceId);
    if (!container) {
      return "not_found";
    }

    try {
      const info = await container.inspect();
      return info.State.Running ? "running" : "stopped";
    } catch {
      return "not_found";
    }
  }

  /**
   * Get container stats
   */
  async getWorkspaceStats(workspaceId: string): Promise<ContainerStats | null> {
    const container = await this.getContainer(workspaceId);
    if (!container) {
      return null;
    }

    try {
      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

      return {
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage: stats.memory_stats.usage,
        memoryLimit: stats.memory_stats.limit,
        networkRx: stats.networks?.eth0?.rx_bytes || 0,
        networkTx: stats.networks?.eth0?.tx_bytes || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Execute a command in a workspace container
   */
  async exec(
    workspaceId: string,
    cmd: string[],
    options: { user?: string; workingDir?: string; env?: string[] } = {}
  ): Promise<{ output: string; exitCode: number }> {
    const container = await this.getContainer(workspaceId);
    if (!container) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      User: options.user || "1000:1000",
      WorkingDir: options.workingDir || "/home/dev",
      Env: options.env,
    });

    const stream = await exec.start({ Detach: false });

    return new Promise((resolve, reject) => {
      let output = "";

      stream.on("data", (chunk: Buffer) => {
        // Docker multiplexes stdout/stderr, strip the header
        output += chunk.slice(8).toString();
      });

      stream.on("end", async () => {
        const inspection = await exec.inspect();
        resolve({
          output: output.trim(),
          exitCode: inspection.ExitCode || 0,
        });
      });

      stream.on("error", reject);
    });
  }

  /**
   * Ensure a volume exists
   */
  private async ensureVolume(volumeName: string): Promise<void> {
    try {
      const volume = await docker.getVolume(volumeName);
      await volume.inspect();
    } catch {
      // Volume doesn't exist, create it
      await docker.createVolume({
        Name: volumeName,
        Labels: {
          "termflux.managed": "true",
        },
      });
    }
  }

  /**
   * List all managed containers
   */
  async listWorkspaces(): Promise<ContainerInfo[]> {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ["termflux.managed=true"],
      },
    });
    return containers;
  }

  /**
   * Cleanup stopped containers older than specified hours
   */
  async cleanup(olderThanHours = 24): Promise<number> {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    const containers = await this.listWorkspaces();
    let removed = 0;

    for (const info of containers) {
      if (info.State === "exited" && info.Created * 1000 < cutoff) {
        try {
          const container = await docker.getContainer(info.Id);
          await container.remove();
          removed++;
        } catch {
          // Ignore errors during cleanup
        }
      }
    }

    return removed;
  }
}

// Export singleton instance
export const containerManager = new ContainerManager();
