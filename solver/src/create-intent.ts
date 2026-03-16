import { ethers } from "ethers";
import * as dotenv from "dotenv";
import vaultJson from "./abi.json";

dotenv.config();

const VAULT_ADDRESS = process.env.VAULT_ADDRESS!;
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.SOLVER_PRIVATE_KEY!; // Using this for demo

async function main() {
  console.log("📝 Creating a New Cross-Chain Intent...");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultJson.abi, wallet);

  // 1. Setup Intent Data
  const intent = {
    user: wallet.address,
    sourceAsset: "0x9D8519A7fCAeb7f29D53B0ddE1fAe2aF033A0035", // $PBT
    amount: ethers.parseEther("100"), // Swapping 100 $PBT
    destChainId: 1000, // Destination chain ID (e.g. AssetHub)
    destRecipient: wallet.address,
    destAsset: "0x0000000000000000000000000000000000000000", // Native on dest
    nonce: await vault.nonces(wallet.address),
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    extraData: "0x",
  };

  // 2. Sign EIP-712 Intent
  const domain = {
    name: "PolkadotIntentProtocol",
    version: "1.0.0",
    chainId: (await provider.getNetwork()).chainId,
    verifyingContract: VAULT_ADDRESS,
  };

  const types = {
    Intent: [
      { name: "user", type: "address" },
      { name: "sourceAsset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "destChainId", type: "uint256" },
      { name: "destRecipient", type: "address" },
      { name: "destAsset", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "extraData", type: "bytes" },
    ],
  };

  console.log("✍️ Signing EIP-712 intent message...");
  const signature = await wallet.signTypedData(domain, types, intent);
  console.log(`✅ Signature: ${signature.substring(0, 20)}...`);

  // 3. Submit to Vault
  console.log("🚀 Submitting 'lockIntent' to Vault...");
  const tx = await vault.lockIntent(intent, signature);
  console.log(`🔗 Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log("🎉 Intent locked successfully!");
  console.log(`Block: ${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
