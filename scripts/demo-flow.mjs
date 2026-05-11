import { demoVault, demoInflow, demoPolicy } from "../src/engine/demo-data.js";
import { runPolicySimulation } from "../src/engine/policy-engine.js";

const result = runPolicySimulation({
  vault: demoVault,
  inflow: demoInflow,
  policy: demoPolicy
});

console.log("IkaPayFi private bridgeless payroll demo");
console.log("------------------------------------------");
console.log(`Vault: ${result.vaultName}`);
console.log(`Incoming asset: ${result.inflow.asset} from ${result.inflow.sourceChain}`);
console.log(`Private inflow: ${result.privateView.formattedInflow}`);
console.log("");
console.log("Encrypted split outputs");
for (const item of result.allocations) {
  console.log(`- ${item.label}: ${item.privateFormatted} (${item.ciphertextId})`);
}
console.log("");
console.log(`Policy: ${result.policyDecision.status}`);
console.log(`Ika approval: ${result.ikaApproval.approvalId}`);
