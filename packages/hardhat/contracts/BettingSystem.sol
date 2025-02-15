// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BettingSystem is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    struct Game {
        uint256 minimumBet;
        uint256 endTime;
        bool isActive;
        bool isFinalized;
        mapping(address => uint256) bets;
        uint256 totalBets;
        address winner;
        uint256 winningPool;
        uint256 losingPool;
        mapping(address => bool) hasWithdrawn;
    }
    
    mapping(uint256 => Game) public games;
    
    event GameCreated(uint256 indexed gameId, uint256 minimumBet, uint256 duration);
    event BetPlaced(uint256 indexed gameId, address indexed bettor, uint256 amount);
    event GameFinalized(uint256 indexed gameId, uint256 totalPrizePool);
    event WinningsPaid(uint256 indexed gameId, address indexed winner, uint256 amount);

    uint256 public constant HOUSE_FEE = 300; // 3% fee in basis points
    uint256 public constant BASIS_POINTS = 10000;
    
    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function createGame(
        uint256 gameId,
        uint256 minimumBet,
        uint256 duration
    ) external onlyOwner {
        require(!games[gameId].isActive, "Game already exists");
        require(duration > 0, "Duration must be positive");
        
        Game storage game = games[gameId];
        game.minimumBet = minimumBet;
        game.endTime = block.timestamp + duration;
        game.isActive = true;
        
        emit GameCreated(gameId, minimumBet, duration);
    }

    function placeBet(uint256 gameId, uint256 amount) external nonReentrant {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(!game.isFinalized, "Game already finalized");
        require(block.timestamp < game.endTime, "Game has ended");
        require(amount >= game.minimumBet, "Bet too small");
        
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        game.bets[msg.sender] += amount;
        game.totalBets += amount;
        
        emit BetPlaced(gameId, msg.sender, amount);
    }

    function finalizeGame(uint256 gameId, address winner) external onlyOwner {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(!game.isFinalized, "Game already finalized");
        require(block.timestamp >= game.endTime, "Game not ended");
        require(game.bets[winner] > 0, "Winner must have placed a bet");

        game.isFinalized = true;
        game.winner = winner;
        game.winningPool = game.bets[winner];
        game.losingPool = game.totalBets - game.bets[winner];

        emit GameFinalized(gameId, game.totalBets);
    }

    function claimWinnings(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        require(game.isFinalized, "Game not finalized");
        require(!game.hasWithdrawn[msg.sender], "Already withdrawn");
        require(game.bets[msg.sender] > 0, "No bets placed");

        game.hasWithdrawn[msg.sender] = true;
        uint256 amount;

        if (msg.sender == game.winner) {
            // Winner gets their bet back plus a proportion of the losing pool minus house fee
            uint256 houseFee = (game.losingPool * HOUSE_FEE) / BASIS_POINTS;
            uint256 winningShare = game.losingPool - houseFee;
            amount = game.bets[msg.sender] + winningShare;
        } else {
            // Losers get nothing
            amount = 0;
        }

        if (amount > 0) {
            require(usdc.transfer(msg.sender, amount), "Transfer failed");
            emit WinningsPaid(gameId, msg.sender, amount);
        }
    }

    function withdrawHouseFees(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(game.isFinalized, "Game not finalized");
        
        uint256 houseFee = (game.losingPool * HOUSE_FEE) / BASIS_POINTS;
        require(usdc.transfer(owner(), houseFee), "Transfer failed");
    }
} 