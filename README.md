# Termflux

Cloud-based terminal and development environment platform. Runs isolated workspace environments in Docker containers with browser-accessible terminal sessions.

## Features

- Isolated workspace environments running in Docker containers
- Multiple terminal sessions with persistent state (tmux-backed)
- Workflow automation engine for CI/CD-like pipelines
- Secret management with encrypted storage
- GitHub OAuth integration
- Team collaboration with organization support

## Architecture

```
Frontend (Next.js 16 / React 19)
         |
         v
    API Layer (Elysia)
         |
    +----+----+----+----+
    |    |    |    |    |
    v    v    v    v    v
Postgres Redis Docker BullMQ WebSocket
```

- **Frontend**: Next.js with React, Tailwind CSS, xterm.js for terminal rendering
- **API**: Elysia framework running through Next.js catch-all route
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis for session caching and job queue backend
- **Containers**: Docker for workspace isolation
- **Jobs**: BullMQ for async workflow execution
- **Terminal**: WebSocket server streaming terminal I/O to xterm.js

## Requirements

- Bun 1.3.3+ (or Node.js 18+)
- PostgreSQL
- Redis
- Docker daemon

## Setup

1. Install dependencies:

```bash
bun install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/termflux"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
```

3. Run database migrations:

```bash
bun run db:generate
bun run db:migrate
```

## Running

Development:

```bash
bun run dev
```

Production:

```bash
bun run build
bun start
```

The application runs on `http://localhost:3000`. WebSocket terminal server runs on port 3001.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Development server with hot reload |
| `bun run build` | Production build |
| `bun start` | Production server |
| `bun run lint` | Run linting |
| `bun run db:generate` | Generate database migrations |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:push` | Push schema directly to database |
| `bun run db:studio` | Open Drizzle Studio for database inspection |

## Project Structure

```
src/
  app/                  # Next.js App Router pages
    api/[[...slugs]]/   # Catch-all API route
    dashboard/          # Protected dashboard routes
  components/
    ui/                 # Reusable UI components
    terminal/           # Terminal components (xterm.js)
  lib/
    api/                # Elysia API server and routes
    db/                 # Database schema and connection
    docker/             # Docker container management
    redis/              # Redis client
    terminal/           # WebSocket terminal server
    workflows/          # Workflow execution engine
    workspace/          # Workspace provisioning
```

## Database Schema

Core tables:

- `users` - User accounts
- `organizations` - Team units
- `workspaces` - Isolated dev environments (Docker containers)
- `sessions` - Terminal sessions within workspaces
- `workflows` - Workflow definitions
- `workflow_runs` - Workflow execution history
- `secrets` - Encrypted secrets per workspace

## How It Works

1. User creates a workspace, which provisions a Docker container with resource limits
2. Terminal sessions are created as tmux sessions inside the container
3. WebSocket server pipes terminal I/O between browser (xterm.js) and container
4. Workflows execute shell commands in containers via BullMQ job queue
5. Secrets are encrypted and injected as environment variables during workflow runs

## License

MIT
