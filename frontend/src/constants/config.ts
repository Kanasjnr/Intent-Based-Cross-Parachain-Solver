export const CHAINS = [
  { id: 420420417, name: "Polkadot Hub", icon: "P" },
  { id: 1000, name: "Moonbeam", icon: "M" },
  { id: 2000, name: "Acala", icon: "A" },
  { id: 1001, name: "AssetHub", icon: "H" },
];

export const ASSETS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x60d574dFD1F688a138E738fF70362E8a8fd092F0",
    iconColor: "bg-emerald-500",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xdD46E14Dd7355088DE962CD7aCd6d7358d76A61f",
    iconColor: "bg-blue-500",
  },
  {
    symbol: "PAS",
    name: "PAS",
    address: "0x0000000000000000000000000000000000000000", // Native
    iconColor: "bg-teal-500",
  },
];

export const PRICE_MAP: Record<string, number> = {
  "PAS-USDT": 1.0,
  "PAS-USDC": 1.0,
  "USDT-PAS": 1.0,
  "USDC-PAS": 1.0,
  "USDT-USDC": 1.0,
  "USDC-USDT": 1.0,
};
