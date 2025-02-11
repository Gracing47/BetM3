// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IYieldStrategy {
    function depositStake(bytes32 _betId, uint256 _amount) external;
    function withdrawStake(bytes32 _betId) external returns (uint256 yieldAmount);
    function getYieldEstimate(bytes32 _betId) external view returns (uint256);
}

/**
 * @title BetManager
 * @dev Manages no-loss betting where stakes generate yield through Ubeswap
 */
contract BetManager is ReentrancyGuard, Pausable, Ownable {
    // Structs
    struct Bet {
        bytes32 id;
        address creator;
        address[] participants;
        uint256 stakeAmount;
        uint256 totalStaked;
        uint256 yieldGenerated;
        uint256 startTime;
        uint256 endTime;
        BetStatus status;
        string condition;
        address winner;
        mapping(address => bool) hasStaked;
        mapping(address => bool) hasClaimedPrincipal;
    }

    enum BetStatus {
        Created,
        Active,
        Completed,
        Cancelled
    }

    // State variables
    mapping(bytes32 => Bet) public bets;
    IERC20 public stakingToken;
    address public yieldStrategy;

    // Events
    event BetCreated(
        bytes32 indexed betId,
        address indexed creator,
        uint256 stakeAmount,
        uint256 endTime,
        string condition
    );
    event StakeAdded(bytes32 indexed betId, address indexed participant, uint256 amount);
    event BetStarted(bytes32 indexed betId, uint256 totalStaked);
    event BetCompleted(
        bytes32 indexed betId,
        address indexed winner,
        uint256 yieldAmount
    );
    event PrincipalClaimed(bytes32 indexed betId, address indexed participant, uint256 amount);
    event BetCancelled(bytes32 indexed betId);

    // Constructor
    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
    }

    // External functions
    function createBet(
        uint256 _stakeAmount,
        uint256 _duration,
        string calldata _condition
    ) external whenNotPaused returns (bytes32) {
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        
        bytes32 betId = keccak256(
            abi.encodePacked(
                msg.sender,
                block.timestamp,
                _stakeAmount,
                _condition
            )
        );

        Bet storage newBet = bets[betId];
        newBet.id = betId;
        newBet.creator = msg.sender;
        newBet.stakeAmount = _stakeAmount;
        newBet.startTime = block.timestamp;
        newBet.endTime = block.timestamp + _duration;
        newBet.condition = _condition;
        newBet.status = BetStatus.Created;

        emit BetCreated(betId, msg.sender, _stakeAmount, newBet.endTime, _condition);
        return betId;
    }

    function addStake(bytes32 _betId) external whenNotPaused nonReentrant {
        Bet storage bet = bets[_betId];
        require(bet.id == _betId, "Bet does not exist");
        require(bet.status == BetStatus.Created, "Bet is not accepting stakes");
        require(!bet.hasStaked[msg.sender], "Already staked");
        require(
            stakingToken.transferFrom(msg.sender, address(this), bet.stakeAmount),
            "Stake transfer failed"
        );

        bet.participants.push(msg.sender);
        bet.hasStaked[msg.sender] = true;
        bet.totalStaked += bet.stakeAmount;

        emit StakeAdded(_betId, msg.sender, bet.stakeAmount);

        // If we have at least 2 participants, start the bet
        if (bet.participants.length >= 2) {
            bet.status = BetStatus.Active;
            // Transfer funds to yield strategy
            stakingToken.approve(yieldStrategy, bet.totalStaked);
            IYieldStrategy(yieldStrategy).depositStake(_betId, bet.totalStaked);
            emit BetStarted(_betId, bet.totalStaked);
        }
    }

    function completeBet(bytes32 _betId, address _winner) external onlyOwner {
        Bet storage bet = bets[_betId];
        require(bet.id == _betId, "Bet does not exist");
        require(bet.status == BetStatus.Active, "Bet is not active");
        require(block.timestamp >= bet.endTime, "Bet has not ended");
        
        bool isParticipant = false;
        for (uint i = 0; i < bet.participants.length; i++) {
            if (bet.participants[i] == _winner) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Winner must be a participant");

        // Withdraw stake and yield from strategy
        bet.yieldGenerated = IYieldStrategy(yieldStrategy).withdrawStake(_betId);
        bet.status = BetStatus.Completed;
        bet.winner = _winner;

        emit BetCompleted(_betId, _winner, bet.yieldGenerated);
    }

    function claimPrincipal(bytes32 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        require(bet.id == _betId, "Bet does not exist");
        require(
            bet.status == BetStatus.Completed || bet.status == BetStatus.Cancelled,
            "Bet not completed or cancelled"
        );
        require(bet.hasStaked[msg.sender], "Not a participant");
        require(!bet.hasClaimedPrincipal[msg.sender], "Already claimed");

        bet.hasClaimedPrincipal[msg.sender] = true;
        uint256 claimAmount = bet.stakeAmount;
        
        if (bet.status == BetStatus.Completed && msg.sender == bet.winner) {
            claimAmount += bet.yieldGenerated;
        }

        require(
            stakingToken.transfer(msg.sender, claimAmount),
            "Transfer failed"
        );

        emit PrincipalClaimed(_betId, msg.sender, claimAmount);
    }

    // Admin functions
    function setYieldStrategy(address _yieldStrategy) external onlyOwner {
        yieldStrategy = _yieldStrategy;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // View functions
    function getBetParticipants(bytes32 _betId) external view returns (address[] memory) {
        return bets[_betId].participants;
    }

    function getBetDetails(bytes32 _betId)
        external
        view
        returns (
            address creator,
            uint256 stakeAmount,
            uint256 totalStaked,
            uint256 yieldGenerated,
            uint256 startTime,
            uint256 endTime,
            BetStatus status,
            string memory condition,
            address winner
        )
    {
        Bet storage bet = bets[_betId];
        return (
            bet.creator,
            bet.stakeAmount,
            bet.totalStaked,
            bet.yieldGenerated,
            bet.startTime,
            bet.endTime,
            bet.status,
            bet.condition,
            bet.winner
        );
    }
}
