// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "./utils/ERC20Token.sol";

contract Reservoir {

    /// @notice The block number when the Reservoir started (immutable)
    uint public dripStart;

    /// @notice Tokens per block that to drip to target (immutable)
    uint public dripRate;

    /// @notice Reference to token to drip (immutable)
    address public stakeToken;

    /// @notice Target to receive dripped tokens (immutable)
    address public target;

    /// @notice Amount that has already been dripped
    uint public dripped;

    /**
      * @notice Constructs a Reservoir
      * @param dripRate_ Numer of tokens per block to drip
      * @param stakeToken_ The token to drip
      * @param target_ The recipient of dripped tokens
      */
    constructor(uint dripRate_, address stakeToken_, address target_) {
        dripStart = block.number;
        dripRate = dripRate_;
        stakeToken = stakeToken_;
        target = target_;
        dripped = 0;
    }

    /**
      * @notice Drips the maximum amount of tokens to match the drip rate since inception
      * @dev Note: this will only drip up to the amount of tokens available.
      * @return The amount of tokens dripped in this call
      */
    function drip() public returns (uint) {
        // First, read storage into memory
        address token_ = stakeToken;
        uint reservoirBalance_ = ERC20Token(token_).balanceOf(address(this)); // TODO: Verify this is a static call
        uint dripRate_ = dripRate;
        uint dripStart_ = dripStart;
        uint dripped_ = dripped;
        address target_ = target;
        uint blockNumber_ = block.number;

        // Next, calculate intermediate values
        uint dripTotal_ = dripRate_ * (blockNumber_ - dripStart_);
        uint deltaDrip_ = dripTotal_ - dripped_;
        uint toDrip_ = min(reservoirBalance_, deltaDrip_);
        uint drippedNext_ = dripped_ + toDrip_;

        // Finally, write new `dripped` value and transfer tokens to target
        dripped = drippedNext_;
        ERC20Token(token_).transfer(target_, toDrip_);

        return toDrip_;
    }

    function min(uint a, uint b) internal pure returns (uint) {
        if (a <= b) {
            return a;
        } else {
            return b;
        }
    }
}