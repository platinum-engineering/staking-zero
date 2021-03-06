// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Storage.sol";

contract StakingPool is Storage, Ownable {

    constructor(
        address implAndTerms_,
        address whitelist_,
        address stakeToken_,
        address reservoir_,
        string memory name_,
        string memory symbol_
    ) {
        require(
            implAndTerms_ != address(0)
            && whitelist_ != address(0)
            && stakeToken_ != address(0)
            && reservoir_ != address(0),
            "StakingPool::constructor: address is 0"
        );

        implementation = implAndTerms_;

        delegateTo(implementation, abi.encodeWithSignature("initialize(address,address,address,string,string)", whitelist_, stakeToken_, reservoir_, name_, symbol_));
    }

    function delegateTo(address callee, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returnData) = callee.delegatecall(data);
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize())
            }
        }
        return returnData;
    }

    function delegateAndReturn() private returns (bytes memory) {
        (bool success, ) = implementation.delegatecall(msg.data);

        assembly {
            let free_mem_ptr := mload(0x40)
            returndatacopy(free_mem_ptr, 0, returndatasize())

            switch success
            case 0 { revert(free_mem_ptr, returndatasize()) }
            default { return(free_mem_ptr, returndatasize()) }
        }
    }

    fallback() external {
        // delegate all other functions to current implementation
        delegateAndReturn();
    }

}
