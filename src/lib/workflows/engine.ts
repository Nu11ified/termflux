import { Queue, Worker, Job, QueueEvents } from "bullmq";
import { EventEmitter } from "events";
import { containerManager } from "@/lib/docker";
import { sessionManager } from "@/lib/redis";
import { db } from "@/lib/db";
import { workflows, workflowRuns, workspaces, sessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// Redis connection for BullMQ
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Parse Redis URL
function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
  };
}

const redisConnection = parseRedisUrl(REDIS_URL);

// Workflow step definition
export interface WorkflowStep {
  id: string;
  name: string;
  type: "shell" | "parallel" | "sequential" | "conditional" | "wait";
  command?: string;
  commands?: string[];
  steps?: WorkflowStep[];
  condition?: string;
  timeout?: number; // seconds
  retries?: number;
  onFailure?: "continue" | "stop" | "retry";
  env?: Record<string, string>;
  workingDir?: string;
  dependsOn?: string[];
}

// Workflow definition
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  triggers?: WorkflowTrigger[];
  env?: Record<string, string>;
  steps: WorkflowStep[];
}

// Workflow trigger
export interface WorkflowTrigger {
  type: "manual" | "schedule" | "webhook" | "file_change";
  config?: Record<string, string>;
}

// Step execution result
export interface StepResult {
  stepId: string;
  status: "success" | "failed" | "skipped" | "cancelled";
  output: string;
  error?: string;
  exitCode?: number;
  startedAt: string;
  completedAt: string;
  duration: number;
}

// Workflow run state
export interface WorkflowRunState {
  id: string;
  workflowId: string;
  workspaceId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  steps: StepResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
  variables: Record<string, string>;
}

// Job data for BullMQ
interface WorkflowJobData {
  runId: string;
  workflowId: string;
  workspaceId: string;
  userId: string;
  definition: WorkflowDefinition;
  variables: Record<string, string>;
}

/**
 * Workflow Engine using BullMQ
 * Executes multi-step workflows in workspace containers
 */
export class WorkflowEngine extends EventEmitter {
  private queue: Queue<WorkflowJobData>;
  private worker: Worker<WorkflowJobData>;
  private queueEvents: QueueEvents;
  private activeRuns: Map<string, WorkflowRunState> = new Map();

