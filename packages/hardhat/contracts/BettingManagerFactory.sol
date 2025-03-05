// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NoLossBetMulti.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BettingManagerFactory
 * @dev Factory contract that creates and manages instances of NoLossBetMulti.
 * The factory stores the addresses of all deployed betting contracts and 
 * transfers ownership of each new instance to the caller, avoiding centralized admin control.
 */
contract BettingManagerFactory is Ownable {
    // Array storing the addresses of all deployed NoLossBetMulti contracts
    address[] public bettingContracts;

    // Event emitted upon creation of a new betting contract
    event BettingContractCreated(address indexed bettingContract, address indexed creator);

    /**
     * @dev Deploys a new NoLossBetMulti contract with the given ERC20 token.
     * @param _token The address of the ERC20 token contract used for bets.
     * @return The address of the newly deployed NoLossBetMulti contract.
     */
    function createBettingContract(address _token) external returns (address) {
        NoLossBetMulti newBettingContract = new NoLossBetMulti(_token);

        // Transfer ownership of the new instance to the caller (the message sender)
        // so that the caller can act as the admin/owner in Phase 1.
        newBettingContract.transferOwnership(msg.sender);

        bettingContracts.push(address(newBettingContract));
        emit BettingContractCreated(address(newBettingContract), msg.sender);

        return address(newBettingContract);
    }

    /**
     * @dev Returns the total number of created betting contracts.
     */
    function getBettingContractsCount() external view returns (uint256) {
        return bettingContracts.length;
    }

    /**
     * @dev Returns the address of a deployed betting contract by index.
     * @param index The index in the bettingContracts array.
     */
    function getBettingContract(uint256 index) external view returns (address) {
        require(index < bettingContracts.length, "Index out of bounds");
        return bettingContracts[index];
    }
}
