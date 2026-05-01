# FreelanceAgent 🤖

> Autonomous AI Freelancer on Virtuals Protocol EconomyOS

FreelanceAgent is an autonomous AI agent that lives its own economic life on the Virtuals Protocol EconomyOS. It has its own wallet, email, and card. It finds freelance jobs, hires specialized sub-agents to do the work, pays them from its wallet, delivers results to clients, and earns USDC — all with zero human involvement.

## 🏗️ Architecture

```
┌─────────────────┐     SSE      ┌──────────────────┐
│   React + Vite  │◄────────────►│   Hono Engine    │
│   (Dashboard)   │    REST      │   (TypeScript)   │
│   Port 3000     │─────────────►│   Port 8000      │
└─────────────────┘              └────────┬─────────┘
                                          │
                    ┌─────────────────────┼──────────────────┐
                    │                     │                   │
              ┌─────▼─────┐    ┌─────────▼──────┐   ┌──────▼──────┐
              │  Groq LLM │    │  ACP Protocol  │   │ Base Sepolia│
              │  (Llama3) │    │  (SDK v2)      │   │ (Chain)     │
              └───────────┘    └────────────────┘   └─────────────┘
```

## EconomyOS Primitives Used

| Primitive | Usage |
|-----------|-------|
| 🏦 **Wallet** | Agent's own on-chain wallet on Base Sepolia |
| 📧 **Email** | Agent email identity for receiving job notifications |
| 💳 **Card** | Virtual payment card for real-world spending |
| 🔗 **ACP** | Agent Commerce Protocol for hiring and being hired |

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- `acp-cli` installed (`npm install -g acp-cli`)
- Agent registered at https://app.virtuals.io/acp/new
- Groq API key from https://console.groq.com/

### 2. Setup Agent Identity
```bash
acp configure
acp agent create
acp agent add-signer
acp wallet topup --chain-id 84532
acp email provision --display-name "FreelanceAgent" --local-part "freelance.agent"
acp card signup --email "freelance.agent@yourdomain.agents.world"
```

### 3. Configure Environment
```bash
cd engine
cp .env.template .env
# Edit .env with your real values
```

### 4. Start Engine
```bash
cd engine
npm install
npm run dev
```

### 5. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### 6. Demo: Trigger a Test Transaction
Click the **"Test Job"** button in the dashboard, or:
```bash
curl -X POST http://localhost:8000/api/test-job \
  -H "Content-Type: application/json" \
  -d '{"task": "Write a product description for an AI tool"}'
```

Or via ACP CLI:
```bash
acp job create \
  --provider YOUR_AGENT_WALLET_ADDRESS \
  --offering "Freelance Task" \
  --input '{"type": "copywriting", "task": "Write a tagline for a DeFi app"}' \
  --budget 0.1
```

## Why It Matters

FreelanceAgent demonstrates a fully autonomous economic agent that:
1. **Receives work** via the Agent Commerce Protocol
2. **Plans and executes** using LLM (Groq Llama3)
3. **Hires specialists** by browsing the ACP registry and creating sub-jobs
4. **Delivers results** and earns USDC automatically
5. **Manages its own identity** — wallet, email, and payment card

No human in the loop. The agent earns money on its own.

---

*Built for Virtuals Protocol EconomyOS Best Execution Challenge — Agents Day May 1, 2025*
