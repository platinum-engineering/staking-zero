// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingPool.sol";

contract StakingPoolFactory {
    /**
     * Fired on creation new staking contract
     * @param newStakingPool Address of new staking contract
     */
    event StakingPoolCreated(address newStakingPool);

    constructor() {}

    /**
     * Creates new staking contract
     * @param owner_ The owner of the staking contract
     * @param stakeToken_ The address of the staking asset
     */
    function createStakingPool(address owner_, address stakeToken_) external returns (bool) {
        StakingPool newPool = new StakingPool(stakeToken_);

        newPool.transferOwnership(owner_);

        emit StakingPoolCreated(address(newPool));

        return true;
    }
}