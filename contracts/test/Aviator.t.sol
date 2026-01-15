// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AviatorGame} from "../src/Aviator.sol";

contract AviatorTest is Test {
    AviatorGame public aviator;

    function setUp() public {
        aviator = new AviatorGame();
    }

    function test_PlaceBet() public {
        aviator.placeBet();
    }

    function test_CashOut(uint256 multiplier) public {
        aviator.cashOut(multiplier);
    }
}
