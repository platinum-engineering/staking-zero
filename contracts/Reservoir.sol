// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/ERC20Token.sol";

contract Reservoir is Ownable {

    address public stakeToken;
    address public pool;

    constructor() {}

    function initialize(address stakeToken_, address pool_) public onlyOwner {
        require(pool == address(0), "Reservoir::initialize: may only be initialized once");
        pool = pool_;

        ERC20(stakeToken_).approve(pool_, type(uint).max);
    }
}