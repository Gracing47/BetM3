// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Uniswap-Schnittstelle für Liquiditätsmanagement
interface IUniswapV2Router {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
}

contract NoLossBet is ERC721, Ownable, ReentrancyGuard {
    // Struktur für eine Wette
    struct Bet {
        address creator;           // Ersteller der Wette
        address opponent;          // Gegner der Wette
        uint256 creatorStake;      // Einsatz des Erstellers
        uint256 opponentStake;     // Einsatz des Gegners
        string condition;          // Bedingung der Wette
        bool creatorOutcome;       // Ergebnis des Erstellers
        bool opponentOutcome;      // Ergebnis des Gegners
        bool resolved;             // Ob die Wette abgeschlossen ist
        uint256 expiration;        // Ablaufzeit der Wette
        string commentText;        // Kommentar des Gegners
    }

    // Mappings für Wetten, Token-URIs und Liquidität
    mapping(uint256 => Bet) public bets;
    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => uint256) public betLiquidity;

    // Token und Router
    IERC20 public celoToken;       // CELO-Token
    IERC20 public stableToken;     // Stablecoin-Token
    IERC20 public betM3Token;      // Belohnungs-Token
    IERC20 public lpToken;         // Liquiditätspool-Token
    IUniswapV2Router public uniswapRouter;

    // Zähler und Konstanten
    uint256 public betCounter;
    uint256 public constant BET_DURATION = 14 days;

    // Events für wichtige Aktionen
    event BetCreated(uint256 betId, address creator, uint256 creatorStake, uint256 opponentStake, string condition);
    event BetAccepted(uint256 betId, address opponent, bool prediction, uint256 customStake, string commentText);
    event OutcomeSubmitted(uint256 betId, bool success);
    event BetResolved(uint256 betId, uint256 totalYield);
    event DisputeResolved(uint256 betId, address winner);

    // Konstruktor
    constructor(
        address _celoToken,
        address _stableToken,
        address _betM3Token,
        address _lpToken,
        address _uniswapRouter
    ) ERC721("NoLossBet", "NLB") {
        _transferOwnership(msg.sender);
        celoToken = IERC20(_celoToken);
        stableToken = IERC20(_stableToken);
        betM3Token = IERC20(_betM3Token);
        lpToken = IERC20(_lpToken);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
    }

    // Funktion zum Erstellen einer Wette
    function createBet(uint256 _creatorStake, uint256 _opponentStake, string calldata _condition, string calldata _tokenURI) external {
        require(_creatorStake >= 100 * 10 ** 18, "Creator stake must be at least 100 CELO");
        require(celoToken.transferFrom(msg.sender, address(this), _creatorStake), "Stake transfer failed");

        uint256 betId = betCounter++;
        _mint(msg.sender, betId);
        tokenURIs[betId] = _tokenURI;

        uint256 expirationTime = block.timestamp + BET_DURATION;

        bets[betId] = Bet({
            creator: msg.sender,
            opponent: address(0),
            creatorStake: _creatorStake,
            opponentStake: _opponentStake,
            condition: _condition,
            creatorOutcome: false,
            opponentOutcome: false,
            resolved: false,
            expiration: expirationTime,
            commentText: ""
        });

        emit BetCreated(betId, msg.sender, _creatorStake, _opponentStake, _condition);
    }

    // Überladene Funktionen zum Akzeptieren einer Wette
    function acceptBet(uint256 _betId, bool _prediction) external {
        _acceptBet(_betId, _prediction, 0, "");
    }

    function acceptBet(uint256 _betId, bool _prediction, uint256 _customStake, string calldata _commentText) external {
        _acceptBet(_betId, _prediction, _customStake, _commentText);
    }

    // Interne Funktion zum Akzeptieren einer Wette
    function _acceptBet(uint256 _betId, bool _prediction, uint256 _customStake, string memory _commentText) internal {
        Bet storage bet = bets[_betId];
        require(bet.opponent == address(0), "Bet already accepted");
        require(msg.sender != bet.creator, "Creator cannot accept own bet");
        require(block.timestamp < bet.expiration, "Bet has expired");

        uint256 stakeAmount = _customStake > 0 ? _customStake : bet.opponentStake;
        require(stakeAmount >= 10 * 10 ** 18, "Opponent stake must be at least 10 CELO");
        require(celoToken.transferFrom(msg.sender, address(this), stakeAmount), "Stake transfer failed");

        bet.opponent = msg.sender;
        bet.opponentOutcome = _prediction;
        bet.commentText = _commentText;

        if (_customStake > 0) {
            bet.opponentStake = _customStake;
        }

        _transfer(bet.creator, msg.sender, _betId);

        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 halfStake = totalStake / 2;

        require(stableToken.transferFrom(owner(), address(this), halfStake), "StableToken transfer failed");

        celoToken.approve(address(uniswapRouter), halfStake);
        stableToken.approve(address(uniswapRouter), halfStake);

        (,, uint256 liquidity) = uniswapRouter.addLiquidity(
            address(celoToken),
            address(stableToken),
            halfStake,
            halfStake,
            halfStake * 95 / 100,
            halfStake * 95 / 100,
            address(this),
            block.timestamp + 15 minutes
        );

        betLiquidity[_betId] = liquidity;

        emit BetAccepted(_betId, msg.sender, _prediction, stakeAmount, _commentText);
    }

    // Funktion zum Einreichen des Ergebnisses
    function submitOutcome(uint256 _betId, bool _success) external {
        Bet storage bet = bets[_betId];
        require(msg.sender == bet.creator || msg.sender == bet.opponent, "Not a participant");
        require(!bet.resolved, "Bet already resolved");
        require(bet.opponent != address(0), "Bet not accepted yet");

        if (msg.sender == bet.creator) {
            bet.creatorOutcome = _success;
        } else {
            bet.opponentOutcome = _success;
        }

        emit OutcomeSubmitted(_betId, _success);
    }

    // Funktion zum Auflösen einer Wette
    function resolveBet(uint256 _betId) external nonReentrant {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.opponent != address(0), "Bet not accepted yet");

        if (block.timestamp >= bet.expiration) {
            return resolveExpiredBet(_betId);
        }

        require(bet.creatorOutcome == bet.opponentOutcome, "Outcomes do not match");
        bet.resolved = true;

        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 halfStake = totalStake / 2;

        lpToken.approve(address(uniswapRouter), liquidity);

        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;

        if (bet.creatorOutcome) {
            uint256 creatorShare = bet.creatorStake * celoAmount / totalStake;
            uint256 opponentShare = bet.opponentStake * celoAmount / totalStake;

            require(celoToken.transfer(bet.creator, creatorShare + (yield * 80 / 100)), "Transfer failed");
            require(celoToken.transfer(bet.opponent, opponentShare + (yield * 20 / 100)), "Transfer failed");

            if (stableAmount > 0) {
                uint256 creatorStableShare = bet.creatorStake * stableAmount / totalStake;
                uint256 opponentStableShare = bet.opponentStake * stableAmount / totalStake;

                require(stableToken.transfer(bet.creator, creatorStableShare), "Transfer failed");
                require(stableToken.transfer(bet.opponent, opponentStableShare), "Transfer failed");
            }

            require(betM3Token.transfer(bet.creator, 10 * 10 ** 18), "Transfer failed");
            require(betM3Token.transfer(bet.opponent, 5 * 10 ** 18), "Transfer failed");
        } else {
            uint256 creatorShare = bet.creatorStake * celoAmount / totalStake;
            uint256 opponentShare = bet.opponentStake * celoAmount / totalStake;

            require(celoToken.transfer(bet.creator, creatorShare + (yield * 20 / 100)), "Transfer failed");
            require(celoToken.transfer(bet.opponent, opponentShare + (yield * 80 / 100)), "Transfer failed");

            if (stableAmount > 0) {
                uint256 creatorStableShare = bet.creatorStake * stableAmount / totalStake;
                uint256 opponentStableShare = bet.opponentStake * stableAmount / totalStake;

                require(stableToken.transfer(bet.creator, creatorStableShare), "Transfer failed");
                require(stableToken.transfer(bet.opponent, opponentStableShare), "Transfer failed");
            }

            require(betM3Token.transfer(bet.creator, 5 * 10 ** 18), "Transfer failed");
            require(betM3Token.transfer(bet.opponent, 10 * 10 ** 18), "Transfer failed");
        }

        if (stableToken.balanceOf(address(this)) > 0) {
            require(stableToken.transfer(owner(), stableToken.balanceOf(address(this))), "Transfer failed");
        }

        emit BetResolved(_betId, yield);
    }

    // Interne Funktion zum Auflösen einer abgelaufenen Wette
    function resolveExpiredBet(uint256 _betId) internal {
        Bet storage bet = bets[_betId];
        require(block.timestamp >= bet.expiration, "Bet not yet expired");
        require(!bet.resolved, "Bet already resolved");

        bet.resolved = true;

        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;

        lpToken.approve(address(uniswapRouter), liquidity);

        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;

        if (bet.creatorOutcome == bet.opponentOutcome && bet.creatorOutcome != false) {
            if (bet.creatorOutcome) {
                require(celoToken.transfer(bet.creator, bet.creatorStake + (yield * 80 / 100)), "Transfer failed");
                require(celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 20 / 100)), "Transfer failed");
                require(betM3Token.transfer(bet.creator, 10 * 10 ** 18), "Transfer failed");
                require(betM3Token.transfer(bet.opponent, 5 * 10 ** 18), "Transfer failed");
            } else {
                require(celoToken.transfer(bet.creator, bet.creatorStake + (yield * 20 / 100)), "Transfer failed");
                require(celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 80 / 100)), "Transfer failed");
                require(betM3Token.transfer(bet.creator, 5 * 10 ** 18), "Transfer failed");
                require(betM3Token.transfer(bet.opponent, 10 * 10 ** 18), "Transfer failed");
            }
        } else {
            require(celoToken.transfer(bet.creator, bet.creatorStake + (yield / 2)), "Transfer failed");
            require(celoToken.transfer(bet.opponent, bet.opponentStake + (yield / 2)), "Transfer failed");
            require(betM3Token.transfer(bet.creator, 2 * 10 ** 18), "Transfer failed");
            require(betM3Token.transfer(bet.opponent, 2 * 10 ** 18), "Transfer failed");
        }

        if (stableToken.balanceOf(address(this)) > 0) {
            require(stableToken.transfer(owner(), stableToken.balanceOf(address(this))), "Transfer failed");
        }

        emit BetResolved(_betId, yield);
    }

    // Funktion zur Streitbeilegung (nur Owner)
    function resolveDispute(uint256 _betId, bool _creatorWins) external onlyOwner {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.opponent != address(0), "Bet not accepted yet");
        require(bet.creatorOutcome != bet.opponentOutcome, "No dispute");

        bet.resolved = true;

        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;

        lpToken.approve(address(uniswapRouter), liquidity);

        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;

        if (_creatorWins) {
            require(celoToken.transfer(bet.creator, bet.creatorStake + yield), "Transfer failed");
            require(celoToken.transfer(bet.opponent, bet.opponentStake), "Transfer failed");
        } else {
            require(celoToken.transfer(bet.creator, bet.creatorStake), "Transfer failed");
            require(celoToken.transfer(bet.opponent, bet.opponentStake + yield), "Transfer failed");
        }

        if (stableToken.balanceOf(address(this)) > 0) {
            require(stableToken.transfer(owner(), stableToken.balanceOf(address(this))), "Transfer failed");
        }

        emit DisputeResolved(_betId, _creatorWins ? bet.creator : bet.opponent);
    }

    // Funktion zur Rückgabe der Token-URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return tokenURIs[tokenId];
    }

    // Funktion zum Auffüllen des Community-Pools (nur Owner)
    function fundCommunityPool(uint256 amount) external onlyOwner {
        require(betM3Token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    // Funktion zum Auffüllen des Stablecoin-Pools (nur Owner)
    function fundStableTokenPool(uint256 amount) external onlyOwner {
        require(stableToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}