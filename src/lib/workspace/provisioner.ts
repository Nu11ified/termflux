import { containerManager, type WorkspaceConfig } from "@/lib/docker";
import { secretsManager } from "@/lib/secrets";
import { sessionManager } from "@/lib/redis";
import { githubManager } from "@/lib/github";
import { db } from "@/lib/db";
import { workspaces, workspaceApps, apps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Dotfiles configuration
export interface DotfilesConfig {
  repository?: string;
  branch?: string;
  installScript?: string;
  files?: Record<string, string>; // filename -> content
}

// App installation configuration
export interface AppInstallConfig {
  appId: string;
  version?: string;
  config?: Record<string, string>;
}

// Provisioning options
export interface ProvisioningOptions {
  dotfiles?: DotfilesConfig;
  gitConfig?: {
    name: string;
    email: string;
  };
  apps?: AppInstallConfig[];
  cloneRepositories?: Array<{
    url: string;
    path: string;
    branch?: string;
  }>;
  environment?: Record<string, string>;
  startupScript?: string;
  sshKey?: string;
  gpgKey?: string;
}

/**
 * Workspace Provisioner
 * Handles complete workspace setup including dotfiles, apps, and environment
 */
export class WorkspaceProvisioner {
  /**
   * Provision a new workspace
   */
  async provisionWorkspace(
    config: WorkspaceConfig,
    options: ProvisioningOptions = {}
  ): Promise<string> {
    // Create the container
    const containerId = await containerManager.createWorkspace(config);

    try {
      // Run provisioning steps in order
      await this.setupSSH(config.id, options.sshKey);
      await this.setupGPG(config.id, options.gpgKey);
      await this.setupGitConfig(config.id, options.gitConfig);
      await this.installDotfiles(config.id, options.dotfiles);
      await this.installApps(config.id, options.apps);
      await this.cloneRepositories(config.id, options.cloneRepositories);
      await this.injectSecrets(config.id);
      await this.setEnvironment(config.id, options.environment);
      await this.runStartupScript(config.id, options.startupScript);

      // Update workspace status in Redis
      await sessionManager.setWorkspace({
        id: config.id,
        userId: config.userId,
        containerId,
        status: "running",
        lastActivity: new Date().toISOString(),
        activeSessions: 0,
      });

      // Update database
      await db
        .update(workspaces)
        .set({
          containerId,
          status: "running",
          lastAccessedAt: new Date(),
        })
        .where(eq(workspaces.id, config.id));

      return containerId;
    } catch (error) {
      // Cleanup on failure
      await containerManager.removeWorkspace(config.id, false);
      throw error;
    }
  }

  /**
   * Set up SSH configuration
   */
  private async setupSSH(workspaceId: string, sshKey?: string): Promise<void> {
    if (!sshKey) return;

    const sshDir = "/home/dev/.ssh";
    const keyPath = `${sshDir}/id_ed25519`;

    // Create SSH directory with proper permissions
    await containerManager.exec(workspaceId, ["mkdir", "-p", sshDir]);
    await containerManager.exec(workspaceId, ["chmod", "700", sshDir]);

    // Write SSH key
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cat > ${keyPath} << 'SSH_KEY_EOF'\n${sshKey}\nSSH_KEY_EOF`,
    ]);
    await containerManager.exec(workspaceId, ["chmod", "600", keyPath]);

    // Create SSH config for common hosts
    const sshConfig = `Host github.com
  HostName github.com
  User git
  IdentityFile ${keyPath}
  IdentitiesOnly yes

Host gitlab.com
  HostName gitlab.com
  User git
  IdentityFile ${keyPath}
  IdentitiesOnly yes

Host bitbucket.org
  HostName bitbucket.org
  User git
  IdentityFile ${keyPath}
  IdentitiesOnly yes

Host *
  AddKeysToAgent yes
  IdentityFile ${keyPath}
`;

    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cat > ${sshDir}/config << 'SSH_CONFIG_EOF'\n${sshConfig}\nSSH_CONFIG_EOF`,
    ]);
    await containerManager.exec(workspaceId, ["chmod", "600", `${sshDir}/config`]);
  }

  /**
   * Set up GPG configuration
   */
  private async setupGPG(workspaceId: string, gpgKey?: string): Promise<void> {
    if (!gpgKey) return;

    // Import GPG key
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `echo '${gpgKey}' | gpg --import`,
    ]);

    // Configure Git to use GPG
    await containerManager.exec(workspaceId, [
      "git",
      "config",
      "--global",
      "commit.gpgsign",
      "true",
    ]);
  }

  /**
   * Set up Git configuration
   */
  private async setupGitConfig(
    workspaceId: string,
    gitConfig?: { name: string; email: string }
  ): Promise<void> {
    if (!gitConfig) return;

    await containerManager.exec(workspaceId, [
      "git",
      "config",
      "--global",
      "user.name",
      gitConfig.name,
    ]);
    await containerManager.exec(workspaceId, [
      "git",
      "config",
      "--global",
      "user.email",
      gitConfig.email,
    ]);
  }

  /**
   * Install dotfiles
   */
  private async installDotfiles(
    workspaceId: string,
    dotfiles?: DotfilesConfig
  ): Promise<void> {
    if (!dotfiles) return;

    // Clone dotfiles repository if provided
    if (dotfiles.repository) {
      const dotfilesDir = "/home/dev/.dotfiles";
      const cloneCmd = dotfiles.branch
        ? `git clone -b ${dotfiles.branch} ${dotfiles.repository} ${dotfilesDir}`
        : `git clone ${dotfiles.repository} ${dotfilesDir}`;

      await containerManager.exec(workspaceId, ["bash", "-c", cloneCmd]);

      // Run install script if provided
      if (dotfiles.installScript) {
        await containerManager.exec(workspaceId, [
          "bash",
          "-c",
          `cd ${dotfilesDir} && ${dotfiles.installScript}`,
        ]);
      } else {
        // Default: symlink common dotfiles
        const commonDotfiles = [
          ".bashrc",
          ".zshrc",
          ".vimrc",
          ".tmux.conf",
          ".gitconfig",
        ];

        for (const file of commonDotfiles) {
          await containerManager.exec(workspaceId, [
            "bash",
            "-c",
            `[ -f ${dotfilesDir}/${file} ] && ln -sf ${dotfilesDir}/${file} /home/dev/${file}`,
          ]);
        }
      }
    }

    // Write individual dotfile contents if provided
    if (dotfiles.files) {
      for (const [filename, content] of Object.entries(dotfiles.files)) {
        const filepath = filename.startsWith("/")
          ? filename
          : `/home/dev/${filename}`;

        await containerManager.exec(workspaceId, [
          "bash",
          "-c",
          `cat > ${filepath} << 'DOTFILE_EOF'\n${content}\nDOTFILE_EOF`,
        ]);
      }
    }
  }

  /**
   * Install workspace apps
   */
  private async installApps(
    workspaceId: string,
    appConfigs?: AppInstallConfig[]
  ): Promise<void> {
    if (!appConfigs || appConfigs.length === 0) return;

    for (const appConfig of appConfigs) {
      // Get app definition
      const [app] = await db.select().from(apps).where(eq(apps.id, appConfig.appId));

      if (!app || !app.manifest) {
        console.warn(`App ${appConfig.appId} not found, skipping`);
        continue;
      }

      const manifest = app.manifest as Record<string, unknown>;
      const installScript = manifest.install as string | undefined;

      if (installScript) {
        // Run install script with config
        const env = appConfig.config
          ? Object.entries(appConfig.config)
              .map(([k, v]) => `${k}="${v}"`)
              .join(" ")
          : "";

        await containerManager.exec(workspaceId, [
          "bash",
          "-c",
          `${env} ${installScript}`,
        ]);
      }

      // Record app installation
      await db.insert(workspaceApps).values({
        workspaceId,
        appId: appConfig.appId,
        config: appConfig.config || {},
      });
    }
  }

  /**
   * Clone repositories
   */
  private async cloneRepositories(
    workspaceId: string,
    repos?: Array<{ url: string; path: string; branch?: string }>
  ): Promise<void> {
    if (!repos || repos.length === 0) return;

    for (const repo of repos) {
      const args = ["git", "clone"];
      if (repo.branch) args.push("-b", repo.branch);
      args.push(repo.url, repo.path);

      await containerManager.exec(workspaceId, args);
    }
  }

  /**
   * Inject secrets into workspace
   */
  private async injectSecrets(workspaceId: string): Promise<void> {
    await secretsManager.injectSecretsToContainer(workspaceId);
  }

  /**
   * Set environment variables
   */
  private async setEnvironment(
    workspaceId: string,
    env?: Record<string, string>
  ): Promise<void> {
    if (!env || Object.keys(env).length === 0) return;

    const envFile = "/home/dev/.termflux_env";
    const envContent = Object.entries(env)
      .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
      .join("\n");

    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cat > ${envFile} << 'ENV_EOF'\n${envContent}\nENV_EOF\nchmod 600 ${envFile}`,
    ]);

    // Add to bashrc
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `grep -q "termflux_env" /home/dev/.bashrc || echo '\n[ -f ${envFile} ] && source ${envFile}' >> /home/dev/.bashrc`,
    ]);
  }

  /**
   * Run startup script
   */
  private async runStartupScript(
    workspaceId: string,
    script?: string
  ): Promise<void> {
    if (!script) return;

    await containerManager.exec(workspaceId, ["bash", "-c", script]);
  }

  /**
   * Deprovision a workspace
   */
  async deprovisionWorkspace(
    workspaceId: string,
    removeData: boolean = false
  ): Promise<void> {
    // Stop and remove container
    await containerManager.removeWorkspace(workspaceId, removeData);

    // Update database
    await db
      .update(workspaces)
      .set({
        containerId: null,
        status: "stopped",
      })
      .where(eq(workspaces.id, workspaceId));

    // Remove from Redis
    await sessionManager.updateWorkspaceStatus(workspaceId, "stopped");
  }

  /**
   * Snapshot workspace state
   */
  async snapshotWorkspace(workspaceId: string): Promise<string> {
    const container = await containerManager.getContainer(workspaceId);
    if (!container) {
      throw new Error("Workspace container not found");
    }

    // Create snapshot using docker commit
    const snapshotName = `termflux-snapshot-${workspaceId}-${Date.now()}`;
    const info = await container.inspect();

    // This would need the Docker API to commit
    // For now, we'll document the approach
    console.log(`Would create snapshot: ${snapshotName} from ${info.Id}`);

    return snapshotName;
  }

  /**
   * Restore workspace from snapshot
   */
  async restoreFromSnapshot(
    workspaceId: string,
    snapshotName: string
  ): Promise<void> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Remove current container
    await containerManager.removeWorkspace(workspaceId, false);

    // Create new container from snapshot
    const config: WorkspaceConfig = {
      id: workspaceId,
      name: workspace.name,
      userId: workspace.userId,
      image: snapshotName,
      cpuLimit: workspace.cpuLimit || 2,
      memoryLimit: workspace.memoryLimit || 2048,
    };

    await containerManager.createWorkspace(config);
  }

  /**
   * Export workspace configuration
   */
  async exportConfig(workspaceId: string): Promise<ProvisioningOptions> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Get installed apps
    const installedApps = await db
      .select()
      .from(workspaceApps)
      .where(eq(workspaceApps.workspaceId, workspaceId));

    // Get secrets (names only, not values)
    const secretsList = await secretsManager.listSecrets(workspaceId);

    return {
      apps: installedApps.map((app) => ({
        appId: app.appId,
        config: app.config as Record<string, string>,
      })),
      environment: workspace.env as Record<string, string> || {},
    };
  }

  /**
   * Import workspace configuration
   */
  async importConfig(
    workspaceId: string,
    config: ProvisioningOptions
  ): Promise<void> {
    // Apply configuration to existing workspace
    await this.installApps(workspaceId, config.apps);
    await this.setEnvironment(workspaceId, config.environment);
    await this.installDotfiles(workspaceId, config.dotfiles);

    if (config.gitConfig) {
      await this.setupGitConfig(workspaceId, config.gitConfig);
    }

    if (config.startupScript) {
      await this.runStartupScript(workspaceId, config.startupScript);
    }
  }

  /**
   * Get workspace health status
   */
  async getHealthStatus(workspaceId: string): Promise<{
    container: "running" | "stopped" | "not_found";
    memory: { used: number; limit: number; percent: number } | null;
    cpu: number | null;
    disk: { used: number; total: number; percent: number } | null;
    sessions: number;
    uptime: number | null;
  }> {
    const containerStatus = await containerManager.getWorkspaceStatus(workspaceId);
    const stats = await containerManager.getWorkspaceStats(workspaceId);

    // Get session count
    const sessions = await sessionManager.getWorkspaceSessions(workspaceId);

    // Get disk usage
    let disk = null;
    if (containerStatus === "running") {
      const { output } = await containerManager.exec(workspaceId, [
        "df",
        "-B1",
        "/home/dev",
      ]);
      const lines = output.split("\n");
      const dataLine = lines[1];
      if (dataLine) {
        const parts = dataLine.split(/\s+/);
        const totalStr = parts[1];
        const usedStr = parts[2];
        if (totalStr && usedStr) {
          const total = parseInt(totalStr, 10);
          const used = parseInt(usedStr, 10);
          if (total > 0) {
            disk = {
              used,
              total,
              percent: Math.round((used / total) * 100),
            };
          }
        }
      }
    }

    // Get uptime
    let uptime = null;
    if (containerStatus === "running") {
      const container = await containerManager.getContainer(workspaceId);
      if (container) {
        const info = await container.inspect();
        const startedAt = new Date(info.State.StartedAt);
        uptime = Date.now() - startedAt.getTime();
      }
    }

    return {
      container: containerStatus,
      memory: stats
        ? {
            used: stats.memoryUsage,
            limit: stats.memoryLimit,
            percent: Math.round((stats.memoryUsage / stats.memoryLimit) * 100),
          }
        : null,
      cpu: stats?.cpuPercent || null,
      disk,
      sessions: sessions.length,
      uptime,
    };
  }
}

// Export singleton
export const workspaceProvisioner = new WorkspaceProvisioner();
