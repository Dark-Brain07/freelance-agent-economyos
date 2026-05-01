import {
  AcpAgent,
  PrivyAlchemyEvmProviderAdapter,
  ACP_CONTRACT_ADDRESSES,
  PRIVY_APP_ID,
  ACP_SERVER_URL,
  EVM_MAINNET_CHAINS,
} from "@virtuals-protocol/acp-node-v2";
import { execFileSync } from "child_process";
import "dotenv/config";

function createSignFn() {
  return async (payload: Uint8Array): Promise<string> => {
    const hex = Buffer.from(payload).toString("hex");
    const result = execFileSync(
      "F:\\Agent Day One\\acp-cli\\bin\\acp-cli-signer-windows.exe",
      ["sign", "--public-key", process.env.AGENT_PUBLIC_KEY!, "--payload", hex],
      { encoding: "utf-8" }
    );
    const parsed = JSON.parse(result.trim());
    if ("error" in parsed) throw new Error(`Sign error: ${parsed.error}`);
    return parsed.signature;
  };
}

async function main() {
  console.log("Initializing agent...");
  const provider = await PrivyAlchemyEvmProviderAdapter.create({
    walletAddress: process.env.AGENT_WALLET_ADDRESS! as `0x${string}`,
    walletId: process.env.AGENT_WALLET_ID!,
    signFn: createSignFn(),
    chains: EVM_MAINNET_CHAINS,
    serverUrl: ACP_SERVER_URL,
    privyAppId: PRIVY_APP_ID,
  });

  const agent = await AcpAgent.create({
    contractAddresses: ACP_CONTRACT_ADDRESSES,
    provider,
  });

  console.log("Browsing for copywriting agents on ACP...");
  const agents = await agent.browseAgents("copywriting");
  if (agents.length === 0) throw new Error("No agents found");

  let specialist = agents[0];
  let offering = specialist.offerings?.[0];

  // Find an offering with a price > 0 to avoid the Alchemy bigint zero error
  for (const ag of agents) {
    const validOffering = ag.offerings?.find(o => o.priceValue > 0);
    if (validOffering) {
      specialist = ag;
      offering = validOffering;
      break;
    }
  }

  if (!offering) throw new Error("No valid offering found for agent");

  console.log(`Hiring ${specialist.name} (${specialist.walletAddress}) for offering "${offering.name}" at price $${offering.priceValue}...`);

  const jobId = await agent.createJobFromOffering(
    8453,
    offering,
    specialist.walletAddress,
    { task: "Write a short poem about an AI building a website." },
    { evaluatorAddress: process.env.AGENT_WALLET_ADDRESS! }
  );

  console.log(`✅ Job created successfully on Base Mainnet! Job ID: ${jobId}`);
  console.log(`Transaction complete. Check dashboard for logs.`);
}

main().catch((err) => {
  console.error("Failed to hire agent:", err);
});
