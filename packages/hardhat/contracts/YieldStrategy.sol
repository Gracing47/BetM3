// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IUbeswapRouter.sol";

/**
 * @title YieldStrategy
 * @dev Manages yield generation through Ubeswap LP tokens
 */
contract YieldStrategy is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // State variables
    IUbeswapRouter public ubeswapRouter;
    IERC20 public stakingToken;
    IERC20 public pairToken;
    IERC20 public lpToken;
    address public betManager;
    
    mapping(bytes32 => uint256) public betLPBalance;
    mapping(bytes32 => uint256) public initialStakeBalance;

    // Events
    event StakeDeposited(bytes32 indexed betId, uint256 amount, uint256 lpTokens);
    event YieldHarvested(bytes32 indexed betId, uint256 yieldAmount);
    event StakeWithdrawn(bytes32 indexed betId, uint256 amount);

    // Constructor
    constructor(
        address _ubeswapRouter,
        address _stakingToken,
        address _pairToken,
        address _lpToken
    ) {
        ubeswapRouter = IUbeswapRouter(_ubeswapRouter);
        stakingToken = IERC20(_stakingToken);
        pairToken = IERC20(_pairToken);
        lpToken = IERC20(_lpToken);
    }

    // Modifiers
    modifier onlyBetManager() {
        require(msg.sender == betManager, "Only BetManager can call this");
        _;
    }

    // External functions
    function depositStake(bytes32 _betId, uint256 _amount) external nonReentrant onlyBetManager whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Record initial stake
        initialStakeBalance[_betId] = _amount;

        // Approve router to spend tokens
        stakingToken.safeApprove(address(ubeswapRouter), _amount);

        // Add liquidity to Ubeswap
        (uint256 amountA, , uint256 lpAmount) = ubeswapRouter.addLiquidity(
            address(stakingToken),
            address(pairToken),
            _amount,
            _amount, // Assuming 1:1 ratio for simplicity
            _amount * 95 / 100, // 5% slippage tolerance
            _amount * 95 / 100,
            address(this),
            block.timestamp + 15 minutes
        );

        // Record LP tokens received
        betLPBalance[_betId] = lpAmount;

        emit StakeDeposited(_betId, amountA, lpAmount);
    }

    function withdrawStake(bytes32 _betId) external nonReentrant onlyBetManager returns (uint256 yieldAmount) {
        uint256 lpAmount = betLPBalance[_betId];
        require(lpAmount > 0, "No LP tokens for this bet");

        // Approve router to spend LP tokens
        lpToken.safeApprove(address(ubeswapRouter), lpAmount);

        // Remove liquidity from Ubeswap
        (uint256 amountA, ) = ubeswapRouter.removeLiquidity(
            address(stakingToken),
            address(pairToken),
            lpAmount,
            0, // Accept any amount of tokens
            0,
            address(this),
            block.timestamp + 15 minutes
        );

        // Calculate yield
        uint256 initialStake = initialStakeBalance[_betId];
        yieldAmount = amountA > initialStake ? amountA - initialStake : 0;

        // Clean up
        delete betLPBalance[_betId];
        delete initialStakeBalance[_betId];

        // Transfer tokens back to BetManager
        stakingToken.safeTransfer(betManager, amountA);

        emit StakeWithdrawn(_betId, amountA);
        if (yieldAmount > 0) {
            emit YieldHarvested(_betId, yieldAmount);
        }
    }

    function getYieldEstimate(bytes32 _betId) external view returns (uint256) {
        uint256 lpAmount = betLPBalance[_betId];
        if (lpAmount == 0) return 0;

        // This is a simplified yield calculation
        // In production, you would need to calculate this based on actual LP token value
        uint256 initialStake = initialStakeBalance[_betId];
        uint256 estimatedValue = lpAmount * 2; // Simplified calculation
        return estimatedValue > initialStake ? estimatedValue - initialStake : 0;
    }

    // Admin functions
    function setBetManager(address _betManager) external onlyOwner {
        betManager = _betManager;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency functions
    function emergencyWithdraw(bytes32 _betId) external onlyOwner {
        uint256 lpAmount = betLPBalance[_betId];
        require(lpAmount > 0, "No LP tokens for this bet");

        lpToken.safeApprove(address(ubeswapRouter), lpAmount);
        
        ubeswapRouter.removeLiquidity(
            address(stakingToken),
            address(pairToken),
            lpAmount,
            0,
            0,
            betManager,
            block.timestamp + 15 minutes
        );

        delete betLPBalance[_betId];
        delete initialStakeBalance[_betId];
    }
}
