// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakingPool is Ownable, ERC20 {
    address public stakeToken;

    event Stake(address indexed from, uint amount);
    event Unstake(address indexed to, uint amount);

    constructor(
        address stakeToken_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        require(
            stakeToken_ != address(0)
            , "StakingPool::constructor: address is 0"
        );

        stakeToken = stakeToken_;
    }

    // transfer stake tokens from user to pool
    // mint lp tokens from pool to user
    function stake(uint tokenAmount) external {
        uint amount = doTransferIn(msg.sender, stakeToken, tokenAmount);

        uint lpAmount = calcLPAmount(amount);
        _mint(msg.sender, lpAmount);

        emit Stake(msg.sender, amount);
    }

    function calcLPAmount(uint amountIn) public view returns (uint) {
        uint lpAmountOut = amountIn;

        return lpAmountOut;
    }

    // burn lp tokens from user
    // transfer stake tokens from pool to user
    function unstake(uint lpAmountIn) external {
        _burn(msg.sender, lpAmountIn);

        uint amountOut = calcAmountOut(lpAmountIn);
        doTransferOut(stakeToken, msg.sender, amountOut);

        emit Unstake(msg.sender, amountOut);
    }

    function calcAmountOut(uint lpAmountIn) public view returns (uint) {
        uint amountOut = lpAmountIn;

        return amountOut;
    }

    function doTransferIn(address from, address token, uint amount) internal returns (uint) {
        uint balanceBefore = ERC20(token).balanceOf(address(this));
        ERC20(token).transferFrom(from, address(this), amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {                       // This is a non-standard ERC-20
                success := not(0)          // set success to true
            }
            case 32 {                      // This is a compliant ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0)        // Set `success = returndata` of external call
            }
            default {                      // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }
        require(success, "TOKEN_TRANSFER_IN_FAILED");

        // Calculate the amount that was *actually* transferred
        uint balanceAfter = ERC20(token).balanceOf(address(this));
        require(balanceAfter >= balanceBefore, "TOKEN_TRANSFER_IN_OVERFLOW");
        return balanceAfter - balanceBefore;   // underflow already checked above, just subtract
    }

    function doTransferOut(address token, address to, uint amount) internal {
        ERC20(token).transfer(to, amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {                      // This is a non-standard ERC-20
                success := not(0)          // set success to true
            }
            case 32 {                     // This is a complaint ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0)        // Set `success = returndata` of external call
            }
            default {                     // This is an excessively non-compliant ERC-20, revert.
                revert(0, 0)
            }
        }
        require(success, "TOKEN_TRANSFER_OUT_FAILED");
    }
}
