// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IntentSourceVault} from "../src/IntentSourceVault.sol";
import {MockERC20} from "../test/MockERC20.sol";

contract DeployProtocol is Script {
    function run() external {
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();

        console2.log("Deploying Mock Bond Token...");
        MockERC20 bondToken = new MockERC20("Protocol Bond Token", "PBT");

        console2.log("Deploying IntentSourceVault...");
        IntentSourceVault vault = new IntentSourceVault(
            treasury,
            address(bondToken)
        );

        console2.log("------------------------------");
        console2.log("DEPLOYMENT SUCCESSFUL");
        console2.log("Vault Address:", address(vault));
        console2.log("Bond Token Address:", address(bondToken));
        console2.log("Treasury Address:", treasury);
        console2.log("------------------------------");

        vm.stopBroadcast();
    }
}
