// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingPool.sol";
import "./utils/ERC20Token.sol";

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
    function createStakingPool(address owner_, address implAndTerms_, address stakeToken_) external returns (bool) {
        require(
            owner_ != address(0)
            && implAndTerms_ != address(0)
            && stakeToken_ != address(0),
            "StakingPoolFactory::createStakingPool: address is 0"
        );


        (string memory name, string memory symbol) = _createNameAndSymbol(stakeToken_);

        StakingPool newPool = new StakingPool(implAndTerms_, stakeToken_, name, symbol);

        newPool.transferOwnership(owner_);

        emit StakingPoolCreated(address(newPool));

        return true;
    }

    function _createNameAndSymbol(address stakeToken_) internal view returns (string memory, string memory) {
        string memory name = string(abi.encodePacked("Staking LP ", ERC20(stakeToken_).name()));
        string memory symbol = string(abi.encodePacked("StLP ", ERC20(stakeToken_).symbol()));
        return (name, symbol);
    }
}
