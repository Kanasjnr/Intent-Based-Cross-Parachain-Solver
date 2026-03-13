# Intent Protocol - Smart Contracts

The settlement layer for the Polkadot Intent-Based Cross-Parachain Solver. Built on Foundry, this protocol enables secure, non-custodial asset locks and optimistic settlement via XCM.

## Security Architecture

The protocol has been logic-hardened with the following features:

- **Optimistic Settlement**: 24-hour challenge period for every intent settlement.
- **Collateral (Bonding)**: Solvers must deposit a minimum bond (10 $PBT) to participate.
- **Withdrawal Locks**: Bond withdrawals are locked if a solver has active settlements in the challenge period.
- **Front-running Protection**: Payouts are hard-coded to the original solver.
- **Admin Hardening**: Critical tokens are protected from rescue operations.
- **Substrate Compatibility**: Integrated `LibScale.sol` for SCALE-compact encoding (LE) of XCM payloads.

## Deployment Configuration

- **Network**: Polkadot Hub TestNet (Chain ID: `420420417`)
- **Vault**: `0xc371f7A485fc20DA54E419B2b12eB4779C308E5e`
- **Bond Token ($PBT)**: `0x9D8519A7fCAeb7f29D53B0ddE1fAe2aF033A0035`

## Usage

### Install Dependencies

```bash
forge install
npm install
```

### Run Tests

```bash
forge test -vvv
```

### Deploy to Testnet

```bash
TREASURY_ADDRESS=<YOUR_WALLET> forge script script/DeployProtocol.s.sol \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --broadcast --slow --private-key <YOUR_PRIVATE_KEY>
```

## Contracts Architecture

- `IntentSourceVault.sol`: Main registry, escrow, and settlement logic.
- `LibScale.sol`: SCALE encoding library for Substrate/Polkadot compatibility.
- `IIntentSource.sol`: Protocol interface defining the intent lifecycle.
- `IXcm.sol`: Interface for interaction with the Polkadot XCM precompile.
