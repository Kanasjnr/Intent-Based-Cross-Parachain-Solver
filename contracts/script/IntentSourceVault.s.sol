// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IntentSourceVault} from "../src/IntentSourceVault.sol";

contract DeployVault is Script {
    function run() external {
        // Reads from --private-key or --interactive or --account
        vm.startBroadcast();

        address treasury = vm.envAddress("TREASURY_ADDRESS");

        console2.log("Deploying IntentSourceVault with treasury:", treasury);

        // Deploy the Vault
        IntentSourceVault vault = new IntentSourceVault(treasury);

        console2.log("Vault Deployed to:", address(vault));

        vm.stopBroadcast();
    }
}
