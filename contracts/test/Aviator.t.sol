// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";

contract AviatorTest is Test {
    AviatorGame public aviator;
    ERC20Mock public usdc;
    address public constant PLAYER = address(1);
    uint256 public constant BET_AMOUNT = 1e6; // 1 USDC

    function setUp() public {
        // Deploy mock USDC token
        usdc = new ERC20Mock();
        
        // Deploy AviatorGame with mock USDC address
        aviator = new AviatorGame(address(usdc));
        
        // Mint USDC to test player
        usdc.mint(PLAYER, 1000e6);
        
        // Approve aviator to spend player's USDC
        vm.prank(PLAYER);
        usdc.approve(address(aviator), type(uint256).max);
    }

    function test_PlaceBet() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
        
        // Verify bet was placed
        (uint256 amount, uint256 cashoutMultiplier, bool settled) = aviator.getPlayerBet(aviator.currentRoundId(), PLAYER);
        assertEq(amount, BET_AMOUNT);
        assertEq(cashoutMultiplier, 0);
        assertEq(settled, false);
    }

    function test_CannotPlaceZeroBet() public {
        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.placeBet(0);
    }

    function test_OnlyServerCanStartFlying() public {
        // This should fail because only server can call startFlying
        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.startFlying(keccak256(abi.encodePacked("seed")));
    }
}
