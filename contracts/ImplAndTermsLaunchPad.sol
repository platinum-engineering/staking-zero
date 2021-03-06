// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Init.sol";
import "./Storage.sol";
import "./Whitelist.sol";

contract ImplAndTermsLaunchPad is Storage, Ownable {
    address public stakeToken;

    uint public minStakeAmount;
    uint public maxStakeAmount;
    uint public maxTotalStakeAmount;
    uint public unStakeTime;
    uint public totalStakeAmount;

    bool public pauseStake;

    address[] public users;

    struct StakeData {
        uint amount;
        uint stakeTime;
    }

    mapping(address => StakeData) public userStakes;

    event Stake(address indexed staker, uint userId, uint amountIn, uint stakeTime);
    event Unstake(address indexed staker, uint amountOut);

    function initialize(
        address notUsed1_, // for interface only
        address stakeToken_,
        address notUsed2_, // for interface only
        string memory notUsed3_, // for interface only
        string memory notUsed4_ // for interface only
    ) public {
        require(stakeToken == address(0), "ImplAndTerms::initialize: may only be initialized once");

        // silence warnings
        notUsed1_;
        notUsed2_;
        notUsed3_;
        notUsed4_;

        require(
            stakeToken_ != address(0),
            "ImplAndTerms::initialize: address is 0"
        );

        stakeToken = stakeToken_;

        minStakeAmount = 5_000 * (10 ** ERC20Init(stakeToken_).decimals());
        maxStakeAmount = 100_000 * (10 ** ERC20Init(stakeToken_).decimals());
        maxTotalStakeAmount = 100_000_000 * (10 ** ERC20Init(stakeToken_).decimals());

        unStakeTime = 7 days;
    }

    function setStakeAmounts(uint minStakeAmount_, uint maxStakeAmount_) public onlyOwner {
        require(minStakeAmount_ <= maxStakeAmount_, "ImplAndTerms::setStakeAmounts: max amount must be more than min amount");

        minStakeAmount = minStakeAmount_;
        maxStakeAmount = maxStakeAmount_;
    }

    function setMaxTotalStakeAmount(uint maxTotalStakeAmount_) public onlyOwner {
        maxTotalStakeAmount = maxTotalStakeAmount_;
    }

    function setPauseStake(bool pauseStake_) public onlyOwner {
        pauseStake = pauseStake_;
    }

    function setUnStakeTime(uint _newUnStakeTime) public onlyOwner {
        unStakeTime = _newUnStakeTime;
    }

    // transfer stake tokens from user to pool
    function stake(uint tokenAmount) public {
        require(!pauseStake, 'ImplAndTerms::stake: stake is paused');

        address staker = msg.sender;

        uint amountIn = doTransferIn(staker, stakeToken, tokenAmount);
        uint stakeAmount = userStakes[staker].amount;

        require(amountIn + totalStakeAmount <= maxTotalStakeAmount, 'ImplAndTerms::stake: total stake amount must be less than max total stake amount');
        require(minStakeAmount <= amountIn + stakeAmount, 'ImplAndTerms::stake: stake amount must be more than min stake amount');
        require(amountIn + stakeAmount <= maxStakeAmount, 'ImplAndTerms::stake: stake amount must be less than max stake amount');

        totalStakeAmount += amountIn;

        uint stakerId = users.length;
        uint stakeTime = getBlockTimestamp();

        userStakes[staker].amount += amountIn;
        userStakes[staker].stakeTime = stakeTime;
        users.push(staker);

        emit Stake(staker, stakerId, amountIn, stakeTime);
    }

    // transfer stake tokens from pool to user
    function unstake(uint amount) public {
        address staker = msg.sender;
        uint stakeAmount = userStakes[staker].amount;
        uint stakeTime = userStakes[staker].stakeTime;

        require(stakeAmount >= amount, "ImplAndTerms::unstake: amount more than stake amount");
        require(getBlockTimestamp() - stakeTime > unStakeTime, "ImplAndTerms::unstake: bad timing for request");

        userStakes[staker].amount = stakeAmount - amount;

        doTransferOut(stakeToken, msg.sender, amount);

        emit Unstake(msg.sender, amount);
    }

    function getUserStake(uint userId) public view returns (uint, uint) {
        address staker = users[userId];

        return (userStakes[staker].amount, userStakes[staker].stakeTime);
    }

    function getUsersCount() public view returns (uint) {
        return users.length;
    }

    function getUser(uint _userId) public view returns (address) {
        return users[_userId];
    }

    /**
     * @dev Function to simply retrieve block number
     *  This exists mainly for inheriting test contracts to stub this result.
     */
    function getBlockTimestamp() public virtual view returns (uint) {
        return block.timestamp;
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
