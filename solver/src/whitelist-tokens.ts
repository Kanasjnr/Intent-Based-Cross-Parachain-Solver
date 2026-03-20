import { ethers } from "ethers";
import * as dotenv from "dotenv";
import vaultJson from "./abi.json";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!;

async function main() {
  console.log("🛠️ Whitelisting Tokens on Vault...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultJson.abi, wallet);

  const tokens = [
    "0x8DE75d04247Cd0707C239F5cBA9B01A5aeC65944", // USDT/USDC
    "0x0000000000000000000000000000000000000000", // Native PAS
  ];

  for (const token of tokens) {
    console.log(`Checking token: ${token}`);
    const isWhitelisted = await vault.whitelistedTokens(token);
    
    if (!isWhitelisted) {
      console.log(`✍️ Whitelisting token: ${token}...`);
      const tx = await vault.whitelistToken(token, true);
      await tx.wait();
      console.log(`✅ Token ${token} whitelisted!`);
    } else {
      console.log(`ℹ️ Token ${token} already whitelisted.`);
    }
  }

  console.log("🚀 All tokens are now whitelisted!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
