// Mock PTY for development - simulates a terminal session
// In production, this would be replaced with actual PTY/Docker integration

export class MockPTY {
  private buffer: string = "";
  private onData: (data: string) => void;
  private currentDir: string = "~";
  private hostname: string = "termflux";
  private username: string = "dev";

  constructor(onData: (data: string) => void) {
    this.onData = onData;
  }

  start() {
    // Send initial prompt
    this.sendWelcome();
    this.sendPrompt();
  }

  private sendWelcome() {
    const welcome = `\x1b[38;5;45m
  _____                    __ _
 |_   _|__ _ __ _ __ ___  / _| |_   ___  __
   | |/ _ \\ '__| '_ \` _ \\| |_| | | | \\ \\/ /
   | |  __/ |  | | | | | |  _| | |_| |>  <
   |_|\\___|_|  |_| |_| |_|_| |_|\\__,_/_/\\_\\
\x1b[0m
\x1b[38;5;248mCloud Terminal Workspaces - v0.1.0\x1b[0m
\x1b[38;5;248mType 'help' for available commands\x1b[0m

`;
    this.onData(welcome);
  }

  private sendPrompt() {
    const prompt = `\x1b[38;5;45m${this.username}@${this.hostname}\x1b[0m:\x1b[38;5;33m${this.currentDir}\x1b[0m$ `;
    this.onData(prompt);
  }

  write(data: string) {
    // Handle special characters
    for (const char of data) {
      if (char === "\r" || char === "\n") {
        // Enter pressed - execute command
        this.onData("\r\n");
        this.executeCommand(this.buffer.trim());
        this.buffer = "";
        this.sendPrompt();
      } else if (char === "\x7f" || char === "\b") {
        // Backspace
        if (this.buffer.length > 0) {
          this.buffer = this.buffer.slice(0, -1);
          this.onData("\b \b");
        }
      } else if (char === "\x03") {
        // Ctrl+C
        this.onData("^C\r\n");
        this.buffer = "";
        this.sendPrompt();
      } else if (char === "\x04") {
        // Ctrl+D
        if (this.buffer.length === 0) {
          this.onData("logout\r\n");
        }
      } else if (char === "\x0c") {
        // Ctrl+L - clear screen
        this.onData("\x1b[2J\x1b[H");
        this.sendPrompt();
      } else if (char >= " " || char === "\t") {
        // Regular character
        this.buffer += char;
        this.onData(char);
      }
    }
  }

  private executeCommand(cmd: string) {
    if (!cmd) return;

    const [command, ...args] = cmd.split(/\s+/);

    switch (command) {
      case "help":
        this.onData(this.helpOutput());
        break;

      case "ls":
        this.onData(this.lsOutput(args));
        break;

      case "pwd":
        this.onData(`/home/${this.username}${this.currentDir === "~" ? "" : this.currentDir.replace("~", "")}\r\n`);
        break;

      case "cd":
        this.cdCommand(args[0]);
        break;

      case "echo":
        this.onData(args.join(" ") + "\r\n");
        break;

      case "whoami":
        this.onData(`${this.username}\r\n`);
        break;

      case "hostname":
        this.onData(`${this.hostname}\r\n`);
        break;

      case "date":
        this.onData(new Date().toString() + "\r\n");
        break;

      case "uname":
        this.onData("Linux termflux 5.15.0-generic x86_64 GNU/Linux\r\n");
        break;

      case "clear":
        this.onData("\x1b[2J\x1b[H");
        break;

      case "cat":
        this.catCommand(args[0]);
        break;

      case "neofetch":
        this.onData(this.neofetchOutput());
        break;

      case "exit":
        this.onData("Goodbye!\r\n");
        break;

      default:
        this.onData(`\x1b[31mCommand not found: ${command}\x1b[0m\r\n`);
        this.onData(`\x1b[38;5;248mTry 'help' for available commands\x1b[0m\r\n`);
    }
  }

