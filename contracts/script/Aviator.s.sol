// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import { console } from "forge-std/console.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract AviatorScript is Script {
    function run() external {
        // Load the private key from the environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcTokenAddress = vm.envAddress("USDC_ADDRESS");
        
        // Ensure USDC token address is provided
        require(usdcTokenAddress != address(0), "USDC_ADDRESS not set");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy implementation
        AviatorGame implementation = new AviatorGame();

        // Encode initializer
        bytes memory initData = abi.encodeWithSelector(
            AviatorGame.initialize.selector,
            usdcTokenAddress,
            vm.addr(deployerPrivateKey)
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        AviatorGame aviator = AviatorGame(address(proxy));
        
        console.log("AviatorGame Proxy deployed to:", address(aviator));

        vm.stopBroadcast();
    }
}
