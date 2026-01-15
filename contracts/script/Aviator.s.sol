// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {AviatorGame} from "../src/Aviator.sol";

contract AviatorScript is Script {
    AviatorGame public aviator;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        aviator = new AviatorGame();

        vm.stopBroadcast();
    }
}
