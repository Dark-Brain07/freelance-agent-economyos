import { execSync } from "child_process";

const acpBin = "F:\\Agent Day One\\acp-cli\\bin\\acp.ts";

try {
  // Set active agent
  execSync(`npx tsx "${acpBin}" agent use --agent-id 019de17d-7983-7157-bde6-b788836e5835`, { stdio: "inherit", shell: "cmd.exe" });

  const requirements = JSON.stringify({ type: "copywriting", task: "Write a tagline for an AI freelancing platform" });
  const cmd = `npx tsx "${acpBin}" client create-job --provider "0x7db71983738d833b4c9f4cb9d8b4935f0b59ef0f" --offering-name "Freelance Task" --requirements "${requirements.replace(/"/g, '\\"')}" --chain-id "8453" --json`;

  console.log("Running:", cmd);
  const result = execSync(cmd, { encoding: "utf-8", timeout: 120_000, shell: "cmd.exe" });
  console.log("Job created:", result);
} catch (e) {
  console.error("Error:");
  if (e.stdout) console.log("STDOUT:", e.stdout.toString());
  if (e.stderr) console.log("STDERR:", e.stderr.toString());
}
