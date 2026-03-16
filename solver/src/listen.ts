import { ethers } from "ethers";
import * as dotenv from "dotenv";
import vaultJson from "./abi.json";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!;

async function main() {
  console.log("🚀 Starting Automated Solver (Polling + Auto-Settle)...");
  console.log(`📡 Connecting to RPC: ${RPC_URL}`);
  console.log(`Vault: ${VAULT_ADDRESS}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultJson.abi, wallet);

  const envStartBlock = process.env.START_BLOCK
    ? parseInt(process.env.START_BLOCK)
    : null;
  let lastBlock = envStartBlock
    ? envStartBlock - 1
    : await provider.getBlockNumber();

  console.log(`🔢 Starting from block: ${lastBlock + 1}`);
  console.log("👂 Monitoring for 'IntentLocked' events...");

  const poll = async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock > lastBlock) {
        const filter = vault.filters.IntentLocked();
        const logs = await vault.queryFilter(
          filter,
          lastBlock + 1,
          currentBlock,
        );

        for (const log of logs) {
          if ("args" in log) {
            const { intentHash, intent: rawIntent } = log.args;
            console.log(`\n✨ Intent Detected: ${intentHash}`);

            // Check if already settled
            const isSettled = await vault.settledIntents(intentHash);
            if (isSettled) {
              console.log("ℹ️ Intent already settled. Skipping.");
              continue;
            }

            // Sanitize intent object for Ethers transaction
            const intent = {
              user: rawIntent.user,
              sourceAsset: rawIntent.sourceAsset,
              amount: rawIntent.amount,
              destChainId: rawIntent.destChainId,
              destRecipient: rawIntent.destRecipient,
              destAsset: rawIntent.destAsset,
              nonce: rawIntent.nonce,
              deadline: rawIntent.deadline,
              extraData: rawIntent.extraData,
            };

            console.log("🛠️ Starting automated settlement...");
            console.log("⏳ Simulating cross-chain fulfillment (3s)...");
            await new Promise((r) => setTimeout(r, 3000));

            const mockProof =
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

            try {
              console.log("🚀 Submitting 'settleIntent' to Vault...");
              const tx = await vault.settleIntent(intent, mockProof, {
                gasLimit: 500000, // Ensure we don't fail gas estimation on testnets
              });
              console.log(`🔗 Transaction sent: ${tx.hash}`);
              await tx.wait();
              console.log("✅ Intent settled successfully!");
            } catch (err: any) {
              console.error("❌ Settlement failed:", err.message);
              if (err.data) console.log("Error data:", err.data);
            }
          }
        }
        lastBlock = currentBlock;
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
    setTimeout(poll, 5000); // Poll every 5 seconds
  };

  poll();

  process.on("SIGINT", () => {
    console.log("\nStopping solver...");
    process.exit();
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
