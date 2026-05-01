import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Zap,
  Wallet,
  Mail,
  CreditCard,
  Activity,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Play,
  Loader2,
  ExternalLink,
  ChevronRight,
  Radio,
  Shield,
  Hash,
  DollarSign,
  BarChart3,
} from "lucide-react";

const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || "";

// ── Types ──
type ActivityEntry = {
  id: number;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
};

type AgentIdentity = {
  wallet: string;
  email: string;
  chain: string;
  builderCode: string;
};

type TransactionRecord = {
  id: number;
  action: string;
  jobId: string;
  amount: number;
  txHash: string;
  chain: string;
  timestamp: string;
};

type EarningsEntry = {
  timestamp: string;
  amount: number;
  cumulative: number;
  jobId: string;
};

// ── Activity type → icon + colors ──
const typeConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  online: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/10",
  },
  job_received: {
    icon: Zap,
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/10",
  },
  planning: {
    icon: Bot,
    color: "text-violet-400",
    bg: "bg-violet-500/5",
    border: "border-violet-500/10",
  },
  pricing: {
    icon: Wallet,
    color: "text-amber-400",
    bg: "bg-amber-500/5",
    border: "border-amber-500/10",
  },
  hiring: {
    icon: ArrowRight,
    color: "text-cyan-400",
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/10",
  },
  working: {
    icon: Loader2,
    color: "text-orange-400",
    bg: "bg-orange-500/5",
    border: "border-orange-500/10",
  },
  delivered: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/10",
  },
  paid: {
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/5",
    border: "border-green-500/10",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/5",
    border: "border-red-500/10",
  },
  info: {
    icon: Radio,
    color: "text-blue-400",
    bg: "bg-blue-500/5",
    border: "border-blue-500/10",
  },
  self_test: {
    icon: Play,
    color: "text-fuchsia-400",
    bg: "bg-fuchsia-500/5",
    border: "border-fuchsia-500/10",
  },
  connected: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/10",
  },
};

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="glass-card p-5 group cursor-default"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.15em]">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${color
            .replace("text-", "bg-")
            .replace("400", "500/10")} group-hover:scale-110 transition-transform`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${color} tracking-tight`}>
        {value}
      </div>
      <div className="text-[10px] text-white/20 mt-1 uppercase tracking-wider">
        {sub}
      </div>
    </motion.div>
  );
}

