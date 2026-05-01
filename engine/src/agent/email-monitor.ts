import { execFileSync } from "child_process";
import "dotenv/config";

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

/**
 * Monitor the agent's email inbox using the ACP CLI.
 * This demonstrates the Email primitive — the agent has its own email
 * address and can read inbound mail autonomously.
 */
export class EmailMonitor {
  private broadcast: (event: object) => void;
  private lastCheckIds = new Set<string>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private _emails: EmailMessage[] = [];

  constructor(broadcast: (event: object) => void) {
    this.broadcast = broadcast;
  }

  get emails(): EmailMessage[] {
    return this._emails;
  }

  /** Start polling the inbox every `intervalMs` (default 60 s) */
  start(intervalMs = 60_000) {
    console.log(`📧 Email monitor started (polling every ${intervalMs / 1000}s)`);
    this.broadcastLog("info", `📧 Email monitoring active: ${process.env.AGENT_EMAIL || "agent@agents.world"}`);

    // Check immediately on start
    this.checkInbox();

    this.pollInterval = setInterval(() => {
      this.checkInbox();
    }, intervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private checkInbox() {
    try {
      const result = execFileSync("acp", ["email", "inbox", "--json", "--limit", "10"], {
        encoding: "utf-8",
        timeout: 15_000,
      });

      const parsed = JSON.parse(result.trim());
      const threads = parsed.threads || parsed.data || [];

      if (!Array.isArray(threads)) return;

      for (const thread of threads) {
        const id = thread.id || thread.threadId;
        if (id && !this.lastCheckIds.has(id)) {
          this.lastCheckIds.add(id);

          const email: EmailMessage = {
            id,
            threadId: thread.threadId || id,
            from: thread.from || thread.sender || "unknown",
            subject: thread.subject || "(no subject)",
            snippet: thread.snippet || thread.preview || "",
            receivedAt: thread.receivedAt || thread.date || new Date().toISOString(),
          };

          this._emails.unshift(email);
          if (this._emails.length > 50) this._emails.pop();

          this.broadcastLog(
            "info",
            `📨 New email from ${email.from}: "${email.subject}"`,
            { emailId: email.id, from: email.from, subject: email.subject }
          );
        }
      }
    } catch (err: unknown) {
      // CLI may not be installed or no email provisioned — that's OK
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("ENOENT") && !msg.includes("not found")) {
        console.log(`📧 Email check: ${msg.slice(0, 120)}`);
      }
    }
  }

  private broadcastLog(type: string, message: string, data?: Record<string, unknown>) {
    const entry = {
      id: Date.now(),
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    this.broadcast({ type: "activity", entry });
  }
}
