import { Ethers5Adapter } from "@reown/appkit-adapter-ethers5";
import { defineChain } from "@reown/appkit/networks";

// 1. Get projectId
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_REOWN_PROJECT_ID is not set");
}

// 2. Define Custom Networks (Polkadot Hub Testnet)
export const polkadotHub = defineChain({
  id: Number(import.meta.env.VITE_CHAIN_ID || 420420417),
  caipNetworkId: `eip155:${import.meta.env.VITE_CHAIN_ID || 420420417}`,
  chainNamespace: "eip155",
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.polkadothub.io" },
  },
});

export const networks = [polkadotHub] as [any, ...any[]];

// 3. Create a metadata object
export const metadata = {
  name: "IntentDOT",
  description: "Intent-Based Cross-Parachain Settlement Protocol",
  url: window.location.origin,
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// 4. Create the Ethers adapter
export const ethers5Adapter = new Ethers5Adapter();
