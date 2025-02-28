// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Importing required OpenZeppelin contracts for functionality
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // For CELO token interaction
import "@openzeppelin/contracts/access/Ownable.sol"; // For ownership and restricted functions
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // To prevent reentrancy attacks

/**
 * @title NoLossBet
 * @dev A simplified betting platform where users can create and accept bets using CELO tokens
 * The contract simulates yield generation at a fixed 5% rate for the MVP
 * Both parties get their original stake back, and the winner gets most of the yield
 */
contract NoLossBet is Ownable, ReentrancyGuard {
    // Struct to store all details of a bet
    struct Bet {
        address creator;           // The address of the person who created the bet
        address opponent;          // The address of the person who accepts the bet (initially zero)
        uint256 creatorStake;      // Amount of CELO staked by the creator
        uint256 opponentStake;     // Amount of CELO staked by the opponent
        string condition;          // A string describing the bet's condition (e.g., "Team A wins")
        bool creatorOutcome;       // The creator's submitted outcome (true = win, false = lose)
        bool opponentOutcome;      // The opponent's submitted outcome (true = win, false = lose)
        bool resolved;             // Tracks if the bet has been resolved
        uint256 expiration;        // Unix timestamp when the bet expires
    }

    // Mapping to store bets
    mapping(uint256 => Bet) public bets;

    // Token interface for CELO
    IERC20 public celoToken;

    // Counter for bet IDs
    uint256 public betCounter;

    // Default bet duration (can be overridden when creating a bet)
    uint256 public constant DEFAULT_BET_DURATION = 7 days;
    
    // Minimum stake amounts
    uint256 public constant MIN_CREATOR_STAKE = 10 * 10**18;  // 10 CELO
    uint256 public constant MIN_OPPONENT_STAKE = 10 * 10**18; // 10 CELO

    // Events to log important actions on the blockchain
    event BetCreated(uint256 indexed betId, address indexed creator, uint256 creatorStake, uint256 opponentStake, string condition, uint256 expiration);
    event BetAccepted(uint256 indexed betId, address indexed opponent, bool prediction, uint256 customStake);
    event OutcomeSubmitted(uint256 indexed betId, address indexed submitter, bool outcome);
    event BetResolved(uint256 indexed betId, address indexed winner, uint256 simulatedYield);
    event BetCancelled(uint256 indexed betId);

    /**
     * @dev Constructor sets the CELO token address
     * @param _celoToken Address of the CELO token contract
     */
    constructor(address _celoToken) {
        celoToken = IERC20(_celoToken);
    }

    /**
     * @dev Creates a new bet
     * @param _creatorStake Amount of CELO the creator is staking
     * @param _opponentStake Suggested amount for the opponent to stake
     * @param _condition Description of the bet condition
     * @param _durationDays Number of days until the bet expires (0 for default)
     */
    function createBet(
        uint256 _creatorStake,
        uint256 _opponentStake,
        string calldata _condition,
        uint256 _durationDays
    ) external {
        require(_creatorStake >= MIN_CREATOR_STAKE, "Creator stake too low");
        require(_opponentStake >= MIN_OPPONENT_STAKE, "Opponent stake too low");
        
        // Transfer CELO from creator to contract
        require(celoToken.transferFrom(msg.sender, address(this), _creatorStake), "Stake transfer failed");

        // Calculate expiration time
        uint256 duration = _durationDays > 0 ? _durationDays * 1 days : DEFAULT_BET_DURATION;
        uint256 expirationTime = block.timestamp + duration;

        // Create new bet
        uint256 betId = betCounter++;
        bets[betId] = Bet({
            creator: msg.sender,
            opponent: address(0),
            creatorStake: _creatorStake,
            opponentStake: _opponentStake,
            condition: _condition,
            creatorOutcome: false,
            opponentOutcome: false,
            resolved: false,
            expiration: expirationTime
        });

        emit BetCreated(betId, msg.sender, _creatorStake, _opponentStake, _condition, expirationTime);
    }

    /**
     * @dev Accepts an existing bet
     * @param _betId ID of the bet to accept
     * @param _prediction The opponent's prediction (true/false)
     * @param _customStake Optional custom stake amount (0 to use default)
     */
    function acceptBet(uint256 _betId, bool _prediction, uint256 _customStake) external {
        Bet storage bet = bets[_betId];
        
        require(bet.creator != address(0), "Bet does not exist");
        require(bet.opponent == address(0), "Bet already accepted");
        require(msg.sender != bet.creator, "Creator cannot accept own bet");
        require(block.timestamp < bet.expiration, "Bet has expired");

        // Determine stake amount
        uint256 stakeAmount = _customStake > 0 ? _customStake : bet.opponentStake;
        require(stakeAmount >= MIN_OPPONENT_STAKE, "Stake too low");
        
        // Transfer CELO from opponent to contract
        require(celoToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");

        // Update bet details
        bet.opponent = msg.sender;
        bet.opponentOutcome = _prediction;
        if (_customStake > 0) {
            bet.opponentStake = _customStake;
        }

        emit BetAccepted(_betId, msg.sender, _prediction, stakeAmount);
    }

    /**
     * @dev Submits the outcome of a bet
     * @param _betId ID of the bet
     * @param _outcome The outcome (true/false)
     */
    function submitOutcome(uint256 _betId, bool _outcome) external {
        Bet storage bet = bets[_betId];
        
        require(bet.opponent != address(0), "Bet not accepted yet");
        require(!bet.resolved, "Bet already resolved");
        require(msg.sender == bet.creator || msg.sender == bet.opponent, "Not a participant");

        // Record outcome based on caller
        if (msg.sender == bet.creator) {
            bet.creatorOutcome = _outcome;
        } else {
            bet.opponentOutcome = _outcome;
        }

        emit OutcomeSubmitted(_betId, msg.sender, _outcome);
        
        // Auto-resolve if both parties have submitted matching outcomes
        if (bet.creatorOutcome == bet.opponentOutcome && 
            (bet.creator == msg.sender || bet.opponent == msg.sender)) {
            _resolveBet(_betId);
        }
    }

    /**
     * @dev Resolves a bet when outcomes match or when expired
     * @param _betId ID of the bet to resolve
     */
    function resolveBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        
        require(bet.opponent != address(0), "Bet not accepted yet");
        require(!bet.resolved, "Bet already resolved");
        
        // If expired, resolve differently
        if (block.timestamp >= bet.expiration) {
            _resolveExpiredBet(_betId);
        } else {
            // Both parties must have submitted outcomes and they must match
            require(bet.creatorOutcome == bet.opponentOutcome, "Outcomes don't match");
            _resolveBet(_betId);
        }
    }

    /**
     * @dev Internal function to resolve a bet
     * @param _betId ID of the bet to resolve
     */
    function _resolveBet(uint256 _betId) internal {
        Bet storage bet = bets[_betId];
        bet.resolved = true;

        // Calculate total stake and simulated yield (5%)
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 simulatedYield = totalStake * 5 / 100;

        // Determine winner and distribute funds
        address winner;
        if (bet.creatorOutcome) { // Creator wins
            uint256 creatorPayout = bet.creatorStake + (simulatedYield * 80 / 100);
            uint256 opponentPayout = bet.opponentStake + (simulatedYield * 20 / 100);
            
            require(celoToken.transfer(bet.creator, creatorPayout), "Creator transfer failed");
            require(celoToken.transfer(bet.opponent, opponentPayout), "Opponent transfer failed");
            
            winner = bet.creator;
        } else { // Opponent wins
            uint256 creatorPayout = bet.creatorStake + (simulatedYield * 20 / 100);
            uint256 opponentPayout = bet.opponentStake + (simulatedYield * 80 / 100);
            
            require(celoToken.transfer(bet.creator, creatorPayout), "Creator transfer failed");
            require(celoToken.transfer(bet.opponent, opponentPayout), "Opponent transfer failed");
            
            winner = bet.opponent;
        }

        emit BetResolved(_betId, winner, simulatedYield);
    }

    /**
     * @dev Internal function to resolve an expired bet
     * @param _betId ID of the expired bet to resolve
     */
    function _resolveExpiredBet(uint256 _betId) internal {
        Bet storage bet = bets[_betId];
        bet.resolved = true;

        // Calculate total stake and simulated yield
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 simulatedYield = totalStake * 5 / 100;

        address winner;
        
        // If outcomes match, distribute as normal
        if (bet.creatorOutcome == bet.opponentOutcome && bet.creatorOutcome != false) {
            if (bet.creatorOutcome) {
                uint256 creatorPayout = bet.creatorStake + (simulatedYield * 80 / 100);
                uint256 opponentPayout = bet.opponentStake + (simulatedYield * 20 / 100);
                
                require(celoToken.transfer(bet.creator, creatorPayout), "Creator transfer failed");
                require(celoToken.transfer(bet.opponent, opponentPayout), "Opponent transfer failed");
                
                winner = bet.creator;
            } else {
                uint256 creatorPayout = bet.creatorStake + (simulatedYield * 20 / 100);
                uint256 opponentPayout = bet.opponentStake + (simulatedYield * 80 / 100);
                
                require(celoToken.transfer(bet.creator, creatorPayout), "Creator transfer failed");
                require(celoToken.transfer(bet.opponent, opponentPayout), "Opponent transfer failed");
                
                winner = bet.opponent;
            }
        } else {
            // Split yield evenly if outcomes don't match or aren't set
            uint256 creatorPayout = bet.creatorStake + (simulatedYield / 2);
            uint256 opponentPayout = bet.opponentStake + (simulatedYield / 2);
            
            require(celoToken.transfer(bet.creator, creatorPayout), "Creator transfer failed");
            require(celoToken.transfer(bet.opponent, opponentPayout), "Opponent transfer failed");
            
            winner = address(0); // No clear winner
        }

        emit BetResolved(_betId, winner, simulatedYield);
    }

    /**
     * @dev Cancels a bet that hasn't been accepted yet
     * @param _betId ID of the bet to cancel
     */
    function cancelBet(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        
        require(bet.creator == msg.sender, "Only creator can cancel");
        require(bet.opponent == address(0), "Bet already accepted");
        require(!bet.resolved, "Bet already resolved");
        
        bet.resolved = true;
        
        // Return stake to creator
        require(celoToken.transfer(bet.creator, bet.creatorStake), "Refund failed");
        
        emit BetCancelled(_betId);
    }

    /**
     * @dev Gets details of a bet
     * @param _betId ID of the bet
     * @return Bet struct with all bet details
     */
    function getBet(uint256 _betId) external view returns (Bet memory) {
        return bets[_betId];
    }

    /**
     * @dev Gets the total number of bets created
     * @return Number of bets
     */
    function getBetCount() external view returns (uint256) {
        return betCounter;
    }

    /**
     * @dev Emergency function to recover tokens sent to the contract by mistake
     * @param _token Address of the token to recover
     * @param _amount Amount to recover
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}