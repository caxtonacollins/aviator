// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AviatorGame is ReentrancyGuard, Ownable, Pausable {
    // ============ State Variables ============

    // Token Configuration
    IERC20 public usdcToken;
    uint256 public constant MIN_BET = 1e5; // 0.1 USDC (6 decimals)
    uint256 public constant MAX_BET = 1000e6; // 1,000 USDC
    uint256 public constant MIN_MULTIPLIER = 101; // 1.01x (scaled by 100)
    uint256 public constant MAX_MULTIPLIER = 10000; // 100x (scaled by 100)
    uint256 public constant BETTING_DURATION = 10 seconds;

    // Game State
    enum GamePhase {
        BETTING,
        FLYING,
        CRASHED
    }
    struct Round {
        uint256 roundId;
        GamePhase phase;
        uint256 startTime;
        uint256 flyStartTime;
        uint256 crashMultiplier; // Scaled by 100 (e.g., 150 = 1.5x)
        bytes32 serverSeedHash; // Hash of server seed for provability
        uint256 totalBets;
        uint256 totalPayouts;
        bool settled;
    }
    struct Bet {
        uint256 amount;
        uint256 cashoutMultiplier; // 0 if not cashed out
        bool settled;
    }
    struct PlayerStats {
        uint256 totalWagered;
        uint256 totalWon;
        uint256 gamesPlayed;
        uint256 biggestWin;
    }

    // Current round
    uint256 public currentRoundId;
    Round public currentRound;
    mapping(uint256 => Round) public rounds;
    // Bets tracking
    mapping(uint256 => mapping(address => Bet)) public roundBets; // roundId => player => bet
    mapping(uint256 => address[]) public roundPlayers; // roundId => players array
    // Server operator (trusted for crash point generation)
    address public serverOperator;
    // House balance for payouts (in USDC)
    uint256 public houseBalance;

    // ============ Events ============
    event RoundStarted(
        uint256 indexed roundId,
        uint256 startTime,
        bytes32 serverSeedHash
    );
    event BetPlaced(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount
    );
    event CashOut(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount,
        uint256 multiplier,
        uint256 payout
    );
    event RoundFlying(uint256 indexed roundId, uint256 flyStartTime);
    event RoundCrashed(uint256 indexed roundId, uint256 crashMultiplier);
    event RoundSettled(
        uint256 indexed roundId,
        uint256 totalBets,
        uint256 totalPayouts
    );
    event HouseBalanceUpdated(uint256 newBalance);
    event ServerOperatorUpdated(address indexed newOperator);

    // Snapshot event and storage for on-chain attestation
    event RoundSnapshot(
        uint256 indexed roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint256 totalBets,
        uint256 totalPayouts,
        uint32 numPlayers
    );

    struct RoundSnapshotData {
        bytes32 snapshotHash;
        bytes32 playersMerkleRoot;
        uint256 totalBets;
        uint256 totalPayouts;
        uint32 numPlayers;
    }

    mapping(uint256 => RoundSnapshotData) public roundSnapshots;

    // ============ Errors ============
    error InvalidBetAmount();
    error WrongGamePhase();
    error BetAlreadyPlaced();
    error NoBetPlaced();
    error AlreadyCashedOut();
    error InsufficientHouseBalance();
    error RoundNotSettled();
    error InvalidMultiplier();
    error Unauthorized();
    error InvalidCrashMultiplier();
    error InvalidServerSeed();
    error TransferFailed();

    // ============ Modifiers ============
    modifier onlyServerOperator() {
        _onlyServerOperator();
        _;
    }

    // ============ Constructor ============
    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        usdcToken = IERC20(_usdcToken);
        serverOperator = msg.sender;
        _startNewRound();
    }

    // ============ Core Game Functions ============
    function placeBet(uint256 betAmount) external nonReentrant whenNotPaused {
        if (currentRound.phase != GamePhase.BETTING) revert WrongGamePhase();
        if (betAmount < MIN_BET || betAmount > MAX_BET)
            revert InvalidBetAmount();
        if (roundBets[currentRoundId][msg.sender].amount > 0)
            revert BetAlreadyPlaced();

        // Transfer USDC from player to contract
        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            betAmount
        );
        if (!success) revert TransferFailed();

        // Record bet
        roundBets[currentRoundId][msg.sender] = Bet({
            amount: betAmount,
            cashoutMultiplier: 0,
            settled: false
        });

        roundPlayers[currentRoundId].push(msg.sender);
        currentRound.totalBets += betAmount;

        emit BetPlaced(currentRoundId, msg.sender, betAmount);

        // Auto-start countdown if first bet
        if (roundPlayers[currentRoundId].length == 1) {
            currentRound.startTime = block.timestamp;
        }
    }

    function cashOut(uint256 multiplier) external nonReentrant whenNotPaused {
        if (currentRound.phase != GamePhase.FLYING) revert WrongGamePhase();

        Bet storage bet = roundBets[currentRoundId][msg.sender];
        if (bet.amount == 0) revert NoBetPlaced();
        if (bet.cashoutMultiplier > 0) revert AlreadyCashedOut();
        if (multiplier < MIN_MULTIPLIER) revert InvalidMultiplier();

        // Calculate payout
        uint256 payout = (bet.amount * multiplier) / 100;
        if (payout > houseBalance) revert InsufficientHouseBalance();

        // Record cashout
        bet.cashoutMultiplier = multiplier;
        bet.settled = true;
        currentRound.totalPayouts += payout;
        houseBalance -= payout;

        // Transfer winnings in USDC
        bool success = usdcToken.transfer(msg.sender, payout);
        if (!success) revert TransferFailed();

        emit CashOut(
            currentRoundId,
            msg.sender,
            bet.amount,
            multiplier,
            payout
        );
    }

    function startFlying(
        bytes32 serverSeedHash
    ) external onlyServerOperator whenNotPaused {
        if (currentRound.phase != GamePhase.BETTING) revert WrongGamePhase();
        if (serverSeedHash == bytes32(0)) revert InvalidServerSeed();

        // Transition to flying
        currentRound.phase = GamePhase.FLYING;
        currentRound.flyStartTime = block.timestamp;
        currentRound.serverSeedHash = serverSeedHash;

        emit RoundFlying(currentRoundId, block.timestamp);
    }

    function crashRound(
        uint256 crashMultiplier,
        string calldata serverSeed
    ) external onlyServerOperator whenNotPaused {
        if (currentRound.phase != GamePhase.FLYING) revert WrongGamePhase();
        if (
            crashMultiplier < MIN_MULTIPLIER || crashMultiplier > MAX_MULTIPLIER
        ) {
            revert InvalidCrashMultiplier();
        }

        bytes32 seedHash;
        assembly {
            // Get a free memory pointer
            let ptr := mload(0x40)
            // Copy the calldata string to memory
            calldatacopy(ptr, serverSeed.offset, serverSeed.length)
            // Hash the data directly
            seedHash := keccak256(ptr, serverSeed.length)
        }

        if (seedHash != currentRound.serverSeedHash) revert InvalidServerSeed();

        currentRound.phase = GamePhase.CRASHED;
        currentRound.crashMultiplier = crashMultiplier;

        emit RoundCrashed(currentRoundId, crashMultiplier);
    }

    function settleRound() external nonReentrant whenNotPaused {
        if (currentRound.phase != GamePhase.CRASHED) revert WrongGamePhase();
        if (currentRound.settled) revert RoundNotSettled();

        currentRound.settled = true;
        address[] memory players = roundPlayers[currentRoundId];

        // Settle all unsettled bets (they lost)
        for (uint256 i = 0; i < players.length; i++) {
            Bet storage bet = roundBets[currentRoundId][players[i]];
            if (!bet.settled) {
                bet.settled = true;
                houseBalance += bet.amount;
            }
        }

        emit RoundSettled(
            currentRoundId,
            currentRound.totalBets,
            currentRound.totalPayouts
        );

        // Start new round
        _startNewRound();
    }

    function getPlayerBet(
        uint256 roundId,
        address player
    )
        external
        view
        returns (uint256 amount, uint256 cashoutMultiplier, bool settled)
    {
        Bet memory bet = roundBets[roundId][player];
        return (bet.amount, bet.cashoutMultiplier, bet.settled);
    }

    function getRoundPlayers() external view returns (address[] memory) {
        return roundPlayers[currentRoundId];
    }

    function getRoundHistory(
        uint256 roundId
    )
        external
        view
        returns (
            uint256 id,
            uint256 crashMultiplier,
            bytes32 serverSeedHash,
            uint256 totalBets,
            uint256 totalPayouts,
            bool settled
        )
    {
        Round memory round = rounds[roundId];
        return (
            round.roundId,
            round.crashMultiplier,
            round.serverSeedHash,
            round.totalBets,
            round.totalPayouts,
            round.settled
        );
    }

    // ============ Admin Functions ============
    function setServerOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid address");
        serverOperator = newOperator;
        emit ServerOperatorUpdated(newOperator);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundHouse(uint256 amount) external onlyOwner {
        bool success = usdcToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        houseBalance += amount;
        emit HouseBalanceUpdated(houseBalance);
    }

    function withdrawHouseProfits(uint256 amount) external onlyOwner {
        require(amount <= houseBalance, "Insufficient balance");
        houseBalance -= amount;

        bool success = usdcToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();

        emit HouseBalanceUpdated(houseBalance);
    }

    // ============ Internal Functions ============
    function _startNewRound() internal {
        currentRoundId++;

        currentRound = Round({
            roundId: currentRoundId,
            phase: GamePhase.BETTING,
            startTime: 0,
            flyStartTime: 0,
            crashMultiplier: 0,
            serverSeedHash: bytes32(0),
            totalBets: 0,
            totalPayouts: 0,
            settled: false
        });

        rounds[currentRoundId] = currentRound;

        emit RoundStarted(currentRoundId, block.timestamp, bytes32(0));
    }

    function _onlyServerOperator() internal view {
        if (msg.sender != serverOperator) revert Unauthorized();
    }

    // ============ Snapshot Functions ============
    /// @notice Submit a compact snapshot of a settled round for on-chain attestation
    /// @dev The snapshotHash should be computed as keccak256(abi.encodePacked(roundId, serverSeedHash, crashMultiplier, totalBets, totalPayouts, playersMerkleRoot, numPlayers))
    function snapshotRound(
        uint256 roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint256 totalBets,
        uint256 totalPayouts,
        uint32 numPlayers
    ) external onlyServerOperator whenNotPaused {
        Round memory r = rounds[roundId];
        if (r.roundId == 0) revert RoundNotSettled();

        // store snapshot and emit event
        roundSnapshots[roundId] = RoundSnapshotData({
            snapshotHash: snapshotHash,
            playersMerkleRoot: playersMerkleRoot,
            totalBets: totalBets,
            totalPayouts: totalPayouts,
            numPlayers: numPlayers
        });

        emit RoundSnapshot(
            roundId,
            snapshotHash,
            playersMerkleRoot,
            totalBets,
            totalPayouts,
            numPlayers
        );
    }
}
