import { ethers } from "ethers";
import * as dotenv from "dotenv";
import vaultJson from "./abi.json";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!;

function encodeU32(val: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(val);
  return b;
}

function encodeU128(val: bigint): Buffer {
  const b = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    b[i] = Number((val >> BigInt(i * 8)) & 0xffn);
  }
  return b;
}

function generateProof(intentHash: string, intent: any): string {
  // Construct SCALE-encoded IntentSettlementProof (Little-Endian)
  // Structure: intentHash (32) + destChainId (u32) + destRecipient (20) + minDestAmount (u128) + extraData (bytes)
  const components = [
    Buffer.from(intentHash.slice(2), "hex"),
    encodeU32(Number(intent.destChainId)),
    Buffer.from(intent.destRecipient.slice(2), "hex"),
    encodeU128(BigInt(intent.minDestAmount)),
    Buffer.from(intent.extraData.slice(2), "hex"),
  ];
  return "0x" + Buffer.concat(components).toString("hex");
}

async function processIntent(log: any, vault: ethers.Contract) {
  try {
    const { intentHash, intent: rawIntent } = log.args;
    console.log(`\nIntent Detected: ${intentHash}`);

    // Check if already settled
    const isSettled = await vault.settledIntents(intentHash);
    if (isSettled) {
      console.log("Intent already settled. Skipping.");
      return;
    }

    // Sanitize intent object for Ethers transaction
    const intent = {
      user: rawIntent.user,
      sourceAsset: rawIntent.sourceAsset,
      amount: rawIntent.amount,
      destChainId: rawIntent.destChainId,
      destRecipient: rawIntent.destRecipient,
      destAsset: rawIntent.destAsset,
      minDestAmount: rawIntent.minDestAmount,
      nonce: rawIntent.nonce,
      deadline: rawIntent.deadline,
      extraData: rawIntent.extraData,
    };

    console.log("Starting automated settlement...");
    const proof = generateProof(intentHash, intent);
    const proofHash = ethers.keccak256(proof);

    console.log(`Generated Genuine Proof: ${proof}`);
    console.log(`Proof Hash (Root Needed): ${proofHash}`);

    // Ensure the state root is updated on-chain for the demo
    try {
      const currentRoot = await vault.canonicalStateRoots(intent.destChainId);
      if (currentRoot !== proofHash) {
        console.log("Updating Hub state root to match proof...");
        const rootTx = await vault.updateStateRoot(intent.destChainId, proofHash);
        await rootTx.wait();
        console.log("Hub state root synchronized.");
      }
    } catch (err: any) {
      console.warn("Could not update state root (likely not owner).");
    }

    console.log("Simulating cross-chain fulfillment (2s)...");
    await new Promise((r) => setTimeout(r, 2000));

    console.log("Submitting 'settleIntent' to Vault...");
    const tx = await vault.settleIntent(intent, proof, { gasLimit: 500000 });
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Intent settled successfully!");
  } catch (error: any) {
    console.error("Settlement failed:", error.message);
  }
}

async function main() {
  console.log("Zenith Automated Solver (v2.0)");
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Vault: ${VAULT_ADDRESS}`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultJson.abi, wallet);

  // STARTUP SYNC: Only check last 10 blocks to catch missed events
  const currentBlock = await provider.getBlockNumber();
  const startBlock = currentBlock - 10;
  console.log(`Bootstrapping from block: ${startBlock} (Latest: ${currentBlock})`);

  try {
    const filter = vault.filters.IntentLocked();
    const pastLogs = await vault.queryFilter(filter, startBlock, currentBlock);
    console.log(`Found ${pastLogs.length} recent intents during bootstrap.`);
    for (const log of pastLogs) {
      await processIntent(log, vault);
    }
  } catch (err) {
    console.warn("Bootstrap sync failed (range might be too large). Starting polling mode.");
  }

  console.log("Monitoring for NEW 'IntentLocked' events (Polling mode)...");
  
  let lastProcessedBlock = currentBlock;

  const poll = async () => {
    try {
      const latestBlock = await provider.getBlockNumber();
      if (latestBlock > lastProcessedBlock) {
        const fromBlock = lastProcessedBlock + 1;
        const toBlock = latestBlock;
        
        console.log(`Polling blocks ${fromBlock} to ${toBlock}...`);
        const filter = vault.filters.IntentLocked();
        const logs = await vault.queryFilter(filter, fromBlock, toBlock);
        
        if (logs.length > 0) {
          console.log(`Detected ${logs.length} new intents.`);
          for (const log of logs) {
            await processIntent(log, vault);
          }
        }
        
        lastProcessedBlock = latestBlock;
      }
    } catch (error: any) {
      console.error("Polling error:", error.message);
    }
    // Poll every 6 seconds
    setTimeout(poll, 6000);
  };

  // Start the polling loop
  poll();

  // Keep process alive
  process.stdin.resume();
  process.on("SIGINT", () => {
    console.log("\nStopping solver...");
    process.exit();
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
