import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { stream } from "hono/streaming";
import {
  FreelanceAgent,
  globalActivity,
  agentEarnings,
  agentJobsCompleted,
  agentJobsReceived,
  agentStartTime,
  transactionLog,
  earningsHistory,
} from "./agent/freelance-agent.js";
import { EmailMonitor } from "./agent/email-monitor.js";
import type { AgentStatus } from "./types.js";
import { execFileSync } from "child_process";
import "dotenv/config";

const app = new Hono();
const clients = new Set<(data: string) => void>();

// ── Broadcast to all connected frontend clients ──
export function broadcast(event: object) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((send) => send(data));
}

app.use("*", cors({ origin: process.env.FRONTEND_URL || "*" }));

// ── SSE endpoint — frontend connects here for live updates ──
app.get("/events", (c) => {
  return stream(c, async (stream) => {
    const send = (data: string) => stream.write(data);
    clients.add(send);
    stream.onAbort(() => clients.delete(send));

    // Send initial connection event
    const connectEvent = `data: ${JSON.stringify({
      type: "connected",
      message: "SSE connection established",
    })}\n\n`;
    stream.write(connectEvent);

    // Keep alive with periodic pings
    while (true) {
      await new Promise((r) => setTimeout(r, 30000));
      stream.write(": ping\n\n");
    }
  });
});

// ── Get agent status ──
app.get("/api/status", async (c) => {
  const status: AgentStatus = {
    status: "running",
    agent: process.env.AGENT_WALLET_ADDRESS,
    uptime: Math.floor((Date.now() - agentStartTime) / 1000),
    earnings: agentEarnings,
    jobsCompleted: agentJobsCompleted,
    jobsReceived: agentJobsReceived,
  };
  return c.json(status);
});

// ── Get recent activity log ──
app.get("/api/activity", async (c) => {
  return c.json({ activities: globalActivity });
});

// ── Get agent identity info ──
app.get("/api/identity", async (c) => {
  return c.json({
    wallet: process.env.AGENT_WALLET_ADDRESS || "Not configured",
    email: process.env.AGENT_EMAIL || "Not configured",
    chain: "Base (8453)",
    chainId: 8453,
    builderCode: process.env.BUILDER_CODE ? "✓ Configured" : "✗ Missing",
    entityId: process.env.AGENT_ENTITY_ID || "1",
  });
});

// ── Get transaction log ──
app.get("/api/transactions", async (c) => {
  return c.json({ transactions: transactionLog });
});

// ── Get earnings history ──
app.get("/api/earnings", async (c) => {
  return c.json({ history: earningsHistory });
});

// ── Get email inbox ──
app.get("/api/emails", async (c) => {
  return c.json({ emails: emailMonitor.emails });
});

// ── Get wallet balance via CLI ──
app.get("/api/wallet/balance", async (c) => {
  try {
    const result = execFileSync("acp", ["wallet", "balance", "--chain-id", "8453", "--json"], {
      encoding: "utf-8",
      timeout: 15_000,
    });
    const parsed = JSON.parse(result.trim());
    return c.json({ success: true, balance: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: msg.slice(0, 200) });
  }
});

// ── Self-test endpoint: simulate sending a job to yourself for demo ──
app.post("/api/test-job", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const task = (body as Record<string, string>).task || "Write a product description for an AI-powered coding assistant";

    // Broadcast a simulated activity for the demo
    const testEntry = {
      id: Date.now(),
      type: "self_test" as const,
      message: `🧪 Demo job sequence initiated: "${task}"`,
      data: { task },
      timestamp: new Date().toISOString(),
    };
    globalActivity.unshift(testEntry);
    if (globalActivity.length > 100) globalActivity.pop();
    broadcast({ type: "activity", entry: testEntry });

    // Trigger simulation in the agent
    const jobId = await agent.simulateJob(task);

    // Send a real email to demonstrate the Email Primitive
    import("child_process").then(({ exec }) => {
      const emailCmd = `npx tsx "F:\\Agent Day One\\acp-cli\\bin\\acp.ts" email compose --to "${process.env.AGENT_EMAIL}" --subject "New Job Alert: ${jobId}" --body "Please execute the following task: ${task}"`;
      exec(emailCmd, { shell: "cmd.exe" }, () => {});
    });

    return c.json({ success: true, jobId, message: "Demo job sequence started!" });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// ── Health check ──
app.get("/api/health", (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Start the agent ──
const agent = new FreelanceAgent(broadcast);
const emailMonitor = new EmailMonitor(broadcast);

// Graceful start — don't crash if .env is incomplete
(async () => {
  try {
    await agent.start();
    // Start email monitoring after agent is live
    emailMonitor.start(60_000);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("⚠️  Agent failed to start:", errorMessage);
    console.error("💡 Make sure your .env file is properly configured.");
    console.error("   The API server will still run — configure .env and restart.");

    // Broadcast error to any connected frontends
    const errorEntry = {
      id: Date.now(),
      type: "error" as const,
      message: `⚠️ Agent failed to start: ${errorMessage}. Check .env configuration.`,
      data: {},
      timestamp: new Date().toISOString(),
    };
    globalActivity.unshift(errorEntry);
    broadcast({ type: "activity", entry: errorEntry });
  }
})();

serve({ fetch: app.fetch, port: Number(process.env.PORT || 8000) });
console.log(`🚀 Engine running on port ${process.env.PORT || 8000}`);
console.log(`📡 SSE endpoint: http://localhost:${process.env.PORT || 8000}/events`);
console.log(`🔧 API: http://localhost:${process.env.PORT || 8000}/api/status`);
console.log(`🧪 Self-test: POST http://localhost:${process.env.PORT || 8000}/api/test-job`);
