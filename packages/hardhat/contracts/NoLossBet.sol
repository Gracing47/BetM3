// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";

contract NoLossBet is ERC721, Ownable {
    struct Bet {
        address creator;
        address opponent;
        uint256 creatorStake;
        uint256 opponentStake;
        string condition;
        bool creatorOutcome;
        bool opponentOutcome;
        bool resolved;
    }

    mapping(uint256 => Bet) public bets;
    mapping(uint256 => string) public tokenURIs;
    IERC20 public celoToken;       // CELO-Token für Einsätze
    IERC20 public betM3Token;      // Dein BetM3Token für Belohnungen
    IPool public aavePool;         // Aave-Pool für Yield
    uint256 public betCounter;

    event BetCreated(uint256 betId, address creator, string condition);
    event BetAccepted(uint256 betId, address opponent);
    event OutcomeSubmitted(uint256 betId, bool success);
    event BetResolved(uint256 betId, uint256 totalYield);
    event DisputeResolved(uint256 betId, address winner);

    constructor(address _celoToken, address _betM3Token, address _aavePool) 
        ERC721("NoLossBet", "NLB") 
    {
        _transferOwnership(msg.sender);  // Ownership korrekt setzen
        celoToken = IERC20(_celoToken);
        betM3Token = IERC20(_betM3Token);
        aavePool = IPool(_aavePool);
    }

    function createBet(uint256 _opponentStake, string calldata _condition, string calldata _tokenURI) external {
        require(celoToken.transferFrom(msg.sender, address(this), 100 * 10 ** 18), "Stake transfer failed");
        uint256 betId = betCounter++;
        _mint(msg.sender, betId);
        tokenURIs[betId] = _tokenURI;
        bets[betId] = Bet({
            creator: msg.sender,
            opponent: address(0),
            creatorStake: 100 * 10 ** 18, // 100 CELO
            opponentStake: _opponentStake,
            condition: _condition,
            creatorOutcome: false,
            opponentOutcome: false,
            resolved: false
        });
        emit BetCreated(betId, msg.sender, _condition);
    }

    function acceptBet(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        require(bet.opponent == address(0), "Bet already accepted");
        require(msg.sender != bet.creator, "Creator cannot accept own bet");
        require(celoToken.transferFrom(msg.sender, address(this), bet.opponentStake), "Stake transfer failed");
        bet.opponent = msg.sender;
        _transfer(bet.creator, msg.sender, _betId);
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        celoToken.approve(address(aavePool), totalStake);
        aavePool.supply(address(celoToken), totalStake, address(this), 0);
        emit BetAccepted(_betId, msg.sender);
    }

    function submitOutcome(uint256 _betId, bool _success) external {
        Bet storage bet = bets[_betId];
        require(msg.sender == bet.creator || msg.sender == bet.opponent, "Not a participant");
        require(!bet.resolved, "Bet already resolved");
        if (msg.sender == bet.creator) {
            bet.creatorOutcome = _success;
        } else {
            bet.opponentOutcome = _success;
        }
        emit OutcomeSubmitted(_betId, _success);
    }

    function resolveBet(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.creatorOutcome == bet.opponentOutcome, "Outcomes do not match");
        bet.resolved = true;
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        aavePool.withdraw(address(celoToken), type(uint256).max, address(this));
        uint256 balance = celoToken.balanceOf(address(this));
        uint256 yield = balance > totalStake ? balance - totalStake : 0;
        if (bet.creatorOutcome) {
            celoToken.transfer(bet.creator, bet.creatorStake + (yield * 80 / 100));
            celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 20 / 100));
            betM3Token.transfer(bet.creator, 10 * 10 ** 18); // 10 BETM3
            betM3Token.transfer(bet.opponent, 5 * 10 ** 18); // 5 BETM3
        } else {
            celoToken.transfer(bet.creator, bet.creatorStake + (yield * 20 / 100));
            celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 80 / 100));
            betM3Token.transfer(bet.creator, 5 * 10 ** 18);  // 5 BETM3
            betM3Token.transfer(bet.opponent, 10 * 10 ** 18); // 10 BETM3
        }
        emit BetResolved(_betId, yield);
    }

    function resolveDispute(uint256 _betId, bool _creatorWins) external onlyOwner {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.creatorOutcome != bet.opponentOutcome, "No dispute");
        bet.resolved = true;
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        aavePool.withdraw(address(celoToken), type(uint256).max, address(this));
        uint256 balance = celoToken.balanceOf(address(this));
        uint256 yield = balance > totalStake ? balance - totalStake : 0;
        if (_creatorWins) {
            celoToken.transfer(bet.creator, bet.creatorStake + yield);
            celoToken.transfer(bet.opponent, bet.opponentStake);
        } else {
            celoToken.transfer(bet.creator, bet.creatorStake);
            celoToken.transfer(bet.opponent, bet.opponentStake + yield);
        }
        emit DisputeResolved(_betId, _creatorWins ? bet.creator : bet.opponent);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }

    // Funktion, um BetM3Token an den Contract zu übertragen (für Belohnungen)
    function fundCommunityPool(uint256 amount) external onlyOwner {
        require(betM3Token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
} 