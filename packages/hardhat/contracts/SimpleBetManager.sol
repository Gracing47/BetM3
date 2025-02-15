// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleBetManager
 * @dev Manages betting between two parties (simplified version without yield generation)
 */
contract SimpleBetManager is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // Token-Interfaces
    IERC20 public celoToken;
    IERC20 public bm3Token;

    // New struct supporting multi-participant bets
    struct Bet {
        uint256 id;
        address creator;
        uint256 betStart;
        uint256 betEnd;
        uint256 totalStake;
        bool settled;
        address[] participants;
        // Mapping to track each participant's stake within this bet
        mapping(address => uint256) stakes;
    }

    // Mapping to store bets by ID
    mapping(uint256 => Bet) private bets;

    // Counter for unique bet IDs
    uint256 public betCounter;

    // Mapping: betId => (participant => claimed reward flag)
    mapping(uint256 => mapping(address => bool)) public rewardClaimed;

    // Mapping: betId => (participant => reward amount)
    mapping(uint256 => mapping(address => uint256)) public betRewards;

    // Events
    event BetCreated(uint256 indexed betId, address indexed creator, uint256 duration);
    event BetJoined(uint256 indexed betId, address indexed participant, uint256 amount);
    event BetSettled(uint256 indexed betId, uint256 totalReward);
    event RewardClaimed(uint256 indexed betId, address indexed participant, uint256 amount);

    /**
     * @dev Konstruktor erwartet die Adressen des CELO- und BM3-Tokens.
     */
    constructor(address _celoToken, address _bm3Token) {
        celoToken = IERC20(_celoToken);
        bm3Token = IERC20(_bm3Token);
    }

    /**
     * @dev Create a new bet with a specific duration (in seconds).
     * The bet receives a unique ID and initial parameters.
     * @param _duration Duration (in seconds) from now until the bet ends.
     * @return betId Unique ID of the created bet.
     */
    function createBet(uint256 _duration) external whenNotPaused returns (uint256) {
        require(_duration > 0, "Duration must be > 0");
        uint256 betId = betCounter;
        betCounter++;
        // Initialize bet in storage
        Bet storage newBet = bets[betId];
        newBet.id = betId;
        newBet.creator = msg.sender;
        newBet.betStart = block.timestamp;
        newBet.betEnd = block.timestamp + _duration;
        newBet.totalStake = 0;
        newBet.settled = false;
        // Add creator as initial participant with a 0 stake (they can join separately)
        newBet.participants.push(msg.sender);
        newBet.stakes[msg.sender] = 0;
        return betId;
    }

    /**
     * @dev Join an existing bet by staking a specified amount of CELO tokens.
     * The amount is transferred from the participant to the contract.
     * @param _betId ID of the bet to join.
     * @param _amount Amount of CELO tokens to stake.
     */
    function joinBet(uint256 _betId, uint256 _amount) external nonReentrant whenNotPaused {
        Bet storage bet = bets[_betId];
        require(block.timestamp < bet.betEnd, "Betting period has ended");
        require(!bet.settled, "Bet already settled");
        require(_amount > 0, "Stake must be greater than 0");

        // Transfer CELO tokens from the participant to the contract
        require(celoToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        // If participant is new to this bet, add them to the participants list
        if (bet.stakes[msg.sender] == 0) {
            bet.participants.push(msg.sender);
        }
        // Update participant's stake and aggregate bet total
        bet.stakes[msg.sender] += _amount;
        bet.totalStake += _amount;
        emit BetJoined(_betId, msg.sender, _amount);
    }

    /**
     * @dev Settle a bet after its end time.
     * Distributes rewards from the pooled stakes plus a 20% yield.
     * Reward pool = totalStake + (20% of totalStake). Each participant's reward is proportional to their stake.
     * Requires that sufficient funds (including yield funds) are available in the contract.
     * @param _betId ID of the bet to settle.
     */
    function settleBet(uint256 _betId) external nonReentrant whenNotPaused {
        Bet storage bet = bets[_betId];
        require(block.timestamp >= bet.betEnd, "Bet is still active");
        require(!bet.settled, "Bet already settled");
        require(bet.totalStake > 0, "No stakes in this bet");

        // Calculate reward pool = totalStake + 20% yield
        uint256 rewardPool = bet.totalStake + ((bet.totalStake * 20) / 100);
        // Ensure the contract holds enough CELO tokens to pay out rewards
        require(celoToken.balanceOf(address(this)) >= rewardPool, "Insufficient funds for rewards");

        // Distribute rewards proportionally to each participant
        for (uint i = 0; i < bet.participants.length; i++) {
            address participant = bet.participants[i];
            uint256 stake = bet.stakes[participant];
            if (stake > 0) {
                uint256 reward = (stake * rewardPool) / bet.totalStake;
                betRewards[_betId][participant] = reward;
            }
        }
        bet.settled = true;
    }

    /**
     * @dev Claim the reward for a specific settled bet.
     * Each participant can claim only once.
     * @param _betId ID of the bet for which to claim the reward.
     */
    function claimReward(uint256 _betId) external nonReentrant whenNotPaused {
        Bet storage bet = bets[_betId];
        require(bet.settled, "Bet not settled yet");
        require(!rewardClaimed[_betId][msg.sender], "Reward already claimed");

        uint256 reward = betRewards[_betId][msg.sender];
        require(reward > 0, "No reward for caller");

        rewardClaimed[_betId][msg.sender] = true;
        require(celoToken.transfer(msg.sender, reward), "Reward transfer failed");
    }

    /**
     * @dev Allows the owner to deposit extra yield funds into the contract.
     * These additional CELO tokens are used to cover the 20% yield above the total stakes.
     * @param _amount Amount of CELO tokens to deposit.
     */
    function fundYield(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Amount must be greater than 0");
        require(celoToken.transferFrom(msg.sender, address(this), _amount), "Yield funding transfer failed");
    }

    /**
     * @dev Notfallfunktion: Der Owner kann CELO-Token aus dem Contract abziehen.
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(celoToken.transfer(owner(), _amount), "Transfer fehlgeschlagen");
    }

    /**
     * @dev Contract pausieren (Owner only).
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Contract wieder aktivieren (Owner only).
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Returns bet information
     * @param _betId The ID of the bet to query
     * @return id The bet ID
     * @return creator The bet creator's address
     * @return betStart The timestamp when the bet started
     * @return betEnd The timestamp when the bet ends
     * @return totalStake The total amount staked in this bet
     * @return settled Whether the bet has been settled
     */
    function getBet(uint256 _betId) external view returns (uint256 id, address creator, uint256 betStart, uint256 betEnd, uint256 totalStake, bool settled) {
        Bet storage bet = bets[_betId];
        return (bet.id, bet.creator, bet.betStart, bet.betEnd, bet.totalStake, bet.settled);
    }
}