  private helpOutput(): string {
    return `\x1b[1mAvailable commands:\x1b[0m

  \x1b[38;5;45mls\x1b[0m [path]     List directory contents
  \x1b[38;5;45mpwd\x1b[0m           Print working directory
  \x1b[38;5;45mcd\x1b[0m <dir>      Change directory
  \x1b[38;5;45mecho\x1b[0m <text>   Print text to terminal
  \x1b[38;5;45mcat\x1b[0m <file>    Display file contents
  \x1b[38;5;45mclear\x1b[0m         Clear the terminal
  \x1b[38;5;45mwhoami\x1b[0m        Print current user
  \x1b[38;5;45mhostname\x1b[0m      Print hostname
  \x1b[38;5;45mdate\x1b[0m          Print current date
  \x1b[38;5;45muname\x1b[0m         Print system info
  \x1b[38;5;45mneofetch\x1b[0m      Display system info
  \x1b[38;5;45mhelp\x1b[0m          Show this help message
  \x1b[38;5;45mexit\x1b[0m          Exit the terminal

\x1b[38;5;248mKeyboard shortcuts:\x1b[0m
  Ctrl+C        Cancel current command
  Ctrl+L        Clear screen
  Ctrl+D        Exit (on empty line)

`;
  }

  private lsOutput(args: string[]): string {
    const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al");
    const showLong = args.includes("-l") || args.includes("-la") || args.includes("-al");

    const files = [
      { name: "projects", type: "dir", color: "33" },
      { name: "Documents", type: "dir", color: "33" },
      { name: ".config", type: "dir", color: "33", hidden: true },
      { name: ".bashrc", type: "file", color: "0", hidden: true },
      { name: ".gitconfig", type: "file", color: "0", hidden: true },
      { name: "README.md", type: "file", color: "0" },
      { name: "package.json", type: "file", color: "0" },
    ];

    const visibleFiles = showAll ? files : files.filter(f => !f.hidden);

    if (showLong) {
      let output = "total " + visibleFiles.length + "\r\n";
      for (const file of visibleFiles) {
        const isDir = file.type === "dir";
        const perms = isDir ? "drwxr-xr-x" : "-rw-r--r--";
        const size = isDir ? "4096" : " 512";
        output += `${perms}  1 ${this.username} ${this.username}  ${size} Jan 15 10:00 \x1b[38;5;${file.color}m${file.name}\x1b[0m\r\n`;
      }
      return output;
    } else {
      return visibleFiles.map(f => `\x1b[38;5;${f.color}m${f.name}\x1b[0m`).join("  ") + "\r\n";
    }
  }

  private cdCommand(dir: string | undefined) {
    if (!dir || dir === "~") {
      this.currentDir = "~";
    } else if (dir === "..") {
      if (this.currentDir !== "~") {
        const parts = this.currentDir.split("/");
        parts.pop();
        this.currentDir = parts.length === 0 ? "~" : parts.join("/");
      }
    } else if (dir.startsWith("/")) {
      this.currentDir = dir;
    } else {
      this.currentDir = this.currentDir === "~" ? `~/${dir}` : `${this.currentDir}/${dir}`;
    }
  }

  private catCommand(file: string | undefined) {
    if (!file) {
      this.onData("\x1b[31mcat: missing file operand\x1b[0m\r\n");
      return;
    }

    if (file === "README.md") {
      this.onData(`# Termflux Workspace

Welcome to your cloud terminal workspace!

## Getting Started

This is a simulated terminal environment. In production,
this would connect to an actual container running your
development environment.

## Features

- Browser-native terminal (Ghostty-like UX)
- Multiple terminal windows
- Session persistence with tmux
- App marketplace
- Workflow automation

`);
    } else if (file === "package.json") {
      this.onData(`{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
`);
    } else {
      this.onData(`\x1b[31mcat: ${file}: No such file or directory\x1b[0m\r\n`);
    }
  }

  private neofetchOutput(): string {
    return `\x1b[38;5;45m
        .--.         \x1b[0m${this.username}\x1b[38;5;45m@\x1b[0m${this.hostname}
       |o_o |        \x1b[38;5;45m-----------------\x1b[0m
       |:_/ |        \x1b[38;5;45mOS:\x1b[0m Termflux Container
      //   \\ \\       \x1b[38;5;45mHost:\x1b[0m Cloud VM
     (|     | )      \x1b[38;5;45mKernel:\x1b[0m 5.15.0-generic
    /'\\_   _/\`\\      \x1b[38;5;45mUptime:\x1b[0m ${Math.floor(Math.random() * 24)} hours
    \\___)=(___/      \x1b[38;5;45mShell:\x1b[0m bash 5.1.16
                     \x1b[38;5;45mTerminal:\x1b[0m xterm.js
                     \x1b[38;5;45mCPU:\x1b[0m 2 cores
                     \x1b[38;5;45mMemory:\x1b[0m 2048 MB

\x1b[0m`;
  }

  resize(cols: number, rows: number) {
    // In real PTY, this would resize the terminal
    console.log(`Terminal resized to ${cols}x${rows}`);
  }

  destroy() {
    // Cleanup
  }
}
