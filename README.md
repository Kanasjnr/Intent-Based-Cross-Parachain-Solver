# Polkadot Intent-Based Cross-Parachain Solver

A modular, production-grade infrastructure protocol for **intent-based cross-parachain asset settlement** on Polkadot. Unlike monolithic dApps, this system is architected as composable infrastructure primitives—intent contracts, solver networks, and XCM settlement layers—that can be deployed independently and composed by multiple application frontends.

---

##  Executive Summary

The protocol leverages Polkadot's **shared security model** and **XCM (Cross-Consensus Messaging)** to enable gasless swaps through solver competition. By moving the complexity of cross-chain routing off-chain to a specialized solver network, we eliminate liquidity fragmentation across parachains while reducing MEV exposure compared to traditional AMM architectures.

### Key Differentiators:
- **Shared Security:** Intent contracts inherit Polkadot's validator set; no additional trust assumptions beyond the relay chain.
- **Native XCM Settlement:** Multi-hop cross-parachain atomicity without external bridging protocols; settlement is guaranteed by the relay chain.
- **Modular Solver Network:** Competing solvers service intents, enabling a permissionless and efficient market.
- **Precompile Integration:** Direct EVM-to-Polkadot runtime interaction for low-latency liquidity discovery.

---

## The Problem: Liquidity Fragmentation

Polkadot's isolation provides scalability but fragments liquidity:
- **HydraDX:** Omnipool depth.
- **Acala:** Collateralized assets.
- **Moonbeam:** Ethereum-sourced tokens.
- **AssetHub:** Native issuance.

A user swapping `DOT` on AssetHub for `USDT` on Acala currently faces manual XCM construction, multiple gas payments, and slippage risks. This protocol solves this by allowing the user to sign a **single intent message** and let solvers handle the execution.

---

## System Architecture

### 1. On-Chain (Solidity/PVM)
- **`IntentSourceVault.sol`**: The core registry and escrow vault. It handles EIP-712 verification and atomic asset locking.
- **`IIntentSource.sol`**: Standardized lifecycle interface (`lock` -> `settle` -> `refund`).
- **`IXcm.sol`**: Low-level interface for the Polkadot XCM precompile (`0xA0000`).

### 2. Off-Chain Solver Network (In Progress)
- **Intent Listener**: Monitors the chain for `IntentCreated` events.
- **Route Simulator**: Queries parachain liquidity via precompiles to find optimal routes.
- **Execution Engine**: Dispatches XCM settlement messages to the vault.

---

## Security & Trust Model

The protocol is built to "cracked" engineering standards:
- **EIP-712 Typed Signing:** Prevents cross-chain replay attacks by binding signatures to the Polkadot Chain ID.
- **Hardened Logic:** Implementation includes a strict `registeredIntents` mapping to prevent unauthorized vault drainage (Fixed H-01).
- **Escrow Persistence:** User funds are locked in the vault and released ONLY upon valid proof of fulfillment or expiry refund.
- **Reentrancy Protection:** Utilizes OpenZeppelin's `ReentrancyGuard` and `SafeERC20`.

---

## Live Deployment (Polkadot Hub TestNet)

The core on-chain layer is deployed and verified:

- **Contract Address:** [`0x134097302365ac86B26D1c094CAE1D0295E3e953`](https://blockscout-testnet.polkadot.io/address/0x134097302365ac86B26D1c094CAE1D0295E3e953)
- **Network:** Polkadot Hub TestNet (Chain ID: `420420417`)
- **Status:** **Logic-Hardened & Verified**

---

## 🛠️ Development

### Prerequisites
- [Foundry Nightly](https://book.getfoundry.sh/getting-started/installation.html) (Required for Polkadot Hub support)

### Installation
```bash
cd contracts
npm install
forge install
```

### Testing
```bash
cd contracts
forge test -vvv
```

### Deployment Strategy
We use **Forge Scripts** for reproducible, stateful deployments. For security, we recommend using encrypted keystores:
```bash
# Import your key securely
cast wallet import my-deployer --interactive

# Deploy using the account
forge script script/IntentSourceVault.s.sol:DeployVault --chain polkadot-testnet --account my-deployer --sender <YOUR_ADDRESS> --broadcast --verify
```

---

## License
MIT License. Created for the Polkadot Intent-Based Solver Track.
