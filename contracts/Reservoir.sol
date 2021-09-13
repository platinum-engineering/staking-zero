// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./utils/ERC20Token.sol";

contract Reservoir {

    address public stakeToken;
    address public pool;

    constructor(address stakeToken_, address pool_) {
        stakeToken = stakeToken_;
        pool = pool_;

        ERC20(stakeToken_).approve(pool_, type(uint).max);
    }
}