// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMintableBurnableToken is IERC20 {
    function mint(address to, uint256 amount) external;
    function burn(uint256 amount) external;
}

contract UniswapPoolMock {
    IMintableBurnableToken public token0; // z.B. CELO
    IMintableBurnableToken public token1; // z.B. cUSD
    IMintableBurnableToken public lpToken; // LP Token
    
    mapping(address => uint256) public liquidityProvided;
    int256 public feeRate = 3; // 0.3% Handelsgebühr (Standard bei Uniswap)
    
    constructor(address _token0, address _token1, address _lpToken) {
        token0 = IMintableBurnableToken(_token0);
        token1 = IMintableBurnableToken(_token1);
        lpToken = IMintableBurnableToken(_lpToken);
    }
    
    // Simuliert die Handelsgebühren-Rate
    function setFeeRate(int256 _feeRate) external {
        feeRate = _feeRate;
    }
    
    // Simuliert addLiquidity von Uniswap
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256, uint256, uint256) {
        require(deadline >= block.timestamp, "UniswapPoolMock: EXPIRED");
        require(
            (tokenA == address(token0) && tokenB == address(token1)) ||
            (tokenA == address(token1) && tokenB == address(token0)),
            "UniswapPoolMock: INVALID_TOKEN_PAIR"
        );
        
        // Vereinfachte Implementierung: 1:1 Verhältnis
        uint256 liquidity = amountA; // In einer echten Implementierung würde dies berechnet werden
        
        // Tokens vom Sender übertragen
        if (tokenA == address(token0)) {
            token0.transferFrom(msg.sender, address(this), amountA);
            token1.transferFrom(msg.sender, address(this), amountB);
        } else {
            token0.transferFrom(msg.sender, address(this), amountB);
            token1.transferFrom(msg.sender, address(this), amountA);
        }
        
        // LP Tokens prägen und an den Empfänger senden
        lpToken.mint(to, liquidity);
        liquidityProvided[to] += liquidity;
        
        return (amountA, amountB, liquidity);
    }
    
    // Simuliert removeLiquidity von Uniswap
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256, uint256) {
        require(deadline >= block.timestamp, "UniswapPoolMock: EXPIRED");
        require(
            (tokenA == address(token0) && tokenB == address(token1)) ||
            (tokenA == address(token1) && tokenB == address(token0)),
            "UniswapPoolMock: INVALID_TOKEN_PAIR"
        );
        
        // LP Tokens vom Sender verbrennen
        lpToken.transferFrom(msg.sender, address(this), liquidity);
        lpToken.burn(liquidity);
        
        // Berechne Yield basierend auf der Gebührenrate
        uint256 yield = 0;
        if (feeRate > 0) {
            yield = (liquidity * uint256(feeRate)) / 1000; // 0.3% = 3/1000
        }
        
        // Tokens an den Empfänger zurückgeben (mit Yield)
        uint256 amountA = liquidity;
        uint256 amountB = liquidity;
        
        if (feeRate > 0) {
            amountA += yield;
            amountB += yield;
        } else if (feeRate < 0) {
            // Simuliere Impermanent Loss bei negativer Rate
            uint256 loss = (liquidity * uint256(-feeRate)) / 1000;
            amountA = amountA > loss ? amountA - loss : 0;
            amountB = amountB > loss ? amountB - loss : 0;
        }
        
        if (tokenA == address(token0)) {
            token0.transfer(to, amountA);
            token1.transfer(to, amountB);
        } else {
            token0.transfer(to, amountB);
            token1.transfer(to, amountA);
        }
        
        liquidityProvided[msg.sender] -= liquidity;
        
        return (amountA, amountB);
    }
    
    // Simuliert Marktbedingungen für Tests
    function simulateTrading(uint256 volume) external {
        // Simuliere Handelsaktivität, die Gebühren generiert
        uint256 fees = 0;
        if (feeRate > 0) {
            fees = (volume * uint256(feeRate)) / 1000;
        }
        
        // Mint zusätzliche Tokens, um die Gebühren zu simulieren
        if (fees > 0) {
            token0.mint(address(this), fees);
            token1.mint(address(this), fees);
        }
    }
    
    // Simuliert Impermanent Loss für Tests
    function simulateImpermanentLoss(uint256 lossPercentage) external {
        uint256 token0Balance = token0.balanceOf(address(this));
        uint256 token1Balance = token1.balanceOf(address(this));
        
        uint256 token0Loss = (token0Balance * lossPercentage) / 100;
        uint256 token1Loss = (token1Balance * lossPercentage) / 100;
        
        // Verbrenne Tokens, um Verlust zu simulieren
        try token0.burn(token0Loss) {
            // Erfolgreich verbrannt
        } catch {
            // Fallback: Sende an eine tote Adresse
            token0.transfer(address(0x000000000000000000000000000000000000dEaD), token0Loss);
        }
        
        try token1.burn(token1Loss) {
            // Erfolgreich verbrannt
        } catch {
            // Fallback: Sende an eine tote Adresse
            token1.transfer(address(0x000000000000000000000000000000000000dEaD), token1Loss);
        }
    }
} 