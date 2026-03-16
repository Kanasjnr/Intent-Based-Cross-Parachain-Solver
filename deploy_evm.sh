#!/bin/bash
set -e

echo "================================================="
echo " Deploying Intent Protocol to Polkadot TestNet "
echo "================================================="

# Check for private key argument
if [ -z "$1" ]; then
    echo " Error: Please provide your private key as an argument."
    echo "Usage: ./deploy_evm.sh <PRIVATE_KEY> [RPC_URL]"
    exit 1
fi

PRIVATE_KEY=$1

echo "Running Forge deployment script on Polkadot Hub Testnet..."

# Native Foundry Polkadot support
forge script script/DeployProtocol.s.sol:DeployProtocol \
    --chain polkadot-testnet \
    --rpc-url https://services.polkadothub-rpc.com/testnet \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --verify \
    --skip-simulation \
    --legacy

echo " EVM Deployment Complete!"
