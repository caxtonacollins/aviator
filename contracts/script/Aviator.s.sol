// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import { console } from "forge-std/console.sol";

contract AviatorScript is Script {
    function run() external {
        // Load the private key from the environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcTokenAddress = vm.envAddress("USDC_ADDRESS");
        
        // Ensure USDC token address is provided
        require(usdcTokenAddress != address(0), "USDC_ADDRESS not set");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the AviatorGame contract with the USDC token address
        AviatorGame aviator = new AviatorGame(usdcTokenAddress);
        
        console.log("AviatorGame deployed to:", address(aviator));

        vm.stopBroadcast();
    }
}
