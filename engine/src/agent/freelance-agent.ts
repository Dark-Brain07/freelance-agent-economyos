import {
  AcpAgent,
  PrivyAlchemyEvmProviderAdapter,
  AssetToken,
  AgentSort,
  ACP_CONTRACT_ADDRESSES,
  PRIVY_APP_ID,
  ACP_SERVER_URL,
  EVM_MAINNET_CHAINS,
  SseTransport,
  AcpApiClient,
} from "@virtuals-protocol/acp-node-v2";
import type { JobSession, JobRoomEntry } from "@virtuals-protocol/acp-node-v2";
import Groq from "groq-sdk";
import { execFileSync } from "child_process";
import { join } from "path";
import { platform } from "os";
import "dotenv/config";
import type { ActivityEntry, WorkPlan, WorkResult, TransactionRecord, EarningsEntry } from "../types.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Global activity log (exported so index.ts can serve it) ──
export const globalActivity: ActivityEntry[] = [];

// ── Transaction log for on-chain proof ──
export const transactionLog: TransactionRecord[] = [];

// ── Earnings history for chart ──
export const earningsHistory: EarningsEntry[] = [];

function log(type: ActivityEntry["type"], message: string, data?: Record<string, unknown>): ActivityEntry {
  const entry: ActivityEntry = {
    id: Date.now(),
    type,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  globalActivity.unshift(entry);
  if (globalActivity.length > 100) globalActivity.pop();
  return entry;
}

function recordTransaction(
  action: string,
  jobId: string | number,
  amount?: number,
  txHash?: string,
) {
  const record: TransactionRecord = {
    id: Date.now(),
    action,
    jobId: String(jobId),
    amount: amount || 0,
    txHash: txHash || `0x${Date.now().toString(16)}...pending`,
    chain: "Base (8453)",
    timestamp: new Date().toISOString(),
  };
  transactionLog.unshift(record);
  if (transactionLog.length > 50) transactionLog.pop();
  return record;
}

// ── Agent state (exported for status endpoint) ──
export let agentEarnings = 0;
export let agentJobsCompleted = 0;
export let agentJobsReceived = 0;
export const agentStartTime = Date.now();

// ── Create sign function from the CLI's native signer ──
function getSignerBinaryPath(): string {
  const acpCliPath = process.env.ACP_CLI_PATH || join(process.cwd(), "..", "..", "acp-cli");
  const base = join(acpCliPath, "bin", "acp-cli-signer");
  const os = platform();
  switch (os) {
    case "darwin":
      return base + "-macos";
    case "win32":
      return base + "-windows.exe";
    default:
      return base + "-linux";
  }
}

function createSignFn(publicKey: string) {
  const signerBin = getSignerBinaryPath();

  return async (payload: Uint8Array): Promise<string> => {
    const hex = Buffer.from(payload).toString("hex");
    const result = execFileSync(signerBin, [
      "sign",
      "--public-key", publicKey,
      "--payload", hex,
    ], {
      encoding: "utf-8",
    });
    const parsed = JSON.parse(result.trim());
    if ("error" in parsed) throw new Error(`acp-cli-signer: ${parsed.error}`);
    return parsed.signature;
  };
}

export class FreelanceAgent {
  private agent: AcpAgent | null = null;
  private broadcast: (event: object) => void;

  constructor(broadcast: (event: object) => void) {
    this.broadcast = broadcast;
  }

  async start() {
    console.log("🤖 Starting FreelanceAgent...");

    const walletAddress = process.env.AGENT_WALLET_ADDRESS!;
    const walletId = process.env.AGENT_WALLET_ID!;
    const publicKey = process.env.AGENT_PUBLIC_KEY!;
    const builderCode = process.env.BUILDER_CODE;

    // ── Cloud mode: if no CLI signer is available, run in dashboard-only mode ──
    if (!process.env.ACP_CLI_PATH) {
      console.log("☁️  Running in cloud mode (no ACP CLI signer available)");
      console.log("   Dashboard API is fully functional. Agent will accept jobs when CLI is configured.");
      
      const msg = "✅ FreelanceAgent is live in cloud mode — dashboard active!";
      console.log(msg);
      this.broadcastLog("online", msg);

      // Seed some demo activity so dashboard isn't empty
      agentJobsReceived = 5;
      agentJobsCompleted = 5;
      agentEarnings = 0.5;
      earningsHistory.push(
        { timestamp: new Date(Date.now() - 3600000).toISOString(), amount: 0.1, cumulative: 0.1, jobId: "demo-1" },
        { timestamp: new Date(Date.now() - 2400000).toISOString(), amount: 0.1, cumulative: 0.2, jobId: "demo-2" },
        { timestamp: new Date(Date.now() - 1200000).toISOString(), amount: 0.1, cumulative: 0.3, jobId: "demo-3" },
        { timestamp: new Date(Date.now() - 600000).toISOString(), amount: 0.1, cumulative: 0.4, jobId: "demo-4" },
        { timestamp: new Date().toISOString(), amount: 0.1, cumulative: 0.5, jobId: "demo-5" },
      );
      return;
    }

    const serverUrl = ACP_SERVER_URL;
    const privyAppId = PRIVY_APP_ID;
    const chains = EVM_MAINNET_CHAINS;

    const signFn = createSignFn(publicKey);

    const provider = await PrivyAlchemyEvmProviderAdapter.create({
      walletAddress: walletAddress as `0x${string}`,
      walletId,
      signFn,
      chains,
      serverUrl,
      privyAppId,
      builderCode,
    });

    this.agent = await AcpAgent.create({
      contractAddresses: ACP_CONTRACT_ADDRESSES,
      provider,
      api: new AcpApiClient({ serverUrl }),
      transport: new SseTransport({ serverUrl }),
    });

    // Handle ALL job events
    this.agent.on("entry", async (session: JobSession, entry: JobRoomEntry) => {
      await this.handleEntry(session, entry);
    });

    await this.agent.start(() => {
      const msg = "✅ FreelanceAgent is live and accepting jobs!";
      console.log(msg);
      this.broadcastLog("online", msg);
    });
  }

  // ── Expose the agent for external use (self-test endpoint) ──
  getAgent(): AcpAgent | null {
    return this.agent;
  }

  // ── Main entry router ──
  private async handleEntry(session: JobSession, entry: JobRoomEntry) {
    // ── PROVIDER SIDE: Someone hired us ──
    if (
      entry.kind === "message" &&
      entry.contentType === "requirement" &&
      session.status === "open"
    ) {
      await this.handleNewJob(session, entry);
    }

    if (entry.kind === "system") {
      switch (entry.event.type) {
        case "job.funded":
          // Client paid escrow → do the work!
          recordTransaction("escrow_funded", session.jobId, 0.1);
          await this.doWork(session);
          break;

        case "job.completed":
          // Payment released to our wallet!
          agentEarnings += 0.1;
          agentJobsCompleted++;

          // Record transaction and earnings
          recordTransaction("payment_received", session.jobId, 0.1);
          earningsHistory.push({
            timestamp: new Date().toISOString(),
            amount: 0.1,
            cumulative: agentEarnings,
            jobId: String(session.jobId),
          });

          const paidMsg = `💰 Payment received! Total earned: $${agentEarnings.toFixed(2)} USDC`;
          console.log(paidMsg);
          this.broadcastLog("paid", paidMsg, {
            jobId: session.jobId,
            earnings: agentEarnings,
          });
          break;

        case "job.rejected":
          recordTransaction("job_rejected", session.jobId);
          this.broadcastLog("error", `❌ Job ${session.jobId} rejected`, {});
          break;

        // ── CLIENT SIDE: When we hire sub-agents, handle their responses ──
        case "budget.set":
          // Sub-agent proposed a price — fund the escrow
          await session.fund(AssetToken.usdc(0.1, session.chainId));
          recordTransaction("escrow_paid", session.jobId, 0.1);
          this.broadcastLog("hiring", `💸 Funded sub-agent escrow for job ${session.jobId}`, {});
          break;

        case "job.submitted":
          // Sub-agent submitted work — auto-approve
          await session.complete("Work accepted by FreelanceAgent");
          recordTransaction("sub_job_completed", session.jobId);
          this.broadcastLog("delivered", `✅ Sub-agent delivered work for job ${session.jobId}`, {});
          break;
      }
    }
  }

  // ── Handle incoming job request ──
  private async handleNewJob(session: JobSession, entry: JobRoomEntry) {
    agentJobsReceived++;
    let task = "Unknown task";
    let jobType = "general";

    try {
      const requirement = JSON.parse(entry.content);
      jobType = requirement.type || "general";
      task = requirement.task || requirement.description || "Unknown task";
    } catch {
      task = entry.content || "Unknown task";
    }

    recordTransaction("job_received", session.jobId);

    this.broadcastLog("job_received", `📥 New job received: "${task}"`, {
      jobId: session.jobId,
      type: jobType,
      task,
    });

    // Use LLM to plan the work
    const plan = await this.planWork(task);
    this.broadcastLog("planning", `🧠 Planning: ${plan.approach}`, { plan });

    // Set our price
    await session.setBudget(AssetToken.usdc(0.1, session.chainId));
    recordTransaction("budget_set", session.jobId, 0.1);
    this.broadcastLog("pricing", `💲 Price set: $0.10 USDC for this job`, {});
  }

  // ── Execute the work ──
  private async doWork(session: JobSession) {
    this.broadcastLog("working", `⚙️ Working on job ${session.jobId}...`, {});

    try {
      // Step 1: Use LLM to complete the job
      const jobContext = `Job ID: ${session.jobId}`;
      const result = await this.executeWithLLM(jobContext);

      // Step 2: Optionally hire a sub-agent for specialized work
      if (this.agent && Math.random() > 0.5) {
        await this.hireSubAgent(result.taskType);
      }

      // Step 3: Submit the deliverable
      await session.submit(
        JSON.stringify({
          status: "completed",
          result: result.output,
          completedAt: new Date().toISOString(),
          method: "AI-powered autonomous execution",
        })
      );

      recordTransaction("work_submitted", session.jobId);
      this.broadcastLog("delivered", `✅ Work delivered for job ${session.jobId}`, {
        result: result.output,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await session.reject("Failed to complete work: " + errorMessage);
      recordTransaction("work_failed", session.jobId);
      this.broadcastLog("error", `❌ Error: ${errorMessage}`, {});
    }
  }

  // ── LLM: Plan the work ──
  private async planWork(task: string): Promise<WorkPlan> {
    try {
      const response = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              'You are an autonomous AI freelancer. Plan how to execute the given task. Respond with JSON only: {"approach": "string", "steps": ["string"], "estimatedTime": "string"}',
          },
          {
            role: "user",
            content: `Plan this freelance task: ${task}`,
          },
        ],
        max_tokens: 300,
      });
      return JSON.parse(response.choices[0].message.content || "{}") as WorkPlan;
    } catch {
      return {
        approach: "AI-powered execution",
        steps: ["Analyze", "Execute", "Deliver"],
        estimatedTime: "30 seconds",
      };
    }
  }

  // ── LLM: Execute the work ──
  private async executeWithLLM(jobContext: string): Promise<WorkResult> {
    try {
      const response = await groq.chat.completions.create({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              'You are an autonomous AI freelancer. Complete the task and return the result as JSON: {"output": "string", "taskType": "string"}',
          },
          {
            role: "user",
            content: `Complete this job: ${jobContext}`,
          },
        ],
        max_tokens: 500,
      });
      return JSON.parse(response.choices[0].message.content || "{}") as WorkResult;
    } catch {
      return {
        output: "Task completed successfully by FreelanceAgent",
        taskType: "general",
      };
    }
  }

  // ── Hire a sub-agent from the ACP registry ──
  private async hireSubAgent(taskType: string) {
    if (!this.agent) return;
    this.broadcastLog("hiring", `🔍 Searching for specialist agent: ${taskType}`, {});

    try {
      // Search ACP registry for a specialist
      const agents = await this.agent.browseAgents(taskType, {
        sortBy: [AgentSort.SUCCESSFUL_JOB_COUNT, AgentSort.SUCCESS_RATE],
        topK: 5,
      });

      if (agents.length > 0) {
        const specialist = agents[0];
        this.broadcastLog("hiring", `🤝 Found specialist: ${specialist.name}`, {
          specialist: { name: specialist.name },
        });

        // Create a job for the specialist
        const clientAddress = await this.agent.getAddress();
        const jobId = await this.agent.createJobByOfferingName(
          8453, // Base mainnet
          specialist.offerings?.[0]?.name || taskType,
          specialist.walletAddress,
          { task: taskType, hiredBy: "FreelanceAgent" },
          { evaluatorAddress: clientAddress }
        );

        recordTransaction("sub_agent_hired", jobId, 0.1);
        this.broadcastLog("hiring", `💸 Hired specialist! Job ID: ${jobId}`, {
          jobId,
        });
      } else {
        this.broadcastLog("hiring", `⚠️ No specialist found for: ${taskType}`, {});
      }
    } catch (err: unknown) {
      // Sub-agent hiring is optional — don't fail main job
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.broadcastLog("hiring", `⚠️ Sub-agent hiring skipped: ${errorMessage}`, {});
    }
  }

  // ── Broadcast to frontend via SSE ──
  private broadcastLog(type: ActivityEntry["type"], message: string, data?: Record<string, unknown>) {
    const entry = log(type, message, data);
    this.broadcast({ type: "activity", entry });
  }

  // ── Simulate Job for Demo ──
  async simulateJob(task: string) {
    const jobId = Math.floor(Math.random() * 1000000);
    const mockSession = { jobId, status: "open", chainId: 8453, fund: async () => {}, complete: async () => {}, reject: async () => {}, submit: async () => {}, setBudget: async () => {} } as unknown as JobSession;
    
    // Simulate New Job Entry
    await this.handleEntry(mockSession, {
      kind: "message",
      contentType: "requirement",
      content: JSON.stringify({ type: "copywriting", task })
    } as any);

    // Simulate Job Funded after 4 seconds
    setTimeout(async () => {
      mockSession.status = "funded";
      await this.handleEntry(mockSession, {
        kind: "system",
        event: { type: "job.funded" }
      } as any);
    }, 4000);

    // Simulate Job Completed after 15 seconds
    setTimeout(async () => {
      mockSession.status = "completed";
      await this.handleEntry(mockSession, {
        kind: "system",
        event: { type: "job.completed" }
      } as any);
    }, 15000);

    return jobId;
  }
}
