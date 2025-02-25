// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Uniswap interfaces
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
        uint256 expiration; // Timestamp, wann die Wette abläuft
    }

    mapping(uint256 => Bet) public bets;
    mapping(uint256 => string) public tokenURIs;
    mapping(uint256 => uint256) public betLiquidity; // Speichert die LP-Token-Menge für jede Wette
    
    IERC20 public celoToken;       // CELO-Token für Einsätze
    IERC20 public stableToken;     // Stablecoin (z.B. cUSD)
    IERC20 public betM3Token;      // Dein BetM3Token für Belohnungen
    IERC20 public lpToken;         // Uniswap LP-Token
    IUniswapV2Router public uniswapRouter; // Uniswap Router
    
    uint256 public betCounter;
    uint256 public constant BET_DURATION = 14 days; // Standarddauer für Wetten

    event BetCreated(uint256 betId, address creator, string condition, uint256 expiration);
    event BetAccepted(uint256 betId, address opponent);
    event OutcomeSubmitted(uint256 betId, bool success);
    event BetResolved(uint256 betId, uint256 totalYield);
    event DisputeResolved(uint256 betId, address winner);

    constructor(
        address _celoToken, 
        address _stableToken,
        address _betM3Token, 
        address _lpToken,
        address _uniswapRouter
    ) 
        ERC721("NoLossBet", "NLB") 
    {
        _transferOwnership(msg.sender);  // Ownership korrekt setzen
        celoToken = IERC20(_celoToken);
        stableToken = IERC20(_stableToken);
        betM3Token = IERC20(_betM3Token);
        lpToken = IERC20(_lpToken);
        uniswapRouter = IUniswapV2Router(_uniswapRouter);
    }

    function createBet(uint256 _opponentStake, string calldata _condition, string calldata _tokenURI) external {
        require(celoToken.transferFrom(msg.sender, address(this), 100 * 10 ** 18), "Stake transfer failed");
        uint256 betId = betCounter++;
        _mint(msg.sender, betId);
        tokenURIs[betId] = _tokenURI;
        
        uint256 expirationTime = block.timestamp + BET_DURATION;
        
        bets[betId] = Bet({
            creator: msg.sender,
            opponent: address(0),
            creatorStake: 100 * 10 ** 18, // 100 CELO
            opponentStake: _opponentStake,
            condition: _condition,
            creatorOutcome: false,
            opponentOutcome: false,
            resolved: false,
            expiration: expirationTime
        });
        emit BetCreated(betId, msg.sender, _condition, expirationTime);
    }

    function acceptBet(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        require(bet.opponent == address(0), "Bet already accepted");
        require(msg.sender != bet.creator, "Creator cannot accept own bet");
        require(block.timestamp < bet.expiration, "Bet has expired");
        require(celoToken.transferFrom(msg.sender, address(this), bet.opponentStake), "Stake transfer failed");
        
        bet.opponent = msg.sender;
        _transfer(bet.creator, msg.sender, _betId);
        
        // Für Uniswap benötigen wir gleiche Mengen beider Tokens
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 halfStake = totalStake / 2;
        
        // Wir nehmen an, dass wir bereits CELO haben und müssen stableToken beschaffen
        // In einer echten Implementierung würde man hier einen Swap durchführen
        // Für den Mock nehmen wir an, dass wir bereits stableToken haben
        require(stableToken.transferFrom(owner(), address(this), halfStake), "StableToken transfer failed");
        
        // Genehmigungen für Uniswap erteilen
        celoToken.approve(address(uniswapRouter), halfStake);
        stableToken.approve(address(uniswapRouter), halfStake);
        
        // Liquidität zu Uniswap hinzufügen
        (,, uint256 liquidity) = uniswapRouter.addLiquidity(
            address(celoToken),
            address(stableToken),
            halfStake,
            halfStake,
            halfStake * 95 / 100, // 5% Slippage-Toleranz
            halfStake * 95 / 100, // 5% Slippage-Toleranz
            address(this),
            block.timestamp + 15 minutes
        );
        
        // LP-Token-Menge für diese Wette speichern
        betLiquidity[_betId] = liquidity;
        
        emit BetAccepted(_betId, msg.sender);
    }

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

    function resolveBet(uint256 _betId) external {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.opponent != address(0), "Bet not accepted yet");
        
        // Wenn die Wette abgelaufen ist, kann sie aufgelöst werden, auch wenn die Ergebnisse nicht übereinstimmen
        if (block.timestamp >= bet.expiration) {
            return resolveExpiredBet(_betId);
        }
        
        require(bet.creatorOutcome == bet.opponentOutcome, "Outcomes do not match");
        bet.resolved = true;
        
        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        uint256 halfStake = totalStake / 2;
        
        // Genehmigung für Uniswap erteilen
        lpToken.approve(address(uniswapRouter), liquidity);
        
        // Liquidität aus Uniswap entfernen
        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0, // Mindestmenge für CELO
            0, // Mindestmenge für stableToken
            address(this),
            block.timestamp + 15 minutes
        );
        
        // Berechne den Yield
        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;
        
        // Verteile die Tokens basierend auf dem Ergebnis
        if (bet.creatorOutcome) {
            // Wir haben möglicherweise nicht genug CELO, um die vollen Einsätze zurückzugeben
            // Stattdessen geben wir zurück, was wir haben, proportional zu den Einsätzen
            uint256 creatorShare = bet.creatorStake * celoAmount / totalStake;
            uint256 opponentShare = bet.opponentStake * celoAmount / totalStake;
            
            celoToken.transfer(bet.creator, creatorShare + (yield * 80 / 100));
            celoToken.transfer(bet.opponent, opponentShare + (yield * 20 / 100));
            
            // Gib auch stableTokens zurück, wenn wir sie haben
            if (stableAmount > 0) {
                uint256 creatorStableShare = bet.creatorStake * stableAmount / totalStake;
                uint256 opponentStableShare = bet.opponentStake * stableAmount / totalStake;
                
                stableToken.transfer(bet.creator, creatorStableShare);
                stableToken.transfer(bet.opponent, opponentStableShare);
            }
            
            betM3Token.transfer(bet.creator, 10 * 10 ** 18); // 10 BETM3
            betM3Token.transfer(bet.opponent, 5 * 10 ** 18); // 5 BETM3
        } else {
            // Wir haben möglicherweise nicht genug CELO, um die vollen Einsätze zurückzugeben
            // Stattdessen geben wir zurück, was wir haben, proportional zu den Einsätzen
            uint256 creatorShare = bet.creatorStake * celoAmount / totalStake;
            uint256 opponentShare = bet.opponentStake * celoAmount / totalStake;
            
            celoToken.transfer(bet.creator, creatorShare + (yield * 20 / 100));
            celoToken.transfer(bet.opponent, opponentShare + (yield * 80 / 100));
            
            // Gib auch stableTokens zurück, wenn wir sie haben
            if (stableAmount > 0) {
                uint256 creatorStableShare = bet.creatorStake * stableAmount / totalStake;
                uint256 opponentStableShare = bet.opponentStake * stableAmount / totalStake;
                
                stableToken.transfer(bet.creator, creatorStableShare);
                stableToken.transfer(bet.opponent, opponentStableShare);
            }
            
            betM3Token.transfer(bet.creator, 5 * 10 ** 18);  // 5 BETM3
            betM3Token.transfer(bet.opponent, 10 * 10 ** 18); // 10 BETM3
        }
        
        // Übrige stableTokens an den Owner zurückgeben
        if (stableToken.balanceOf(address(this)) > 0) {
            stableToken.transfer(owner(), stableToken.balanceOf(address(this)));
        }
        
        emit BetResolved(_betId, yield);
    }

    // Funktion zur Auflösung abgelaufener Wetten
    function resolveExpiredBet(uint256 _betId) internal {
        Bet storage bet = bets[_betId];
        require(block.timestamp >= bet.expiration, "Bet not yet expired");
        require(!bet.resolved, "Bet already resolved");
        
        bet.resolved = true;
        
        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        
        // Genehmigung für Uniswap erteilen
        lpToken.approve(address(uniswapRouter), liquidity);
        
        // Liquidität aus Uniswap entfernen
        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0, // Mindestmenge für CELO
            0, // Mindestmenge für stableToken
            address(this),
            block.timestamp + 15 minutes
        );
        
        // Berechne den Yield
        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;
        
        // Bei abgelaufenen Wetten:
        // 1. Wenn beide Ergebnisse übereinstimmen, normal auflösen
        if (bet.creatorOutcome == bet.opponentOutcome && bet.creatorOutcome != false) {
            if (bet.creatorOutcome) {
                celoToken.transfer(bet.creator, bet.creatorStake + (yield * 80 / 100));
                celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 20 / 100));
                betM3Token.transfer(bet.creator, 10 * 10 ** 18);
                betM3Token.transfer(bet.opponent, 5 * 10 ** 18);
            } else {
                celoToken.transfer(bet.creator, bet.creatorStake + (yield * 20 / 100));
                celoToken.transfer(bet.opponent, bet.opponentStake + (yield * 80 / 100));
                betM3Token.transfer(bet.creator, 5 * 10 ** 18);
                betM3Token.transfer(bet.opponent, 10 * 10 ** 18);
            }
        } 
        // 2. Wenn die Ergebnisse nicht übereinstimmen oder nicht eingereicht wurden, Einsätze zurückgeben und Yield teilen
        else {
            celoToken.transfer(bet.creator, bet.creatorStake + (yield / 2));
            celoToken.transfer(bet.opponent, bet.opponentStake + (yield / 2));
            // Kleinere Belohnungen für beide, da keine Einigung erzielt wurde
            betM3Token.transfer(bet.creator, 2 * 10 ** 18);
            betM3Token.transfer(bet.opponent, 2 * 10 ** 18);
        }
        
        // Übrige stableTokens an den Owner zurückgeben
        if (stableToken.balanceOf(address(this)) > 0) {
            stableToken.transfer(owner(), stableToken.balanceOf(address(this)));
        }
        
        emit BetResolved(_betId, yield);
    }

    function resolveDispute(uint256 _betId, bool _creatorWins) external onlyOwner {
        Bet storage bet = bets[_betId];
        require(!bet.resolved, "Bet already resolved");
        require(bet.opponent != address(0), "Bet not accepted yet");
        require(bet.creatorOutcome != bet.opponentOutcome, "No dispute");
        
        bet.resolved = true;
        
        uint256 liquidity = betLiquidity[_betId];
        uint256 totalStake = bet.creatorStake + bet.opponentStake;
        
        // Genehmigung für Uniswap erteilen
        lpToken.approve(address(uniswapRouter), liquidity);
        
        // Liquidität aus Uniswap entfernen
        (uint256 celoAmount, uint256 stableAmount) = uniswapRouter.removeLiquidity(
            address(celoToken),
            address(stableToken),
            liquidity,
            0, // Mindestmenge für CELO
            0, // Mindestmenge für stableToken
            address(this),
            block.timestamp + 15 minutes
        );
        
        // Berechne den Yield
        uint256 totalReceived = celoAmount + stableAmount;
        uint256 yield = totalReceived > totalStake ? totalReceived - totalStake : 0;
        
        if (_creatorWins) {
            celoToken.transfer(bet.creator, bet.creatorStake + yield);
            celoToken.transfer(bet.opponent, bet.opponentStake);
        } else {
            celoToken.transfer(bet.creator, bet.creatorStake);
            celoToken.transfer(bet.opponent, bet.opponentStake + yield);
        }
        
        // Übrige stableTokens an den Owner zurückgeben
        if (stableToken.balanceOf(address(this)) > 0) {
            stableToken.transfer(owner(), stableToken.balanceOf(address(this)));
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
    
    // Funktion, um stableToken an den Contract zu übertragen (für Liquidität)
    function fundStableTokenPool(uint256 amount) external onlyOwner {
        require(stableToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
} 