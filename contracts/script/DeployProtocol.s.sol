// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IntentExecutor} from "../src/IntentExecutor.sol";
import {TokenFactory} from "../src/TokenFactory.sol";
import {MockDEX} from "../src/MockDEX.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployProtocol is Script {
    function run() external {
        // Use a default treasury if not set
        address treasury = vm.envOr("TREASURY_ADDRESS", address(0x555));

        vm.startBroadcast();

        console2.log("Deploying Mock Bond Token ($PBT)...");
        MockERC20 bondToken = new MockERC20("Polkadot Bond Token", "PBT");

        console2.log("Deploying IntentExecutor Singleton...");
        IntentExecutor executor = new IntentExecutor(
            treasury,
            address(bondToken)
        );

        console2.log("Deploying TokenFactory...");
        TokenFactory factory = new TokenFactory(address(executor));

        console2.log("Deploying MockDEX...");
        MockDEX dex = new MockDEX();

        // Permissioning
        executor.setTokenFactory(address(factory));

        console2.log("------------------------------");
        console2.log("DEPLOYMENT SUCCESSFUL");
        console2.log("Executor Address:", address(executor));
        console2.log("Factory Address:", address(factory));
        console2.log("DEX Address:", address(dex));
        console2.log("Bond Token ($PBT):", address(bondToken));
        console2.log("------------------------------");

        vm.stopBroadcast();
    }
}
