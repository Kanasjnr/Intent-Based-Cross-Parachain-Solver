#!/bin/bash
set -e

# Senior Protocol PVM Deployment Script
# Targets: Polkadot Hub Testnet (pallet-revive)

RPC_URL="https://services.polkadothub-rpc.com/testnet"
EXECUTOR_ADDRESS="0xc799A5a0d13d66EA168a713f5eF35206fD0839E6"
PVM_BLOB="contracts/pvm/intent-verifier.polkavm"

if [ -z "$1" ]; then
    echo "Usage: ./deploy_pvm.sh <PRIVATE_KEY>"
    exit 1
fi

PRIVATE_KEY=$1

echo "[1/3] Converting PVM blob to 0x-hex..."
PVM_HEX="0x$(xxd -p "$PVM_BLOB" | tr -d '\n')"

echo "[2/3] Deploying PVM Verifier to Polkadot Hub..."
# On pallet-revive, sending bytecode to address(0) creates a contract.
DEPLOY_TX=$(cast send --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" --legacy --create "$PVM_HEX")

# Extract contract address from cast output
# Typical output has "contractAddress: 0x..." or we can use cast receipt
VERIFIER_ADDRESS=$(echo "$DEPLOY_TX" | grep "contractAddress" | awk '{print $2}')

if [ -z "$VERIFIER_ADDRESS" ]; then
    # Fallback: check for "Deployed to: 0x..."
    VERIFIER_ADDRESS=$(echo "$DEPLOY_TX" | grep "Deployed to" | awk '{print $3}')
fi

if [ -z "$VERIFIER_ADDRESS" ]; then
    echo "Failed to extract Verifier Address. Full output:"
    echo "$DEPLOY_TX"
    exit 1
fi

echo "Verifier Deployed at: $VERIFIER_ADDRESS"

echo "[3/3] Linking Verifier to IntentExecutor..."
cast send --private-key "$PRIVATE_KEY" --rpc-url "$RPC_URL" "$EXECUTOR_ADDRESS" "setVerifier(address)" "$VERIFIER_ADDRESS" --legacy

echo "================================================="
echo " DEPLOYMENT COMPLETE "
echo " Verifier: $VERIFIER_ADDRESS "
echo " Executor: $EXECUTOR_ADDRESS "
echo "================================================="

# Update deployed addresses file
sed -i '' "s/Verifier Address: .*/Verifier Address: $VERIFIER_ADDRESS/" deployed_addresses.txt || echo "Verifier Address: $VERIFIER_ADDRESS" >> deployed_addresses.txt
