// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import {console} from "forge-std/console.sol";

contract UpgradeAviatorGameScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("AVIATOR_PROXY_ADDRESS");
        
        require(proxyAddress != address(0), "AVIATOR_PROXY_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy New Implementation
        AviatorGame newImplementation = new AviatorGame();
        console.log("New Implementation deployed at:", address(newImplementation));

        // 2. Upgrade Proxy
        // call upgradeToAndCall with empty data to perform the upgrade
        AviatorGame(proxyAddress).upgradeToAndCall(address(newImplementation), "");
        console.log("Proxy upgraded to new implementation");

        vm.stopBroadcast();
    }
}
