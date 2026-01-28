// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract AviatorGame is Initializable, UUPSUpgradeable, ReentrancyGuard, OwnableUpgradeable, PausableUpgradeable {
    // ============ State Variables ============

    // Token Configuration
    IERC20 public usdcToken;
    uint256 public constant MIN_BET = 1e5; // 0.04 USDC (6 decimals)
    uint256 public constant MAX_BET = 1000e6; // 1,000 USDC
    
    // Server operator (trusted for game operations)
    address public serverOperator;
    // House balance for payouts (in USDC)
    uint256 public houseBalance;

    // Snapshot storage
    struct RoundSnapshotData {
        bytes32 snapshotHash;
        bytes32 playersMerkleRoot;
        uint96 totalBets;
        uint96 totalPayouts;
        uint32 numPlayers;
    }
    mapping(uint256 => RoundSnapshotData) public roundSnapshots;

    // ============ Events ============
    event BetPlaced(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount
    );
    
    event CashOut(
        uint256 indexed roundId,
        address indexed player,
        uint256 payout,
        uint256 multiplier
    );
    
    event HouseBalanceUpdated(uint256 newBalance);
    event ServerOperatorUpdated(address indexed newOperator);

    // Snapshot event
    event RoundSnapshot(
        uint256 indexed roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint256 totalBets,
        uint256 totalPayouts,
        uint32 numPlayers
    );

    // ============ Errors ============
    error InvalidBetAmount();
    error InsufficientHouseBalance();
    error Unauthorized();
    error TransferFailed();
    error InvalidTokenAddress();
    error InvalidAddress();
    error InsufficientBalance();
    error ETHTransferFailed();

    // ============ Modifiers ============
    modifier onlyServerOperator() {
        if (msg.sender != serverOperator) revert Unauthorized();
        _;
    }

    // ============ Constructor ============
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _usdcToken, address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();

        if (_usdcToken == address(0)) revert InvalidTokenAddress();
        usdcToken = IERC20(_usdcToken);
        serverOperator = initialOwner;
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /// @notice Allows the contract to receive ETH
    receive() external payable {}

    /// @notice Withdraw ETH sent to this contract (e.g. for gas or accidentally sent)
    /// @param to Recipient address
    /// @param amount Amount of ETH to withdraw
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert ETHTransferFailed();
    }

    // ============ Core Game Functions ============

    /**
     * @notice Place a bet on behalf of a player for a specific round.
     * @dev Transfers tokens from player to contract. Backend tracks state.
     */
    function placeBetFor(
        uint256 roundId,
        address player,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyServerOperator {
        if (amount < MIN_BET || amount > MAX_BET)
            revert InvalidBetAmount();

        // Transfer USDC from player to contract
        // Note: The player must have approved the contract to spend this amount
        bool success = usdcToken.transferFrom(player, address(this), amount);
        if (!success) revert TransferFailed();

        houseBalance += amount;
        
        emit BetPlaced(roundId, player, amount);
        emit HouseBalanceUpdated(houseBalance);
    }

    /**
     * @notice Process a cashout (payout) for a player.
     * @dev Transfers tokens from contract to player.
     */
    function cashOutFor(
        uint256 roundId,
        address player,
        uint256 payout,
        uint256 multiplier
    ) external nonReentrant whenNotPaused onlyServerOperator {
        if (payout > houseBalance) revert InsufficientHouseBalance();

        houseBalance -= payout;

        // Transfer winnings in USDC to the player
        bool success = usdcToken.transfer(player, payout);
        if (!success) revert TransferFailed();

        emit CashOut(roundId, player, payout, multiplier);
        emit HouseBalanceUpdated(houseBalance);
    }

    // ============ Admin Functions ============
    function setServerOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidAddress();
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
        if (amount > houseBalance) revert InsufficientBalance();
        houseBalance -= amount;

        bool success = usdcToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();

        emit HouseBalanceUpdated(houseBalance);
    }

    // ============ Snapshot Functions ============
    /// @notice Submit a compact snapshot of a settled round for on-chain attestation
    /// @param totalBets downcast to uint96 to save gas
    /// @param totalPayouts downcast to uint96 to save gas
    function snapshotRound(
        uint256 roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint96 totalBets,
        uint96 totalPayouts,
        uint32 numPlayers
    ) external onlyServerOperator whenNotPaused {
        // Store snapshot and emit event
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
