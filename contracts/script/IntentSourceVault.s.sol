// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IntentSourceVault} from "../src/IntentSourceVault.sol";

contract DeployVault is Script {
    function run() external {
        // This will use the account provided via --private-key, --interactive, or --account
        vm.startBroadcast();

        console2.log("Deploying IntentSourceVault...");

        // Deploy the Vault
        IntentSourceVault vault = new IntentSourceVault();
        
        console2.log("Vault Deployed to:", address(vault));

        vm.stopBroadcast();
    }
}
