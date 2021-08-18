// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    address public token;

    constructor(address token_) {
        require(
            token == address(0)
            , "Staking::constructor: may only be initialized once"
        );

        token = token_;
    }
}
