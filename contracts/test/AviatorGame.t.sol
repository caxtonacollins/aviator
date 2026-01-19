// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, StdCheats} from "forge-std/Test.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Simple ERC20 that always returns false for transfer/transferFrom to simulate failures
contract FailingERC20 is IERC20 {
    string public name = "Fail";
    string public symbol = "FAIL";
    uint8 public decimals = 6;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }
    function transfer(address, uint256) external pure override returns (bool) {
        return false;
    }
    function approve(address, uint256) external pure override returns (bool) {
        return true;
    }
    function transferFrom(
        address,
        address,
        uint256
    ) external pure override returns (bool) {
        return false;
    }
}

contract AviatorGameTest is Test {
    AviatorGame public aviator;
    ERC20Mock public usdc;
    address public constant PLAYER = address(1);
    address public constant PLAYER2 = address(2);
    uint256 public constant BET_AMOUNT = 1e6; // 1 USDC (6 decimals)

    function setUp() public {
        // Deploy mock USDC token
        usdc = new ERC20Mock();

        // Deploy AviatorGame with mock USDC address
        aviator = new AviatorGame(address(usdc));

        // Mint USDC to test players
        usdc.mint(PLAYER, 1000e6);
        usdc.mint(PLAYER2, 1000e6);

        // Approve aviator to spend players' USDC
        vm.prank(PLAYER);
        usdc.approve(address(aviator), type(uint256).max);
        vm.prank(PLAYER2);
        usdc.approve(address(aviator), type(uint256).max);
    }

    function test_PlaceBet() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        (uint256 amount, uint256 cashoutMultiplier, bool settled) = aviator
            .getPlayerBet(aviator.currentRoundId(), PLAYER);
        assertEq(amount, BET_AMOUNT);
        assertEq(cashoutMultiplier, 0);
        assertEq(settled, false);
    }

    function test_CannotPlaceLowOrHighBet() public {
        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidBetAmount.selector)
        );
        aviator.placeBet(1);

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidBetAmount.selector)
        );
        aviator.placeBet(1e9 * 1e6); // > MAX_BET
    }

    function test_CannotPlaceTwice() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.BetAlreadyPlaced.selector)
        );
        aviator.placeBet(BET_AMOUNT);
    }

    function test_StartFlyingOnlyServerOperator() public {
        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.Unauthorized.selector)
        );
        aviator.startFlying(keccak256(abi.encodePacked("seed")));
    }

    function test_StartFlyingInvalidSeed() public {
        // onlyServerOperator is this test contract (owner); sending zero hash should revert
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidServerSeed.selector)
        );
        aviator.startFlying(bytes32(0));
    }

    function test_CrashRoundInvalidMultiplierOrSeed() public {
        // Place bet to move round forward
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        // start flying with seed
        bytes32 seedHash = keccak256(abi.encodePacked("secret"));
        aviator.startFlying(seedHash);

        // invalid multiplier
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidCrashMultiplier.selector)
        );
        aviator.crashRound(50, "secret"); // less than MIN_MULTIPLIER (101)

        // wrong seed
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidServerSeed.selector)
        );
        aviator.crashRound(200, "wrong");
    }

    function test_CrashSettleRoundAndHouseBalance() public {
        // Round 1: PLAYER loses
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        bytes32 seedHash1 = keccak256(abi.encodePacked("s1"));
        aviator.startFlying(seedHash1);
        aviator.crashRound(150, "s1"); // 1.5x crash
        aviator.settleRound();

        assertEq(aviator.houseBalance(), BET_AMOUNT);

        // Round 2: PLAYER2 loses
        vm.prank(PLAYER2);
        aviator.placeBet(BET_AMOUNT);
        bytes32 seedHash2 = keccak256(abi.encodePacked("s2"));
        aviator.startFlying(seedHash2);
        aviator.crashRound(120, "s2");
        aviator.settleRound();

        assertEq(aviator.houseBalance(), BET_AMOUNT * 2);
    }

    function test_CashOutInsufficientHouseBalance() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        bytes32 seedHash = keccak256(abi.encodePacked("seedA"));
        aviator.startFlying(seedHash);

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(
                AviatorGame.InsufficientHouseBalance.selector
            )
        );
        aviator.cashOut(200); // 2x -> needs 2e6 but houseBalance==0
    }

    function test_CashOutSuccessFlow() public {
        // Build house balance via two losing rounds
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
        aviator.startFlying(keccak256(abi.encodePacked("r1")));
        aviator.crashRound(150, "r1");
        aviator.settleRound();

        vm.prank(PLAYER2);
        aviator.placeBet(BET_AMOUNT);
        aviator.startFlying(keccak256(abi.encodePacked("r2")));
        aviator.crashRound(150, "r2");
        aviator.settleRound();

        assertEq(aviator.houseBalance(), BET_AMOUNT * 2);

        // New round: PLAYER bets and cashes out 2x
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
        bytes32 seed = keccak256(abi.encodePacked("r3"));
        aviator.startFlying(seed);

        // PLAYER cashes out at 2x
        vm.prank(PLAYER);
        aviator.cashOut(200);

        // payout = BET_AMOUNT * 2
        assertEq(aviator.houseBalance(), 0);
        // final balance should equal initial (they lost earlier round then cashed out to net zero change)
        assertEq(usdc.balanceOf(PLAYER), 1000e6);
    }

    function test_SettleAfterCrashOnlyAndCannotSettleTwice() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);

        aviator.startFlying(keccak256(abi.encodePacked("s")));
        aviator.crashRound(150, "s");

        aviator.settleRound();

        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.WrongGamePhase.selector)
        );
        aviator.settleRound(); // new round is in BETTING phase so WrongGamePhase
    }

    function test_AdminSetServerOperatorAndWithdraw() public {
        // Only owner (this contract) can set server operator
        address newOp = address(0xBEEF);

        // Non-owner cannot set server operator
        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.setServerOperator(newOp);

        // Owner sets it and we verify
        aviator.setServerOperator(newOp);
        assertEq(aviator.serverOperator(), newOp);

        // Build house balance: use the new operator to run the round
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
        vm.prank(newOp);
        aviator.startFlying(keccak256(abi.encodePacked("s4")));
        vm.prank(newOp);
        aviator.crashRound(150, "s4");
        aviator.settleRound();

        // Withdraw profits
        uint256 before = usdc.balanceOf(address(this));
        aviator.withdrawHouseProfits(BET_AMOUNT);
        assertEq(usdc.balanceOf(address(this)), before + BET_AMOUNT);
        assertEq(aviator.houseBalance(), 0);
    }

    function test_PausePreventsActions() public {
        aviator.pause();

        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.placeBet(BET_AMOUNT);

        vm.expectRevert();
        aviator.startFlying(keccak256(abi.encodePacked("s")));

        aviator.unpause();
        // after unpause should work
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
    }

    function test_TransferFailuresRevert() public {
        // Deploy failing token and new Aviator with it
        FailingERC20 failToken = new FailingERC20();
        AviatorGame bad = new AviatorGame(address(failToken));

        // Attempt to place bet should revert because transferFrom returns false
        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.TransferFailed.selector)
        );
        bad.placeBet(BET_AMOUNT);
    }

    function test_GetRoundPlayersAndHistory() public {
        vm.prank(PLAYER);
        aviator.placeBet(BET_AMOUNT);
        vm.prank(PLAYER2);
        aviator.placeBet(BET_AMOUNT);

        address[] memory players = aviator.getRoundPlayers();
        assertEq(players.length, 2);
        assertEq(players[0], PLAYER);
        assertEq(players[1], PLAYER2);

        (
            uint256 id,
            uint256 crashMultiplier,
            bytes32 serverSeedHash,
            uint256 totalBets,
            uint256 totalPayouts,
            bool settled
        ) = aviator.getRoundHistory(aviator.currentRoundId() - 1);
        // getRoundHistory reads from rounds mapping for an old id; the initial round started at deploy increments to 1
        // We expect the previous round (id = 0) to be zero-values
        assertEq(id, 0);

        // The live currentRound struct reflects in-memory updates. Assert against the public currentRound getter.
        (
            uint256 idCR,
            AviatorGame.GamePhase phaseCR,
            uint256 startTimeCR,
            uint256 flyStartTimeCR,
            uint256 crashMultiplierCR,
            bytes32 seedCR,
            uint256 tbCR,
            uint256 tpCR,
            bool settledCR
        ) = aviator.currentRound();
        assertEq(tbCR, BET_AMOUNT * 2);
        assertEq(tpCR, 0);
        assertEq(settledCR, false);
    }
}
