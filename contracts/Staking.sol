// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./StakingStorage.sol";

contract SpaceOracle is StakingStorageV1 {

    function initialize(
        address token_
    )
        public
    {
        require(
            token == address(0)
            , "Staking::initialize: may only be initialized once"
        );

        token = token_;
    }
}
