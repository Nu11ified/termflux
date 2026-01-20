Here’s a concrete, buildable plan that gets you to “browser-native Ghostty-like terminals + managed isolated containers + app/workflow orchestration (multi-terminal, multi-agent, PR creation)” on a headless Linux VPS—without RDP/VNC.

---

## What you’re actually building

A **multi-tenant “workspace runtime”** where each user gets an **isolated container instance** (or a small pod of containers) that:

* Runs on a headless VPS (or a cluster later)
* Exposes a **browser-native terminal UI** (Ghostty-ish UX) via WebSockets + PTY
* Can spawn **multiple terminal sessions** that appear as “pop-in windows” (Hyprland-like) inside the web app
* Auto-provisions dev tools (git, CLI agents like Claude Code, etc.)
* Supports **Apps**: predefined terminal-based tools + agent packs + workflows
* Supports **Workflows**: orchestrated multi-terminal/multi-agent runs that can create PRs on separate branches

---

## High-level architecture

### 1) Control Plane (Web + API)

**Responsibilities**

* Auth, orgs, RBAC
* Workspace lifecycle (create/start/stop/suspend/delete)
* App catalog + workflow definitions
* Session routing (which terminal session connects to which workspace)
* Audit logs, usage, quotas

**Tech suggestions**

* Next.js dashboard + API (use Elysia intergrated with a slug catch all in NextJS api routes using Elysia Documentation)
* Postgres for state
* Redis for ephemeral session routing + locks + rate limiting
* Queue (BullMQ) for workflow execution

---

### 2) Workspace Runtime (on the VPS)

**Responsibilities**

* Create containers with proper isolation
* Create/attach PTYs for shell sessions
* Stream terminal I/O to browser (WebSocket)
* Persist workspace data (home dir, repos, config)
* Enforce resource limits (CPU/mem/disk)

**Core pieces**

* **Container manager**: Docker/Containerd (start with Docker; migrate to containerd later)
* **Terminal gateway**: a small service that does:

  * create PTY
  * exec into container
  * bridge PTY ⇄ WebSocket

**Important point about “Ghostty”**
Ghostty itself is a native GUI terminal emulator, not something you run headless and “send to browser” cleanly.
What you want is a **Ghostty-like experience** implemented as:

* `xterm.js` (frontend terminal renderer)
* PTY bridge server (backend)
* fancy windowing UI in the browser (drag/pop-in, tabs, splits)

That gives you true “native-like terminal” behavior in the browser.

---

### 3) Frontend Terminal UX (Ghostty/Hyprland vibe)

**Responsibilities**

* Spawn multiple terminal windows
* Tabs/splits
* Pop-in / scratchpad / overlay windows like Hyprland
* Keyboard-driven navigation (very important for your use-case)
* Session persistence (reopen browser later, terminals still running)

**Implementation approach**

* Use `xterm.js` per terminal window
* Maintain layout state in the browser + persist it in DB
* Each window connects to a specific `sessionId` over WebSocket

---

## Isolation & persistence model

### Workspace structure (MVP)

Each workspace = one container with:

* A user account inside container (non-root)
* A persistent volume mounted at `/home/dev`
* Preinstalled tools (git, language runtimes, claude code, etc.)
* Optional: docker-in-docker is usually a trap; prefer “toolbox container” patterns later

### Resource limits

* CPU/mem: cgroups
* disk quota: storage driver limits or per-workspace volume quotas
* network: default deny inbound; only allow outbound (or limited egress)

### Security hardening (do this early)

* Rootless containers if feasible
* Seccomp/AppArmor profiles
* Drop capabilities
* Read-only base FS; writable home volume only
* Optional later: gVisor/Kata for stronger isolation

---

## “Always-on” + “run in background” requirement

You want terminals and processes to keep running after the browser closes.

**Inside the workspace container**, run one of:

* `tmux` (simple and reliable) as the session manager
* or a small “session supervisor” process that tracks shells

**Best MVP**: every terminal window is a `tmux` session/pane behind the scenes.

* When user reconnects, you reattach.
* You can also implement “workspaces suspend” by stopping the container but keeping volume.

---

## Provisioning: “git, claude code, settings automatically setup”

### Use a base image + first-boot provisioner

On first start:

* Create `/home/dev`
* Inject dotfiles (`.gitconfig`, `.zshrc`, `.ssh/config`, etc.)
* Configure credentials *without* storing raw secrets (use short-lived tokens)
* Install/enable agent CLIs you want available

**Secrets strategy**

* Store secrets in control plane (encrypted)
* Inject them as **short-lived env vars** or **mounted temp files**
* Prefer GitHub App installation tokens over personal access tokens

---

## Apps system (Claude Code plugins + future terminal AI tools)

Define an **App** as a manifest that can:

* install dependencies (optional)
* add commands to the workspace
* expose UI affordances in the panel (buttons, forms)
* spawn terminal sessions with specific commands
* attach agents / policies

### App manifest example (conceptual)

* metadata: name, version
* required tools: node/python/go
* terminals to spawn: N
* commands to run: per terminal
* env vars + secrets needed
* permissions: “can access repo”, “can open PR”, “can call external APIs”
* workflow hooks: “on workspace start”, “on command”, etc.

