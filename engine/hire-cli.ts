import { execSync } from "child_process";

try {
  const req = JSON.stringify({ type: "copywriting", task: "Write an ad" });
  const cmd = `npx tsx "F:\\Agent Day One\\acp-cli\\bin\\acp.ts" client create-job --provider "0x98d8352b828c3eb4ca8526be45d604f0f016fd2b" --offering-name "adCopy" --requirements "${req.replace(/"/g, '\\"')}" --chain-id "8453" --json`;
  
  console.log("Running CLI to create job...");
  const output = execSync(cmd, { shell: "cmd.exe", encoding: "utf-8" });
  console.log(output);
} catch (e) {
  console.error("Failed:");
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.log(e.stderr.toString());
}
