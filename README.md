# Polkadot Intent Solver Network

A modular infrastructure for **intent-based cross-parachain asset settlement** on Polkadot. This protocol combines the agility of Solidity with the high-performance verification of PolkaVM (PVM) to enable trustless, MEV-resistant cross-chain swaps.

---

## Architecture

### 1. Hybrid Hub-and-Brain Model

- **The Hub (EVM):** `IntentExecutor.sol` acts as the single source of truth for asset custody, user escrows, and solver bonds.
- **The Brain (PVM):** A 64-bit RISC-V verifier running in PolkaVM. It performs the "heavy lifting" (MPT proofs and price checks) off-chain/cross-VM to minimize gas and maximize security.

### 2. HydraDX EMA Price Guard

- **MEV Protection:** The PVM verifier automatically queries the HydraDX Exponential Moving Average (EMA).
- **Execution Policy:** Settlement is rejected if the output is less than **90%** of the reference EMA price.
- **Outcome:** Users get a fair market price by default, even in volatile blocks.

### 3. Cryptographic Surety (MPT)

- **Trustless Logic:** Settlement requires a Merkle Patricia Trie (MPT) proof from the source chain's storage.
- **Math-First:** The verifier parses the proof vector against a trusted State Root anchored on the EVM hub.

---

## Live Deployment (Testnet)

- **Network:** Polkadot Hub Testnet (pallet-revive)
- **Chain ID:** `420420417`
- **EVM Executor:** [`0xc799A5a0d13d66EA168a713f5eF35206fD0839E6`](https://blockscout-testnet.polkadot.io/address/0xc799A5a0d13d66EA168a713f5eF35206fD0839E6)
- **PVM Verifier:** [`0x8f874cA1f141AC619F2aC4698a6A171b96E5CFaA`](https://blockscout-testnet.polkadot.io/address/0x8f874cA1f141AC619F2aC4698a6A171b96E5CFaA)
- **Token Factory:** `0x8DE75d04247Cd0707C239F5cBA9B01A5aeC65944`
- **Mock DEX:** `0xD82eE7805A0180e22C7c827614D5e4089BDF01c4`
- **Bond Token ($PBT):** `0x0522663853E9AaD410308f5CC175CF1702a636a4`

---

## Components

- **`contracts/src/IntentExecutor.sol`**: Singleton registry for intent settlement.
- **`contracts/src/TokenFactory.sol`**: Permissionless asset creator for the solver network.
- **`contracts/pvm/src/lib.rs`**: High-performance Rust verifier (no_std, 0-heap).
- **`solver/`**: EIP-712 intent creation and solver listeners.

## Getting Started

### Prerequisites

- **Foundry Nightly**: For `pallet-revive` and Polkadot Hub support.
- **Rust Nightly**: For PVM compilation with `build-std`.

### Installation

```bash
git clone https://github.com/Kanasjnr/Intent-Based-Cross-Parachain-Solver
cd intent/contracts
forge install
```

### Testing

```bash
# Verify EVM Hub
forge test

# Verify PVM Logic
cd pvm
cargo test --target x86_64-apple-darwin
```

---

## License

MIT License. Built for the Polkadot Hackathon.
