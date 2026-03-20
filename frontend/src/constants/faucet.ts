export const MINT_ABI = [
    "function mint(address to, uint256 amount) public",
    "function deposit() public payable",
];

export const FAUCET_ASSETS = [
    { 
        name: 'Tether USD', 
        symbol: 'USDT', 
        address: '0x60d574dFD1F688a138E738fF70362E8a8fd092F0', 
        color: 'bg-emerald-500' 
    },
    { 
        name: 'USD Coin', 
        symbol: 'USDC', 
        address: '0xdD46E14Dd7355088DE962CD7aCd6d7358d76A61f', 
        color: 'bg-blue-500' 
    },
    { 
        name: 'Polkadot Asset', 
        symbol: 'PAS', 
        address: '0x0000000000000000000000000000000000000000', 
        color: 'bg-teal-500' 
    }
];

export const EXPLORER_URL = "https://blockscout-testnet.polkadot.io";
