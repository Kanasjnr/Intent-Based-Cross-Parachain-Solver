import { ethers } from "ethers";
import * as dotenv from "dotenv";
import vaultJson from "./abi.json";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!;

async function main() {
  console.log("🛠️  Onboarding Solver to Vault...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultJson.abi, wallet);

  console.log(`Solver Address: ${wallet.address}`);

  // 1. Whitelist the solver (Done by Owner)
  // In our case, the SOLVER_PRIVATE_KEY is the owner key.
  const isWhitelisted = await vault.whitelistedSolvers(wallet.address);
  if (!isWhitelisted) {
    console.log("✍️ Whitelisting solver...");
    const tx = await vault.setSolverWhitelist(wallet.address, true);
    await tx.wait();
    console.log("✅ Solver whitelisted!");
  } else {
    console.log("ℹ️ Solver already whitelisted.");
  }

  // 2. Deposit Bond
  const currentBond = await vault.solverBonds(wallet.address);
  console.log(`Current Bond: ${ethers.formatEther(currentBond)} $PBT`);

  if (currentBond < ethers.parseEther("10")) {
    console.log("💰 Depositing 100 $PBT bond...");
    // Approval was done globally in previous steps via cast
    const tx = await vault.depositBond(ethers.parseEther("100"));
    await tx.wait();
    console.log("✅ Bond deposited successfully!");
  } else {
    console.log("ℹ️ Sufficient bond already present.");
  }

  console.log("🚀 Solver is now ready to settle intents!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