Store these manifests in DB or Git (so they’re versioned).

---

## Workflows: multi-terminal orchestration + multiple PRs

You described:

> spawn 7 terminals: 1 writes spec; 3 implement; 3 review; each creates PR on its own branch

Don’t implement this as “terminals controlling each other” directly.
Implement it as **a workflow engine** that *also happens* to create terminals for visibility/debuggability.

### Recommended approach

* Use a workflow runner (Temporal / NATS-based workers / BullMQ)
* Each step runs as a job:

  * may execute a command in the container
  * may call an LLM API
  * may open PRs via GitHub API
* Terminal sessions are just “live logs + interactive override,” not the source of truth.

### Why this matters

* Workflows need retries, timeouts, auditing, deterministic state transitions
* Terminals are great UX, but terrible as orchestration primitives

---

## GitHub PR creation at scale (clean model)

Use a **GitHub App**:

* Installed per org/repo
* Workflow runner requests an installation token
* Creates branches, pushes commits, opens PRs
* Reviewer agents can create separate PRs or comments/reviews

This avoids users pasting PATs into containers.

---

## Networking & routing design (browser ⇄ workspace)

### Terminal connection flow

1. User opens workspace in web UI
2. UI requests “create terminal session”
3. Control plane asks runtime to create `sessionId` (PTY + exec)
4. UI connects to `wss://gateway/.../sessionId`
5. Gateway streams PTY I/O

### Routing

* For a single VPS: direct connection to the VPS gateway is fine
* For multi-node later:

  * control plane returns the correct node endpoint
  * or use a reverse proxy that routes by `workspaceId/sessionId`

---

## Step-by-step build plan (phased)

### Phase 1 — MVP (1 VPS, 1 workspace container, web terminal)

* Control plane:

  * user auth
  * create/start/stop workspace
  * store workspace metadata in Postgres
* Runtime:

  * create container + persistent volume
  * PTY-to-WebSocket gateway
* Frontend:

  * xterm.js terminal
  * create new session button
  * basic tabs/splits

**Goal**: You can open browser and have a working persistent shell.

---

### Phase 2 — Multi-terminal “Hyprland pop-in” UX

* Window manager UI in the browser:

  * draggable terminal windows
  * scratchpad overlay
  * keyboard shortcuts (focus next, move window, resize)
* Persist layout per workspace
* Backend: session list + reconnect

**Goal**: It *feels* like a native terminal environment.

---

### Phase 3 — Provisioning + “Dev environment templates”

* Base images:

  * `workspace-base:latest`
  * language-specific variants
* First-boot provisioning:

  * git config, dotfiles, repo clone option
* Secrets injection via short-lived tokens

**Goal**: “Spawn workspace and it’s ready.”

---

### Phase 4 — Apps (manifests + install + spawn terminals)

* Implement App manifest system
* App marketplace UI in panel
* App runner that:

  * installs deps
  * spawns predefined terminals
  * exposes “Run App” buttons

**Goal**: Click “Claude Code App” and it wires itself in.

---

### Phase 5 — Workflows (true orchestration)

* Add queue/workflow engine
* Steps can:

  * run commands in workspace
  * call AI models
  * open PRs
  * create review comments
* UI shows workflow graph + live terminal/log output
* Policies/limits per org (max concurrent workflows)

**Goal**: 7-terminal multi-agent PR factory becomes real and reliable.

---

### Phase 6 — Multi-node scaling (optional)

* Replace “single VPS” assumption with node pool
* Scheduler chooses node based on capacity
* Add image cache / registry
* Observability: logs, metrics, traces
* Stronger isolation options (gVisor/Kata)

---

## Data model (practical minimal set)

* **users**
* **orgs**
* **workspaces**: id, org_id, status, node_id, image, volume_id, created_at
* **sessions**: id, workspace_id, status, created_at, last_seen
* **apps**: id, name, manifest, version
* **workspace_apps**: workspace_id, app_id, config
* **workflows**: id, workspace_id, definition, status
* **workflow_runs**: id, workflow_id, status, logs, started_at, finished_at
* **secrets**: org_id, key, encrypted_value, scope, rotation

---

## Key technical choices (what I’d pick for a fast build)

**MVP stack (fastest)**

* Runtime host: Docker
* Terminal gateway: Node or Go + `pty` library + WebSocket
* Frontend: Next.js + xterm.js
* Session persistence: tmux in container
* Orchestration: BullMQ initially; upgrade to Temporal if needed

**Hardening/scale later**

* Containerd
* gVisor/Kata
* NATS/Temporal
* Node pools + scheduler

---

## Biggest pitfalls to avoid

1. **Trying to “run Ghostty headless”**
   You want Ghostty-like UX, not Ghostty itself. Build browser-native terminal windows.

2. **Using terminals as the orchestration mechanism**
   Use a workflow engine; terminals are for visibility and manual override.

3. **Storing long-lived GitHub PATs in containers**
   Use a GitHub App + short-lived installation tokens.

4. **Letting containers run privileged / docker.sock access**
   That becomes “escape city.” Keep workspaces unprivileged.
