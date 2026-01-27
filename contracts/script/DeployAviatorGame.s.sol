// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {console} from "forge-std/console.sol";

contract DeployAviatorGameScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcTokenAddress = vm.envAddress("USDC_ADDRESS");
        
        require(usdcTokenAddress != address(0), "USDC_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Implementation
        AviatorGame implementation = new AviatorGame();
        console.log("Implementation deployed at:", address(implementation));

        // 2. Encode initializer data
        bytes memory initData = abi.encodeWithSelector(
            AviatorGame.initialize.selector,
            usdcTokenAddress,
            vm.addr(deployerPrivateKey) // Owner
        );

        // 3. Deploy Proxy
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        console.log("Proxy deployed at:", address(proxy));

        vm.stopBroadcast();
    }
}
