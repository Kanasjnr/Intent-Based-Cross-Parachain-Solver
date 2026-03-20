import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const EXECUTOR_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!;

const EXECUTOR_ABI = ["function tokenFactory() view returns (address)"];

const FACTORY_ABI = [
  "function createToken(string name, string symbol, uint256 initialSupply) external returns (address)",
  "event TokenCreated(address indexed creator, address indexed tokenAddress, string name, string symbol, uint256 initialSupply)",
];

async function mintToken(
  factory: any,
  name: string,
  symbol: string,
  supply: bigint,
) {
  console.log(`\n--------------------------------`);
  console.log(`📝 Deploying ${name} (${symbol})...`);

  const tx = await factory.createToken(name, symbol, supply);
  console.log(`🔗 Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();

  const log = receipt.logs.find((l: any) => {
    try {
      const decoded = factory.interface.parseLog(l);
      return decoded?.name === "TokenCreated";
    } catch (e) {
      return false;
    }
  });

  if (log) {
    const decoded = factory.interface.parseLog(log);
    console.log(
      `✅ Success! ${symbol} created at: ${decoded?.args?.tokenAddress}`,
    );
    console.log(`💰 Amount: ${ethers.formatEther(supply)}`);
  } else {
    console.log(
      `⚠️ Transaction succeeded but event parsing failed for ${symbol}.`,
    );
  }
}

async function main() {
  console.log("🚀 Starting Stablecoin Minting Protocol...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const executor = new ethers.Contract(EXECUTOR_ADDRESS, EXECUTOR_ABI, wallet);
  console.log(`🔍 Fetching TokenFactory from ${EXECUTOR_ADDRESS}...`);
  const factoryAddress = await executor.tokenFactory();
  console.log(`✅ Found TokenFactory at: ${factoryAddress}`);

  const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, wallet);

  // 1. Mint USDT
  await mintToken(factory, "Tether USD", "USDT", ethers.parseEther("1000000"));

  // 2. Mint USDC
  await mintToken(factory, "USD Coin", "USDC", ethers.parseEther("1000000"));

  console.log("\n🚀 All stablecoins deployed and auto-whitelisted!");
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
