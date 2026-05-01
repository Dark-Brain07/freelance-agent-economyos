export type ActivityType =
  | "online"
  | "job_received"
  | "planning"
  | "pricing"
  | "hiring"
  | "working"
  | "delivered"
  | "paid"
  | "error"
  | "info"
  | "self_test";

export interface ActivityEntry {
  id: number;
  type: ActivityType;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface WorkPlan {
  approach: string;
  steps: string[];
  estimatedTime: string;
}

export interface WorkResult {
  output: string;
  taskType: string;
}

export interface AgentStatus {
  status: "running" | "stopped" | "error";
  agent: string | undefined;
  uptime: number;
  earnings: number;
  jobsCompleted: number;
  jobsReceived: number;
}

export interface TransactionRecord {
  id: number;
  action: string;
  jobId: string;
  amount: number;
  txHash: string;
  chain: string;
  timestamp: string;
}

export interface EarningsEntry {
  timestamp: string;
  amount: number;
  cumulative: number;
  jobId: string;
}
