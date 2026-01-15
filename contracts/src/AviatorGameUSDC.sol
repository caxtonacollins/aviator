// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AviatorGameUSDC
 * @dev Crash game with USDC payments and ERC-4337 compatibility
 * @notice Players bet USDC tokens before each round, multiplier increases until crash
 */
contract AviatorGameUSDC is ReentrancyGuard, Ownable, Pausable {
    // ============ State Variables ============

    // Token Configuration
    IERC20 public usdcToken;
    uint256 public constant MIN_BET = 1e6; // 1 USDC (6 decimals)
    uint256 public constant MAX_BET = 10000e6; // 10,000 USDC
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
        address player;
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

    // Player statistics
    mapping(address => PlayerStats) public playerStats;

    // Server operator (trusted for crash point generation)
    address public serverOperator;

    // House balance for payouts (in USDC)
    uint256 public houseBalance;

    // Entrypoint for ERC-4337
    address public entryPoint;

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

    constructor(address _usdcToken, address _entryPoint) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC token address");
        usdcToken = IERC20(_usdcToken);
        serverOperator = msg.sender;
        entryPoint = _entryPoint;
        _startNewRound();
    }

    // ============ Core Game Functions ============

    /**
     * @notice Place a bet for the current round
     * @dev Player must approve contract to transfer USDC tokens first
     */
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
            player: msg.sender,
            amount: betAmount,
            cashoutMultiplier: 0,
            settled: false
        });

        roundPlayers[currentRoundId].push(msg.sender);
        currentRound.totalBets += betAmount;

        // Update player stats
        playerStats[msg.sender].totalWagered += betAmount;
        playerStats[msg.sender].gamesPlayed++;

        emit BetPlaced(currentRoundId, msg.sender, betAmount);

        // Auto-start countdown if first bet
        if (roundPlayers[currentRoundId].length == 1) {
            currentRound.startTime = block.timestamp;
        }
    }

    /**
     * @notice Cash out at current multiplier (only during flying phase)
     * @param multiplier The multiplier to cash out at (scaled by 100)
     */
    function cashOut(uint256 multiplier) external nonReentrant whenNotPaused {
        if (currentRound.phase != GamePhase.FLYING) revert WrongGamePhase();

        Bet storage bet = roundBets[currentRoundId][msg.sender];
        if (bet.amount == 0) revert NoBetPlaced();
        if (bet.cashoutMultiplier > 0) revert AlreadyCashedOut();
        if (multiplier < MIN_MULTIPLIER) revert InvalidMultiplier();

        // Check if multiplier is reasonable (not in the future)
        uint256 currentMultiplier = _getCurrentMultiplier();
        if (multiplier > currentMultiplier) revert InvalidMultiplier();

        // Calculate payout
        uint256 payout = (bet.amount * multiplier) / 100;
        if (payout > houseBalance) revert InsufficientHouseBalance();

        // Record cashout
        bet.cashoutMultiplier = multiplier;
        bet.settled = true;
        currentRound.totalPayouts += payout;
        houseBalance -= payout;

        // Update player stats
        uint256 profit = payout - bet.amount;
        playerStats[msg.sender].totalWon += payout;
        if (profit > playerStats[msg.sender].biggestWin) {
            playerStats[msg.sender].biggestWin = profit;
        }

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

    /**
     * @notice Start flying phase (called by server after betting ends)
     * @param serverSeedHash Hash of the server seed used to generate crash point
     */
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

    /**
     * @notice End round with crash (called by server)
     * @param crashMultiplier The crash multiplier (scaled by 100)
     * @param serverSeed The server seed (revealed after crash)
     */
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

    // Mark as crashed
    currentRound.phase = GamePhase.CRASHED;
    currentRound.crashMultiplier = crashMultiplier;

    emit RoundCrashed(currentRoundId, crashMultiplier);
}

    /**
     * @notice Settle the round and start new one
     */
    function settleRound() external nonReentrant whenNotPaused {
        if (currentRound.phase != GamePhase.CRASHED) revert WrongGamePhase();
        if (currentRound.settled) revert RoundNotSettled();

        currentRound.settled = true;

        // Settle all unsettled bets (they lost)
        address[] memory players = roundPlayers[currentRoundId];
        for (uint256 i = 0; i < players.length; i++) {
            Bet storage bet = roundBets[currentRoundId][players[i]];
            if (!bet.settled) {
                bet.settled = true;
                // Bet amount goes to house
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

    // ============ Internal Functions ============

    /**
     * @notice Calculate current multiplier based on time elapsed
     */
    function _getCurrentMultiplier() internal view returns (uint256) {
        if (currentRound.phase != GamePhase.FLYING) return 100;

        uint256 elapsed = block.timestamp - currentRound.flyStartTime;

        // Exponential growth formula: 1.0 + (time^1.5 / 5)
        // Scaled by 100 for precision
        uint256 timeSquared = elapsed * elapsed;
        uint256 growth = (timeSquared * 20) / 1000;

        uint256 multiplier = 100 + growth;

        if (multiplier > MAX_MULTIPLIER) return MAX_MULTIPLIER;
        return multiplier;
    }

    /**
     * @notice Start a new round
     */
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

    // ============ View Functions ============

    /**
     * @notice Get current round information
     */
    function getCurrentRound()
        external
        view
        returns (
            uint256 roundId,
            GamePhase phase,
            uint256 startTime,
            uint256 flyStartTime,
            uint256 crashMultiplier,
            uint256 currentMultiplier,
            uint256 totalBets,
            uint256 totalPayouts
        )
    {
        return (
            currentRound.roundId,
            currentRound.phase,
            currentRound.startTime,
            currentRound.flyStartTime,
            currentRound.crashMultiplier,
            _getCurrentMultiplier(),
            currentRound.totalBets,
            currentRound.totalPayouts
        );
    }

    /**
     * @notice Get player's bet for current round
     */
    function getMyBet()
        external
        view
        returns (uint256 amount, uint256 cashoutMultiplier, bool settled)
    {
        Bet memory bet = roundBets[currentRoundId][msg.sender];
        return (bet.amount, bet.cashoutMultiplier, bet.settled);
    }

    /**
     * @notice Get player's bet for specific round
     */
    function getBet(
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

    /**
     * @notice Get player statistics
     */
    function getPlayerStats(
        address player
    )
        external
        view
        returns (
            uint256 totalWagered,
            uint256 totalWon,
            uint256 gamesPlayed,
            uint256 biggestWin
        )
    {
        PlayerStats memory stats = playerStats[player];
        return (
            stats.totalWagered,
            stats.totalWon,
            stats.gamesPlayed,
            stats.biggestWin
        );
    }

    /**
     * @notice Get all players in current round
     */
    function getRoundPlayers() external view returns (address[] memory) {
        return roundPlayers[currentRoundId];
    }

    /**
     * @notice Get round history
     */
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

    /**
     * @notice Set server operator address
     */
    function setServerOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid address");
        serverOperator = newOperator;
        emit ServerOperatorUpdated(newOperator);
    }

    /**
     * @notice Fund house balance with USDC
     */
    function fundHouse(uint256 amount) external onlyOwner {
        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        houseBalance += amount;
        emit HouseBalanceUpdated(houseBalance);
    }

    /**
     * @notice Withdraw house profits
     */
    function withdrawHouseProfits(uint256 amount) external onlyOwner {
        require(amount <= houseBalance, "Insufficient balance");
        houseBalance -= amount;

        bool success = usdcToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();

        emit HouseBalanceUpdated(houseBalance);
    }

    /**
     * @notice Pause the game
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the game
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw (only if paused and no active round)
     */
    function emergencyWithdraw() external onlyOwner {
        require(paused(), "Must be paused");
        require(
            currentRound.phase == GamePhase.BETTING &&
                currentRound.totalBets == 0,
            "Active round exists"
        );

        uint256 balance = usdcToken.balanceOf(address(this));
        bool success = usdcToken.transfer(owner(), balance);
        if (!success) revert TransferFailed();
    }

    function _onlyServerOperator() internal view {
        if (msg.sender != serverOperator) revert Unauthorized();
    }
}
