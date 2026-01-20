import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { containerManager } from "@/lib/docker";

// GitHub App configuration
const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_APP_PRIVATE_KEY = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Types
export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  owner: {
    login: string;
    avatarUrl: string;
  };
}

export interface PullRequestInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
}

export interface PullRequestOutput {
  id: number;
  number: number;
  htmlUrl: string;
  title: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchInput {
  owner: string;
  repo: string;
  branchName: string;
  fromBranch?: string;
}

export interface CommitInput {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: Array<{
    path: string;
    content: string;
    mode?: "100644" | "100755" | "040000" | "160000" | "120000";
  }>;
}

/**
 * GitHub Integration Manager
 * Handles GitHub App authentication, repository operations, and PR creation
 */
export class GitHubManager {
  private appOctokit: Octokit | null = null;

  constructor() {
    if (GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY) {
      this.appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: GITHUB_APP_ID,
          privateKey: GITHUB_APP_PRIVATE_KEY,
        },
      });
    }
  }

  /**
   * Get Octokit instance authenticated as the GitHub App for a specific installation
   */
  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    if (!this.appOctokit || !GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY) {
      throw new Error("GitHub App not configured");
    }

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: GITHUB_APP_ID,
        privateKey: GITHUB_APP_PRIVATE_KEY,
        installationId,
      },
    });
  }

  /**
   * Get Octokit instance with user access token
   */
  getUserOctokit(accessToken: string): Octokit {
    return new Octokit({
      auth: accessToken,
    });
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; tokenType: string }> {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      throw new Error("GitHub OAuth not configured");
    }

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
    };
  }

  /**
   * Get authenticated user info
   */
  async getUser(octokit: Octokit): Promise<GitHubUser> {
    const { data } = await octokit.users.getAuthenticated();

    return {
      id: data.id,
      login: data.login,
      name: data.name,
      email: data.email,
      avatarUrl: data.avatar_url,
    };
  }

  /**
   * List user repositories
   */
  async listRepositories(octokit: Octokit, page = 1, perPage = 30): Promise<GitHubRepository[]> {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      direction: "desc",
      page,
      per_page: perPage,
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      owner: {
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    }));
  }

  /**
   * Get repository details
   */
  async getRepository(octokit: Octokit, owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await octokit.repos.get({ owner, repo });

    return {
      id: data.id,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      htmlUrl: data.html_url,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
      defaultBranch: data.default_branch,
      isPrivate: data.private,
      owner: {
        login: data.owner.login,
        avatarUrl: data.owner.avatar_url,
      },
    };
  }

  /**
   * Create a new branch
   */
  async createBranch(octokit: Octokit, input: BranchInput): Promise<void> {
    const { owner, repo, branchName, fromBranch } = input;

    // Get the SHA of the source branch
    const sourceBranch = fromBranch || (await this.getRepository(octokit, owner, repo)).defaultBranch;
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${sourceBranch}`,
    });

    // Create the new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha,
    });
  }

  /**
   * Create a commit with files
   */
  async createCommit(octokit: Octokit, input: CommitInput): Promise<string> {
    const { owner, repo, branch, message, files } = input;

    // Get the current commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const currentCommitSha = ref.object.sha;

    // Get the current tree
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });
    const currentTreeSha = commit.tree.sha;

    // Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return {
          path: file.path,
          mode: file.mode || "100644",
          type: "blob" as const,
          sha: blob.sha,
        };
      })
    );

    // Create a new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentTreeSha,
      tree: blobs,
    });

    // Create the commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // Update the reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return newCommit.sha;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(octokit: Octokit, input: PullRequestInput): Promise<PullRequestOutput> {
    const { data } = await octokit.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
      draft: input.draft || false,
    });

    return {
      id: data.id,
      number: data.number,
      htmlUrl: data.html_url,
      title: data.title,
      state: data.state,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    octokit: Octokit,
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ): Promise<PullRequestOutput[]> {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state,
      sort: "updated",
      direction: "desc",
    });

    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      htmlUrl: pr.html_url,
      title: pr.title,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));
  }

  /**
   * Clone repository into workspace container
   */
  async cloneRepository(
    workspaceId: string,
    repoUrl: string,
    targetDir: string = "/home/dev/projects",
    options: {
      branch?: string;
      depth?: number;
      accessToken?: string;
    } = {}
  ): Promise<{ output: string; exitCode: number }> {
    const { branch, depth, accessToken } = options;

    // Build clone URL with token if provided
    let cloneUrl = repoUrl;
    if (accessToken && repoUrl.startsWith("https://")) {
      cloneUrl = repoUrl.replace("https://", `https://x-access-token:${accessToken}@`);
    }

    // Build git clone command
    const args = ["git", "clone"];
    if (branch) args.push("-b", branch);
    if (depth) args.push("--depth", depth.toString());
    args.push(cloneUrl, targetDir);

    return containerManager.exec(workspaceId, args);
  }

  /**
   * Set up Git config in workspace
   */
  async setupGitConfig(
    workspaceId: string,
    name: string,
    email: string
  ): Promise<void> {
    await containerManager.exec(workspaceId, ["git", "config", "--global", "user.name", name]);
    await containerManager.exec(workspaceId, ["git", "config", "--global", "user.email", email]);
  }

  /**
   * Push changes from workspace to remote
   */
  async pushChanges(
    workspaceId: string,
    repoPath: string,
    branch: string,
    accessToken: string,
    remote: string = "origin"
  ): Promise<{ output: string; exitCode: number }> {
    // Set up credentials helper temporarily
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cd ${repoPath} && git config credential.helper '!f() { echo "password=${accessToken}"; }; f'`,
    ]);

    // Push
    const result = await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cd ${repoPath} && git push ${remote} ${branch}`,
    ]);

    // Clear credentials helper
    await containerManager.exec(workspaceId, [
      "bash",
      "-c",
      `cd ${repoPath} && git config --unset credential.helper`,
    ]);

    return result;
  }

  /**
   * Create PR from workspace changes
   */
  async createPRFromWorkspace(
    workspaceId: string,
    repoPath: string,
    accessToken: string,
    input: {
      owner: string;
      repo: string;
      title: string;
      body: string;
      branch: string;
      base?: string;
    }
  ): Promise<PullRequestOutput> {
    const octokit = this.getUserOctokit(accessToken);

    // Get default branch if base not specified
    const baseRepo = await this.getRepository(octokit, input.owner, input.repo);
    const base = input.base || baseRepo.defaultBranch;

    // Create branch if it doesn't exist on remote
    try {
      await octokit.git.getRef({
        owner: input.owner,
        repo: input.repo,
        ref: `heads/${input.branch}`,
      });
    } catch {
      // Branch doesn't exist, will be created on push
    }

    // Push changes
    await this.pushChanges(workspaceId, repoPath, input.branch, accessToken);

    // Create PR
    return this.createPullRequest(octokit, {
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      body: input.body,
      head: input.branch,
      base,
    });
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    octokit: Octokit,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error("Path is not a file");
    }

    return Buffer.from(data.content, "base64").toString("utf8");
  }

  /**
   * List branches
   */
  async listBranches(
    octokit: Octokit,
    owner: string,
    repo: string
  ): Promise<Array<{ name: string; protected: boolean }>> {
    const { data } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return data.map((branch) => ({
      name: branch.name,
      protected: branch.protected,
    }));
  }

  /**
   * Get diff between branches
   */
  async compareBranches(
    octokit: Octokit,
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<{
    aheadBy: number;
    behindBy: number;
    totalCommits: number;
    files: Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
    }>;
  }> {
    const { data } = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
    });

    return {
      aheadBy: data.ahead_by,
      behindBy: data.behind_by,
      totalCommits: data.total_commits,
      files:
        data.files?.map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
        })) || [],
    };
  }
}

// Export singleton
export const githubManager = new GitHubManager();