  constructor() {
    super();

    // Initialize queue
    this.queue = new Queue("termflux-workflows", {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600 * 24, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 3600 * 24 * 7, // 7 days
        },
      },
    });

    // Initialize worker
    this.worker = new Worker(
      "termflux-workflows",
      async (job) => this.processJob(job),
      {
        connection: redisConnection,
        concurrency: 10,
        lockDuration: 300000, // 5 minutes
      }
    );

    // Initialize queue events
    this.queueEvents = new QueueEvents("termflux-workflows", {
      connection: redisConnection,
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Start a workflow
   */
  async startWorkflow(
    workflowId: string,
    workspaceId: string,
    userId: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    // Get workflow definition from database
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(eq(workflows.id, workflowId));

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const definition = workflow.definition as unknown as WorkflowDefinition;
    const runId = nanoid(12);

    // Create workflow run record
    await db.insert(workflowRuns).values({
      id: runId,
      workflowId,
      workspaceId,
      status: "pending",
      steps: [],
      logs: "",
    });

    // Initialize run state
    const runState: WorkflowRunState = {
      id: runId,
      workflowId,
      workspaceId,
      status: "pending",
      steps: [],
      startedAt: new Date().toISOString(),
      variables: {
        ...workflow.env as Record<string, string> || {},
        ...variables,
      },
    };
    this.activeRuns.set(runId, runState);

    // Queue the job
    await this.queue.add(
      `workflow:${runId}`,
      {
        runId,
        workflowId,
        workspaceId,
        userId,
        definition,
        variables: runState.variables,
      },
      {
        jobId: runId,
      }
    );

    this.emit("workflow:started", { runId, workflowId, workspaceId });
    return runId;
  }

  /**
   * Process a workflow job
   */
  private async processJob(job: Job<WorkflowJobData>): Promise<void> {
    const { runId, workflowId, workspaceId, definition, variables } = job.data;

    const runState = this.activeRuns.get(runId) || {
      id: runId,
      workflowId,
      workspaceId,
      status: "running" as const,
      steps: [],
      startedAt: new Date().toISOString(),
      variables,
    };

    runState.status = "running";
    this.activeRuns.set(runId, runState);

    await this.updateRunStatus(runId, "running");

    try {
      // Execute steps
      await this.executeSteps(workspaceId, definition.steps, runState, job);

      runState.status = "completed";
      runState.completedAt = new Date().toISOString();

      await this.updateRunStatus(runId, "completed", runState.steps);
      this.emit("workflow:completed", { runId, workflowId, workspaceId });
    } catch (error) {
      runState.status = "failed";
      runState.error = (error as Error).message;
      runState.completedAt = new Date().toISOString();

      await this.updateRunStatus(runId, "failed", runState.steps, runState.error);
      this.emit("workflow:failed", { runId, workflowId, workspaceId, error: runState.error });
      throw error;
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(
    workspaceId: string,
    steps: WorkflowStep[],
    runState: WorkflowRunState,
    job: Job<WorkflowJobData>
  ): Promise<void> {
    for (const step of steps) {
      // Check if job was cancelled by checking its state
      const jobState = await job.getState();
      if (jobState !== "active") {
        throw new Error("Workflow cancelled");
      }

      // Update progress
      await job.updateProgress({
        currentStep: step.id,
        completedSteps: runState.steps.length,
        totalSteps: steps.length,
      });

      const startedAt = new Date().toISOString();
      let result: StepResult;

      try {
        switch (step.type) {
          case "shell":
            result = await this.executeShellStep(workspaceId, step, runState.variables);
            break;

          case "parallel":
            result = await this.executeParallelSteps(workspaceId, step, runState, job);
            break;

          case "sequential":
            result = await this.executeSequentialSteps(workspaceId, step, runState, job);
            break;

          case "conditional":
            result = await this.executeConditionalStep(workspaceId, step, runState, job);
            break;

          case "wait":
            result = await this.executeWaitStep(step);
            break;

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }
      } catch (error) {
        result = {
          stepId: step.id,
          status: "failed",
          output: "",
          error: (error as Error).message,
          startedAt,
          completedAt: new Date().toISOString(),
          duration: Date.now() - new Date(startedAt).getTime(),
        };

        if (step.onFailure === "stop") {
          runState.steps.push(result);
          throw error;
        }
      }

      runState.steps.push(result);
      this.emit("step:completed", { runId: runState.id, step: result });
    }
  }

  /**
   * Execute a shell command step
   */
  private async executeShellStep(
    workspaceId: string,
    step: WorkflowStep,
    variables: Record<string, string>
  ): Promise<StepResult> {
    const startedAt = new Date().toISOString();

    if (!step.command) {
      throw new Error("Shell step requires a command");
    }

    // Substitute variables in command
    let command = step.command;
    for (const [key, value] of Object.entries(variables)) {
      command = command.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
      command = command.replace(new RegExp(`\\$${key}`, "g"), value);
    }

    // Build environment array
    const env = Object.entries({ ...variables, ...step.env }).map(([k, v]) => `${k}=${v}`);

    // Execute command with timeout
    const timeout = (step.timeout || 300) * 1000; // default 5 minutes

    const execPromise = containerManager.exec(workspaceId, ["bash", "-c", command], {
      env,
      workingDir: step.workingDir || "/home/dev",
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Step timed out after ${step.timeout}s`)), timeout);
    });

    const { output, exitCode } = await Promise.race([execPromise, timeoutPromise]);

    const completedAt = new Date().toISOString();

    if (exitCode !== 0) {
      return {
        stepId: step.id,
        status: "failed",
        output,
        exitCode,
        error: `Command exited with code ${exitCode}`,
        startedAt,
        completedAt,
        duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
      };
    }

    return {
      stepId: step.id,
      status: "success",
      output,
      exitCode,
      startedAt,
      completedAt,
      duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  /**
   * Execute parallel steps
   */
  private async executeParallelSteps(
    workspaceId: string,
    step: WorkflowStep,
    runState: WorkflowRunState,
    job: Job<WorkflowJobData>
  ): Promise<StepResult> {
    const startedAt = new Date().toISOString();

    if (!step.steps || step.steps.length === 0) {
      throw new Error("Parallel step requires nested steps");
    }

    // Execute all sub-steps in parallel
    const results = await Promise.allSettled(
      step.steps.map(async (subStep) => {
        if (subStep.type === "shell") {
          return this.executeShellStep(workspaceId, subStep, runState.variables);
        }
        throw new Error(`Nested ${subStep.type} steps not supported in parallel`);
      })
    );

    const completedAt = new Date().toISOString();

    // Collect results
    const outputs: string[] = [];
    let hasFailure = false;

    for (const result of results) {
      if (result.status === "fulfilled") {
        outputs.push(result.value.output);
        runState.steps.push(result.value);
        if (result.value.status === "failed") {
          hasFailure = true;
        }
      } else {
        hasFailure = true;
        outputs.push(`Error: ${result.reason}`);
      }
    }

    return {
      stepId: step.id,
      status: hasFailure ? "failed" : "success",
      output: outputs.join("\n---\n"),
      startedAt,
      completedAt,
      duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  /**
   * Execute sequential steps
   */
  private async executeSequentialSteps(
    workspaceId: string,
    step: WorkflowStep,
    runState: WorkflowRunState,
    job: Job<WorkflowJobData>
  ): Promise<StepResult> {
    const startedAt = new Date().toISOString();

    if (!step.steps || step.steps.length === 0) {
      throw new Error("Sequential step requires nested steps");
    }

    await this.executeSteps(workspaceId, step.steps, runState, job);

    const completedAt = new Date().toISOString();

    return {
      stepId: step.id,
      status: "success",
      output: `Executed ${step.steps.length} sequential steps`,
      startedAt,
      completedAt,
      duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  /**
   * Execute conditional step
   */
  private async executeConditionalStep(
    workspaceId: string,
    step: WorkflowStep,
    runState: WorkflowRunState,
    job: Job<WorkflowJobData>
  ): Promise<StepResult> {
    const startedAt = new Date().toISOString();

    if (!step.condition || !step.steps) {
      throw new Error("Conditional step requires condition and steps");
    }

    // Evaluate condition by running it as a shell command
    let conditionCommand = step.condition;
    for (const [key, value] of Object.entries(runState.variables)) {
      conditionCommand = conditionCommand.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
      conditionCommand = conditionCommand.replace(new RegExp(`\\$${key}`, "g"), value);
    }

    const { exitCode } = await containerManager.exec(workspaceId, ["bash", "-c", conditionCommand]);

    const conditionMet = exitCode === 0;

    if (conditionMet) {
      await this.executeSteps(workspaceId, step.steps, runState, job);
    }

    const completedAt = new Date().toISOString();

    return {
      stepId: step.id,
      status: "success",
      output: conditionMet ? "Condition met, steps executed" : "Condition not met, steps skipped",
      startedAt,
      completedAt,
      duration: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    };
  }

  /**
   * Execute wait step
   */
  private async executeWaitStep(step: WorkflowStep): Promise<StepResult> {
    const startedAt = new Date().toISOString();
    const duration = (step.timeout || 1) * 1000;

    await new Promise((resolve) => setTimeout(resolve, duration));

    const completedAt = new Date().toISOString();

    return {
      stepId: step.id,
      status: "success",
      output: `Waited ${step.timeout || 1} seconds`,
      startedAt,
      completedAt,
      duration,
    };
  }

  /**
   * Update workflow run status in database
   */
  private async updateRunStatus(
    runId: string,
    status: WorkflowRunState["status"],
    steps?: StepResult[],
    error?: string
  ): Promise<void> {
    const updateData: Partial<typeof workflowRuns.$inferInsert> = {
      status,
      ...(steps && { steps: steps as unknown as typeof workflowRuns.$inferSelect["steps"] }),
      ...(error && { logs: error }),
      ...(status === "running" && { startedAt: new Date() }),
      ...(["completed", "failed", "cancelled"].includes(status) && { completedAt: new Date() }),
    };

    await db.update(workflowRuns).set(updateData).where(eq(workflowRuns.id, runId));
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(runId: string): Promise<void> {
    const job = await this.queue.getJob(runId);
    if (job) {
      await job.discard();
      await job.moveToFailed(new Error("Cancelled by user"), "cancelled");
    }

    await this.updateRunStatus(runId, "cancelled");
    this.activeRuns.delete(runId);
    this.emit("workflow:cancelled", { runId });
  }

  /**
   * Get workflow run status
   */
  async getRunStatus(runId: string): Promise<WorkflowRunState | null> {
    // Check active runs first
    const activeRun = this.activeRuns.get(runId);
    if (activeRun) {
      return activeRun;
    }

    // Check database
    const [run] = await db.select().from(workflowRuns).where(eq(workflowRuns.id, runId));

    if (!run) {
      return null;
    }

    return {
      id: run.id,
      workflowId: run.workflowId,
      workspaceId: run.workspaceId,
      status: run.status as WorkflowRunState["status"],
      steps: run.steps as unknown as StepResult[],
      startedAt: run.startedAt?.toISOString() || "",
      completedAt: run.completedAt?.toISOString(),
      error: run.logs || undefined,
      variables: {},
    };
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      console.log(`Workflow job ${job.id} completed`);
    });

    this.worker.on("failed", (job, error) => {
      console.error(`Workflow job ${job?.id} failed:`, error);
    });

    this.worker.on("error", (error) => {
      console.error("Workflow worker error:", error);
    });

    this.queueEvents.on("waiting", ({ jobId }) => {
      console.log(`Workflow ${jobId} waiting`);
    });

    this.queueEvents.on("active", ({ jobId }) => {
      console.log(`Workflow ${jobId} active`);
    });
  }

  /**
   * Close the workflow engine
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
  }
}

// Export singleton
export const workflowEngine = new WorkflowEngine();