// ── Activity Entry ──
function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const config = typeConfig[entry.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex items-start gap-3 p-3.5 rounded-xl ${config.bg} border ${config.border} hover:bg-white/[0.03] transition-colors`}
    >
      <div
        className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${config.color} ${
            entry.type === "working" ? "animate-spin" : ""
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 leading-relaxed font-medium">
          {entry.message}
        </p>
        {entry.data && Object.keys(entry.data).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(entry.data)
              .slice(0, 3)
              .map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] text-white/30 border border-white/[0.04]"
                >
                  {key}:{" "}
                  {typeof val === "object"
                    ? JSON.stringify(val).slice(0, 30)
                    : String(val).slice(0, 40)}
                </span>
              ))}
          </div>
        )}
        <p className="text-[10px] text-white/20 mt-1.5 font-mono">
          {new Date(entry.timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main App ──
export default function App() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [earnings, setEarnings] = useState(0);
  const [jobCount, setJobCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [testing, setTesting] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [earningsHist, setEarningsHist] = useState<EarningsEntry[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // ── Fetch identity + transactions + earnings ──
  useEffect(() => {
    fetch(`${ENGINE_URL}/api/identity`)
      .then((r) => r.json())
      .then((d) => setIdentity(d))
      .catch(() => {});
    fetch(`${ENGINE_URL}/api/transactions`)
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .catch(() => {});
    fetch(`${ENGINE_URL}/api/earnings`)
      .then((r) => r.json())
      .then((d) => setEarningsHist(d.history || []))
      .catch(() => {});
  }, []);

  // ── Uptime ticker ──
  useEffect(() => {
    const interval = setInterval(() => {
      setUptime((u) => u + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── SSE connection ──
  useEffect(() => {
    const es = new EventSource(`${ENGINE_URL}/events`);

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      // EventSource auto-reconnects; only mark offline if CLOSED
      if (es.readyState === EventSource.CLOSED) setConnected(false);
    };

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type === "connected") {
          setConnected(true);
          return;
        }
        if (parsed.type === "activity" && parsed.entry) {
          const entry = parsed.entry as ActivityEntry;
          setActivities((prev) => [entry, ...prev].slice(0, 50));

          if (entry.type === "paid") {
            setEarnings(
              (entry.data?.earnings as number) || ((e: number) => e + 0.1)
            );
            setTxCount((p) => p + 1);
          }
          if (entry.type === "job_received") setJobCount((p) => p + 1);
        }
      } catch {
        // ignore malformed SSE
      }
    };

    fetch(`${ENGINE_URL}/api/activity`)
      .then((r) => r.json())
      .then((d) => {
        if (d.activities) {
          setActivities(d.activities);
          setConnected(true); // We got data — we're connected
        }
      })
      .catch(() => {});

    return () => es.close();
  }, []);

  // ── Self-test trigger ──
  const triggerSelfTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch(`${ENGINE_URL}/api/test-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "Write a product description for an AI-powered coding assistant",
        }),
      });
      await res.json();
    } catch {
      // Error will be shown via SSE
    }
    setTimeout(() => setTesting(false), 2000);
  }, []);

  // ── Format uptime ──
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Truncate address ──
  const truncAddr = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-white font-sans selection:bg-blue-500/30">
      {/* ── Ambient glow ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="ambient-blob w-[500px] h-[500px] bg-blue-600/[0.04] top-[-100px] left-[10%]" />
        <div className="ambient-blob w-[600px] h-[600px] bg-violet-600/[0.03] bottom-[-150px] right-[5%]" />
        <div className="ambient-blob w-[400px] h-[400px] bg-cyan-600/[0.02] top-[40%] left-[50%]" />
      </div>

      {/* ── Header ── */}
      <header className="border-b border-white/[0.04] px-6 py-4 relative z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Bot className="w-5 h-5 text-blue-400" />
              </div>
              {connected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#060a12]" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.1em] text-white/90">
                FREELANCE
                <span className="gradient-text">AGENT</span>
              </h1>
              <p className="text-[10px] text-white/25 tracking-wider">
                Autonomous AI Freelancer · EconomyOS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Uptime */}
            <div className="hidden md:flex items-center gap-2 text-white/30">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-mono tracking-wider">
                {formatUptime(uptime)}
              </span>
            </div>

            {/* Real Hire button */}
            <a
              href="https://app.virtuals.io/acp/agents/019de17d-7983-7157-bde6-b788836e5835"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 hover:border-blue-500/30 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Hire Agent (Live)
            </a>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connected
                      ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
                      : "bg-red-400 shadow-lg shadow-red-400/50"
                  }`}
                />
                {connected && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                )}
              </div>
              <span
                className={`text-[10px] font-bold tracking-[0.15em] ${
                  connected ? "text-emerald-400/70" : "text-red-400/70"
                }`}
              >
                {connected ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Earned"
            value={`$${earnings.toFixed(3)}`}
            icon={TrendingUp}
            color="text-emerald-400"
            sub="USDC on Base"
            delay={0}
          />
          <StatCard
            label="Jobs Received"
            value={jobCount}
            icon={Zap}
            color="text-blue-400"
            sub="via ACP Protocol"
            delay={0.1}
          />
          <StatCard
            label="Transactions"
            value={txCount}
            icon={Activity}
            color="text-violet-400"
            sub="on-chain verified"
            delay={0.2}
          />
          <StatCard
            label="Agent Status"
            value={connected ? "ACTIVE" : "OFFLINE"}
            icon={Shield}
            color={connected ? "text-emerald-400" : "text-red-400"}
            sub="autonomous mode"
            delay={0.3}
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Activity Feed (main column) ── */}
          <div className="lg:col-span-2">
            <div className="glass-card overflow-hidden">
              {/* Feed header */}
              <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white/30" />
                  </div>
                  <span className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase">
                    Live Activity Stream
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white/25 font-mono">
                    streaming
                  </span>
                </div>
              </div>

              {/* Feed body */}
              <div
                ref={feedRef}
                className="h-[520px] overflow-y-auto p-4 space-y-2"
              >
                {activities.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-white/15 gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Bot className="w-10 h-10" />
                    </motion.div>
                    <p className="text-xs">
                      Waiting for agent activity...
                    </p>
                    <p className="text-[10px] text-white/10">
                      Click "Test Job" to trigger a demo transaction
                    </p>
                  </div>
                )}
                <AnimatePresence mode="popLayout">
                  {activities.map((entry) => (
                    <ActivityItem key={entry.id} entry={entry} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">
            {/* Wallet Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.12em]">
                  Agent Wallet
                </span>
              </div>
              <div className="font-mono text-xs text-white/40 break-all mb-3 bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                {identity?.wallet
                  ? identity.wallet
                  : "0x...configure in .env..."}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/25 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                  Base
                </span>
                {identity?.wallet && identity.wallet !== "Not configured" && (
                  <a
                    href={`https://basescan.org/address/${identity.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400/60 hover:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    Explorer <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Email Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.12em]">
                  Agent Email
                </span>
              </div>
              <div className="text-xs text-white/40 font-mono bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                {identity?.email || "Not configured"}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] text-blue-400/60">
                  Monitoring inbox
                </span>
              </div>
            </motion.div>

            {/* Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-5"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <CreditCard className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.12em]">
                  Agent Card
                </span>
              </div>
              <div className="text-xs text-white/35">
                Virtual payment card for
              </div>
              <div className="text-xs text-white/35">
                autonomous real-world spending
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-violet-400" />
                <span className="text-[10px] text-violet-400/60">Active</span>
              </div>
            </motion.div>

            {/* How It Works */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="glass-card p-5"
            >
              <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.12em] mb-4">
                How It Works
              </div>
              {[
                {
                  step: "01",
                  text: "Receives job via ACP",
                  color: "text-blue-400/50",
                },
                {
                  step: "02",
                  text: "Plans with LLM (Groq)",
                  color: "text-violet-400/50",
                },
                {
                  step: "03",
                  text: "Hires sub-agents",
                  color: "text-cyan-400/50",
                },
                {
                  step: "04",
                  text: "Delivers result",
                  color: "text-emerald-400/50",
                },
                {
                  step: "05",
                  text: "Earns USDC autonomously",
                  color: "text-green-400/50",
                },
              ].map(({ step, text, color }) => (
                <div
                  key={step}
                  className="flex items-center gap-3 mb-2.5 group"
                >
                  <span
                    className={`text-[10px] font-mono ${color} w-5 font-bold`}
                  >
                    {step}
                  </span>
                  <ChevronRight className={`w-2.5 h-2.5 ${color}`} />
                  <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors">
                    {text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Builder Code Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[10px] text-white/30">
                    Builder Code
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono ${
                    identity?.builderCode?.includes("✓")
                      ? "text-emerald-400/60"
                      : "text-red-400/60"
                  }`}
                >
                  {identity?.builderCode || "—"}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Transaction Log + Earnings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Transaction Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center">
                <Hash className="w-3.5 h-3.5 text-white/30" />
              </div>
              <span className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase">
                On-Chain Transactions
              </span>
            </div>
            <div className="h-[280px] overflow-y-auto p-4 space-y-2">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2">
                  <Hash className="w-8 h-8" />
                  <p className="text-xs">No transactions yet</p>
                  <p className="text-[10px] text-white/10">Trigger a test job to see on-chain activity</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 font-medium">{tx.action.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-white/25">Job {tx.jobId}</span>
                        {tx.amount > 0 && (
                          <span className="text-[10px] text-emerald-400/70">${tx.amount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <a
                        href={`https://basescan.org/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400/50 hover:text-blue-400 flex items-center gap-1 transition-colors"
                      >
                        {tx.txHash.slice(0, 8)}...
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <p className="text-[9px] text-white/15 mt-0.5 font-mono">
                        {new Date(tx.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Earnings Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/[0.03] flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white/30" />
              </div>
              <span className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase">
                Earnings Overview
              </span>
            </div>
            <div className="h-[280px] p-5">
              {earningsHist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-white/15 gap-2">
                  <TrendingUp className="w-8 h-8" />
                  <p className="text-xs">No earnings yet</p>
                  <p className="text-[10px] text-white/10">Earnings will appear here as jobs complete</p>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">
                    ${earningsHist[earningsHist.length - 1]?.cumulative.toFixed(3) || '0.000'} USDC
                  </div>
                  <p className="text-[10px] text-white/25 mb-4">Cumulative earnings from {earningsHist.length} job{earningsHist.length !== 1 ? 's' : ''}</p>
                  {/* Simple bar chart */}
                  <div className="flex-1 flex items-end gap-1">
                    {earningsHist.slice(-20).map((e, i) => {
                      const maxCum = earningsHist[earningsHist.length - 1]?.cumulative || 1;
                      const height = Math.max(10, (e.cumulative / maxCum) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500/30 to-emerald-400/60 transition-all"
                            style={{ height: `${height}%` }}
                            title={`$${e.cumulative.toFixed(3)} — Job ${e.jobId}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] text-white/15">Oldest</span>
                    <span className="text-[9px] text-white/15">Latest</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── EconomyOS Primitives Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 glass-card p-5"
        >
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4 text-center">
            EconomyOS Primitives Used
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Wallet, label: "Agent Wallet", desc: "On-chain wallet on Base", color: "text-amber-400", bg: "bg-amber-500/10", status: "✓ Active" },
              { icon: Mail, label: "Agent Email", desc: "Email identity for jobs", color: "text-blue-400", bg: "bg-blue-500/10", status: "✓ Active" },
              { icon: CreditCard, label: "Agent Card", desc: "Virtual payment card", color: "text-violet-400", bg: "bg-violet-500/10", status: "✓ Active" },
              { icon: Zap, label: "ACP", desc: "Agent Commerce Protocol", color: "text-cyan-400", bg: "bg-cyan-500/10", status: "✓ Active" },
            ].map(({ icon: Icon, label, desc, color, bg, status }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/70">{label}</p>
                  <p className="text-[9px] text-white/25">{desc}</p>
                  <p className={`text-[9px] ${color} mt-0.5`}>{status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.03] px-6 py-5 mt-12 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-white/15 tracking-wider">
            FreelanceAgent · Built on{" "}
            <a
              href="https://os.virtuals.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/25 hover:text-blue-400/60 transition-colors"
            >
              Virtuals Protocol EconomyOS
            </a>
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://basescan.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/15 hover:text-white/30 transition-colors flex items-center gap-1"
            >
              Base <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-[10px] text-white/10">
              Agents Day 2025
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
