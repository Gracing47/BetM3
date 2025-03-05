// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title NoLossBetMulti
 * @dev Multi-participant "No Loss" betting contract with a resolution phase. 
 * Participants (including the creator) place stakes on either "true" or "false."
 *
 * After the bet expires, everyone can cast a resolution vote during a 24-hour period,
 * weighted by their stake. If one outcome reaches or exceeds 80% of the total stake, 
 * the bet auto-resolves, distributing a simulated yield (e.g., 5% or 20%) using an 80/20 distribution principle:
 *  - 80% of the yield goes to participants on the winning side,
 *  - 20% to participants on the losing side (hence "no loss").
 * 
 * If no such supermajority is reached, the owner can finalize the outcome manually or cancel the bet 
 * (refunding stakes and retaining the yield in the contract).
 */
contract NoLossBetMulti is Ownable, ReentrancyGuard {
    // Represents the data for a single bet
    struct Bet {
        address creator;
        string condition;                // Description/question of the bet
        uint256 expiration;              // When the betting period ends
        bool resolved;                   // Whether the bet is finalized

        // Total stakes on each side
        uint256 totalStakeTrue;
        uint256 totalStakeFalse;

        // Weighted sum of votes submitted during resolution
        uint256 resolutionTrueWeight;
        uint256 resolutionFalseWeight;

        // Finalization status & outcome
        bool resolutionFinalized;
        bool winningOutcome;

        // Mappings to store individual stakes
        mapping(address => uint256) stakeOnTrue;
        mapping(address => uint256) stakeOnFalse;

        // Arrays tracking all participants who joined each side
        address[] participantsTrue;
        address[] participantsFalse;

        // Tracks which addresses have already voted in the resolution phase
        mapping(address => bool) resolutionVoted;
    }

    // Storage of all bets by ID
    mapping(uint256 => Bet) private bets;
    uint256 public betCounter;

    // The ERC20 token used for staking and payouts
    IERC20 public token;

    // Configuration parameters
    uint256 public constant DEFAULT_BET_DURATION = 7 days;      // Default length of a bet
    uint256 public constant MIN_STAKE = 10 * 10**18;            // Minimum stake, e.g. 10 tokens
    uint256 public constant RESOLUTION_PERIOD = 24 hours;       // Time window to cast resolution votes

    // Simulated yield rate (e.g. 5% by default) — can be changed by the owner
    uint256 public yieldRate = 5;

    // Events
    event BetCreated(
        uint256 indexed betId,
        address indexed creator,
        string condition,
        uint256 expiration,
        bool creatorPrediction,
        uint256 creatorStake
    );
    event BetJoined(
        uint256 indexed betId,
        address indexed participant,
        bool prediction,
        uint256 stake
    );
    event ResolutionVoteSubmitted(
        uint256 indexed betId,
        address indexed participant,
        bool outcome,
        uint256 voteWeight
    );
    event BetResolved(
        uint256 indexed betId,
        bool winningOutcome,
        uint256 simulatedYield
    );
    event BetResolutionCancelled(uint256 indexed betId);

    /**
     * @dev Constructor sets the ERC20 token to be used for staking.
     * @param _token Address of the ERC20 token contract.
     */
    constructor(address _token) {
        token = IERC20(_token);
    }

    /**
     * @dev Creates a new bet.
     * @param _stake The creator's stake (must be >= MIN_STAKE).
     * @param _condition A short description of the bet (e.g., "Will Chelsea win on Saturday?").
     * @param _durationDays Duration in days before the bet expires (0 => DEFAULT_BET_DURATION).
     * @param _creatorPrediction True/False for the creator's prediction.
     */
    function createBet(
        uint256 _stake,
        string calldata _condition,
        uint256 _durationDays,
        bool _creatorPrediction
    ) external {
        require(_stake >= MIN_STAKE, "Stake is below minimum requirement");
        require(token.transferFrom(msg.sender, address(this), _stake), "Token transfer for stake failed");

        uint256 duration = _durationDays > 0 ? _durationDays * 1 days : DEFAULT_BET_DURATION;
        uint256 expirationTime = block.timestamp + duration;

        Bet storage b = bets[betCounter];
        b.creator = msg.sender;
        b.condition = _condition;
        b.expiration = expirationTime;
        b.resolved = false;
        b.resolutionFinalized = false;

        // Record the creator's stake on the chosen side
        if (_creatorPrediction) {
            b.totalStakeTrue = _stake;
            b.stakeOnTrue[msg.sender] = _stake;
            b.participantsTrue.push(msg.sender);
        } else {
            b.totalStakeFalse = _stake;
            b.stakeOnFalse[msg.sender] = _stake;
            b.participantsFalse.push(msg.sender);
        }

        emit BetCreated(betCounter, msg.sender, _condition, expirationTime, _creatorPrediction, _stake);
        betCounter++;
    }

    /**
     * @dev Allows any address to join an existing bet by placing a stake on true or false.
     * @param _betId The ID of the bet.
     * @param _stake The amount the participant stakes (must be >= MIN_STAKE).
     * @param _prediction The participant's prediction (true or false).
     */
    function joinBet(
        uint256 _betId,
        uint256 _stake,
        bool _prediction
    ) external {
        require(_stake >= MIN_STAKE, "Stake is below minimum requirement");

        Bet storage b = bets[_betId];
        require(block.timestamp < b.expiration, "Bet has already expired");
        require(!b.resolved, "Bet is already resolved");

        // Ensure the participant hasn't already joined
        require(b.stakeOnTrue[msg.sender] == 0 && b.stakeOnFalse[msg.sender] == 0, "Participant already joined");

        // Transfer stake
        require(token.transferFrom(msg.sender, address(this), _stake), "Token transfer for stake failed");

        // Update bet state
        if (_prediction) {
            b.stakeOnTrue[msg.sender] = _stake;
            b.participantsTrue.push(msg.sender);
            b.totalStakeTrue += _stake;
        } else {
            b.stakeOnFalse[msg.sender] = _stake;
            b.participantsFalse.push(msg.sender);
            b.totalStakeFalse += _stake;
        }

        emit BetJoined(_betId, msg.sender, _prediction, _stake);
    }

    /**
     * @dev Returns the total stake that a participant has contributed to a specific bet.
     * @param _betId The ID of the bet.
     * @param _participant The participant address to query.
     */
    function getParticipantStake(uint256 _betId, address _participant) public view returns (uint256) {
        Bet storage b = bets[_betId];
        return b.stakeOnTrue[_participant] + b.stakeOnFalse[_participant];
    }

    /**
     * @dev Submit a resolution vote (true or false) during the resolution phase.
     * - Only valid after the bet has expired and before RESOLUTION_PERIOD ends.
     * - Participants must vote for the side they originally joined (true or false).
     */
    function submitResolutionOutcome(uint256 _betId, bool _outcome) external {
        Bet storage b = bets[_betId];
        require(block.timestamp >= b.expiration, "Bet is not expired yet");
        require(block.timestamp < b.expiration + RESOLUTION_PERIOD, "Resolution period is over");
        require(!b.resolutionFinalized, "Resolution has already been finalized");
        require(getParticipantStake(_betId, msg.sender) > 0, "Sender is not a participant");
        require(!b.resolutionVoted[msg.sender], "Participant already voted");

        if (b.stakeOnTrue[msg.sender] > 0) {
            // Must vote "true" if you joined the "true" side
            require(_outcome == true, "Must vote 'true' because you joined the 'true' side");
            uint256 voteWeight = b.stakeOnTrue[msg.sender];
            b.resolutionTrueWeight += voteWeight;
            emit ResolutionVoteSubmitted(_betId, msg.sender, true, voteWeight);
        } else {
            // Must vote "false" if you joined the "false" side
            require(_outcome == false, "Must vote 'false' because you joined the 'false' side");
            uint256 voteWeight = b.stakeOnFalse[msg.sender];
            b.resolutionFalseWeight += voteWeight;
            emit ResolutionVoteSubmitted(_betId, msg.sender, false, voteWeight);
        }

        b.resolutionVoted[msg.sender] = true;
    }

    /**
     * @dev Anyone can call this function after the resolution phase has ended. 
     * It checks if there's a supermajority outcome (at least 80% of total stake). 
     * If yes, the bet auto-resolves. If no supermajority, it reverts, requiring admin fallback.
     */
    function finalizeResolution(uint256 _betId) external nonReentrant {
        Bet storage b = bets[_betId];
        require(block.timestamp >= b.expiration + RESOLUTION_PERIOD, "Resolution period is not finished yet");
        require(!b.resolutionFinalized, "Resolution has already been finalized");

        uint256 totalVotes = b.totalStakeTrue + b.totalStakeFalse;
        uint256 threshold = (totalVotes * 80) / 100; // 80% threshold

        if (b.resolutionTrueWeight >= threshold) {
            _resolveBet(_betId, true);
        } else if (b.resolutionFalseWeight >= threshold) {
            _resolveBet(_betId, false);
        } else {
            // No supermajority => Admin must intervene
            revert("No supermajority reached; admin resolution required");
        }
    }

    /**
     * @dev Admin fallback: the contract owner can finalize the resolution if no supermajority is reached,
     * or if manual intervention is needed for other reasons. 
     * - If _cancel == true, all stakes are refunded, and no yield is distributed.
     * - Otherwise, the admin forces a winning outcome, distributing the yield.
     */
    function adminFinalizeResolution(uint256 _betId, bool _winningOutcome, bool _cancel) external onlyOwner nonReentrant {
        Bet storage b = bets[_betId];
        require(!b.resolutionFinalized, "Resolution has already been finalized");

        if (_cancel) {
            _cancelBet(_betId);
        } else {
            _resolveBet(_betId, _winningOutcome);
        }
    }

    /**
     * @dev Internal function that resolves a bet and distributes stake + yield.
     * The yield is a simulated rate (yieldRate%), 80% going to the winners and 20% to the losers.
     */
    function _resolveBet(uint256 _betId, bool _winningOutcome) internal {
        Bet storage b = bets[_betId];
        b.resolutionFinalized = true;
        b.resolved = true;
        b.winningOutcome = _winningOutcome;

        uint256 totalStake = b.totalStakeTrue + b.totalStakeFalse;
        uint256 simulatedYield = (totalStake * yieldRate) / 100;

        // This distribution requires the contract to hold enough extra tokens to cover the yield.
        // If insufficient tokens exist, transfers may fail and revert the transaction.
        if (_winningOutcome) {
            // Winners: the "true" side
            uint256 yieldForWinners = (simulatedYield * 80) / 100;
            uint256 yieldForLosers = simulatedYield - yieldForWinners;
            uint256 totalWinning = b.totalStakeTrue;

            // Distribute to winners (true side)
            for (uint256 i = 0; i < b.participantsTrue.length; i++) {
                address user = b.participantsTrue[i];
                uint256 userStake = b.stakeOnTrue[user];
                if (userStake > 0) {
                    uint256 bonus = (userStake * yieldForWinners) / totalWinning;
                    uint256 payout = userStake + bonus; 
                    require(token.transfer(user, payout), "Transfer to true-side winner failed");
                }
            }

            // Distribute yield to losers (false side), preserving 'no loss'
            if (b.totalStakeFalse > 0) {
                for (uint256 i = 0; i < b.participantsFalse.length; i++) {
                    address user = b.participantsFalse[i];
                    uint256 userStake = b.stakeOnFalse[user];
                    if (userStake > 0) {
                        uint256 bonus = (userStake * yieldForLosers) / b.totalStakeFalse;
                        uint256 payout = userStake + bonus;
                        require(token.transfer(user, payout), "Transfer to false-side loser failed");
                    }
                }
            }
        } else {
            // Winners: the "false" side
            uint256 yieldForWinners = (simulatedYield * 80) / 100;
            uint256 yieldForLosers = simulatedYield - yieldForWinners;
            uint256 totalWinning = b.totalStakeFalse;

            // Distribute to winners (false side)
            for (uint256 i = 0; i < b.participantsFalse.length; i++) {
                address user = b.participantsFalse[i];
                uint256 userStake = b.stakeOnFalse[user];
                if (userStake > 0) {
                    uint256 bonus = (userStake * yieldForWinners) / totalWinning;
                    uint256 payout = userStake + bonus;
                    require(token.transfer(user, payout), "Transfer to false-side winner failed");
                }
            }

            // Distribute yield to losers (true side)
            if (b.totalStakeTrue > 0) {
                for (uint256 i = 0; i < b.participantsTrue.length; i++) {
                    address user = b.participantsTrue[i];
                    uint256 userStake = b.stakeOnTrue[user];
                    if (userStake > 0) {
                        uint256 bonus = (userStake * yieldForLosers) / b.totalStakeTrue;
                        uint256 payout = userStake + bonus;
                        require(token.transfer(user, payout), "Transfer to true-side loser failed");
                    }
                }
            }
        }

        emit BetResolved(_betId, _winningOutcome, simulatedYield);
    }

    /**
     * @dev Internal function to cancel the bet: refund all stakes, no yield distribution.
     */
    function _cancelBet(uint256 _betId) internal {
        Bet storage b = bets[_betId];
        b.resolutionFinalized = true;
        b.resolved = true;

        // Refund all stakes
        for (uint256 i = 0; i < b.participantsTrue.length; i++) {
            address user = b.participantsTrue[i];
            uint256 userStake = b.stakeOnTrue[user];
            if (userStake > 0) {
                require(token.transfer(user, userStake), "Refund to true-side participant failed");
            }
        }
        for (uint256 i = 0; i < b.participantsFalse.length; i++) {
            address user = b.participantsFalse[i];
            uint256 userStake = b.stakeOnFalse[user];
            if (userStake > 0) {
                require(token.transfer(user, userStake), "Refund to false-side participant failed");
            }
        }

        emit BetResolutionCancelled(_betId);
    }

    /**
     * @dev Updates the yield rate (in %). Only the contract owner can do this.
     */
    function setYieldRate(uint256 _yieldRate) external onlyOwner {
        yieldRate = _yieldRate;
    }

    /**
     * @dev Returns basic details for a given bet (excluding participant mappings).
     */
    function getBetDetails(uint256 _betId)
        external
        view
        returns (
            address creator,
            string memory condition,
            uint256 expiration,
            bool resolved,
            uint256 totalStakeTrue,
            uint256 totalStakeFalse,
            bool resolutionFinalized,
            bool winningOutcome
        )
    {
        Bet storage b = bets[_betId];
        return (
            b.creator,
            b.condition,
            b.expiration,
            b.resolved,
            b.totalStakeTrue,
            b.totalStakeFalse,
            b.resolutionFinalized,
            b.winningOutcome
        );
    }
}
