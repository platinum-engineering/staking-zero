// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20Init.sol";
import "./Storage.sol";
import "./Whitelist.sol";

contract ImplAndTerms is Storage, Ownable, ERC20Init {
    address public whitelist;
    address public stakeToken;

    uint public refererBonusPercent;
    uint public influencerBonusPercent;
    uint public developerBonusPercent;
    uint public timeBonusPercent;

    uint public timeNormalizer;
    uint public unHoldFee;

    // for inflation
    uint public inflationPercent;
    address public reservoir;
    uint public totalStaked;
    uint public accrualBlockTimestamp;
    uint public inflationRatePerSec;

    struct StakeData {
        uint lpAmount;
        uint stakeTime;
        uint holdTime;
        bool status; // true is active
    }

    mapping(address => StakeData[]) public userStakes;

    event Stake(address indexed staker, uint userStakeId, uint lpAmountOut, uint holdTime);
    event Unstake(address indexed staker, uint userStakeId, uint stakeTokenAmountOut);

    event AccrueInterest(uint interestAccumulated, uint totalStaked);

    function initialize(
        address whitelist_,
        address stakeToken_,
        address reservoir_,
        string memory name_,
        string memory symbol_
    ) public {
        require(whitelist == address(0) && stakeToken == address(0), "ImplAndTerms::initialize: may only be initialized once");

        require(
            whitelist_ != address(0)
            && stakeToken_ != address(0)
            && reservoir_ != address(0),
            "ImplAndTerms::initialize: address is 0"
        );

        whitelist = whitelist_;
        stakeToken = stakeToken_;

        refererBonusPercent = 0.5e18; // 0.5%
        influencerBonusPercent = 0.75e18; // 0.75%
        developerBonusPercent = 0.2e18; // 0.2%
        timeBonusPercent = 10e18; // 10%
        unHoldFee = 20e18; // 20%
        inflationPercent = 5e18; // 5%

        timeNormalizer = 365 days;

        reservoir = reservoir_;
        accrualBlockTimestamp = getBlockTimestamp();
        inflationRatePerSec = inflationPercent / 365 days;

        super.initialize(name_, symbol_);
    }

    // transfer stake tokens from user to pool
    // mint lp tokens from pool to user
    function stake(uint tokenAmount) public {
        stakeInternal(msg.sender, tokenAmount, 0, address(0), address(0), false);
    }

    function stake(uint tokenAmount, uint holdTime) public {
        stakeInternal(msg.sender, tokenAmount, holdTime, address(0), address(0), false);
    }

    function stake(uint tokenAmount, uint holdTime, address referer) public {
        stakeInternal(msg.sender, tokenAmount, holdTime, referer, address(0), true);
    }

    function stake(uint tokenAmount, uint holdTime, address referer, address influencer) public {
        stakeInternal(msg.sender, tokenAmount, holdTime, referer, influencer, true);
    }

    function stakeInternal(address staker, uint tokenAmount, uint holdTime, address referer, address influencer, bool donatsForDevelopers) internal {
        require(
            referer != staker && influencer != staker,
            "ImplAndTerms::stakeInternal: referer of influencer address equals to staker address"
        );

        accrueInterest();

        uint amountIn = doTransferIn(staker, stakeToken, tokenAmount);
        totalStaked += amountIn;

        uint stakerLpAmount = calcStakerLPAmount(amountIn, holdTime);

        stakeFresh(staker, holdTime, stakerLpAmount);

        if (referer != address(0)) {
            stakeFresh(referer, 0, calcRefererLPAmount(amountIn));
        }

        if (influencer != address(0)) {
            bool isInfluencer = WhiteList(whitelist).getWhiteListStatus(influencer);

            require(isInfluencer, "ImplAndTerms::stakeInternal: influencer is not in whitelist");

            stakeFresh(influencer, 0, calcInfluencerLpAmount(amountIn));
        }

        if (donatsForDevelopers) {
            stakeFresh(getDeveloperAddress(), 0, calcDeveloperLPAmount(amountIn));
        }
    }

    function stakeFresh(address staker, uint holdTime, uint lpAmountOut) internal {
        _mint(staker, lpAmountOut);

        userStakes[staker].push(StakeData({lpAmount: lpAmountOut, stakeTime: block.timestamp, holdTime: holdTime, status: true}));

        emit Stake(staker, userStakes[staker].length, lpAmountOut, holdTime);
    }

    function calcAllLPAmountOut(uint amountIn, uint holdTime) public view returns (uint, uint, uint, uint) {
        uint stakerLpAmountOut = calcStakerLPAmount(amountIn, holdTime);
        uint refererLpAmountOut = calcRefererLPAmount(amountIn);
        uint influencerLpAmountOut = calcInfluencerLpAmount(amountIn);
        uint developerLpAmountOut = calcDeveloperLPAmount(amountIn);

        return (stakerLpAmountOut, refererLpAmountOut, influencerLpAmountOut, developerLpAmountOut);
    }

    function calcStakerLPAmount(uint amountIn, uint holdTime) public view returns (uint) {
        return amountIn + calcBonusTime(amountIn, holdTime);
    }

    function calcBonusTime(uint amount, uint holdTime) public view returns (uint) {
        return amount * holdTime * timeBonusPercent / 100e18 / timeNormalizer;
    }

    function calcRefererLPAmount(uint amountIn) public view returns (uint) {
        return amountIn * refererBonusPercent / 100e18;
    }

    function calcInfluencerLpAmount(uint amountIn) public view returns (uint) {
        return amountIn * influencerBonusPercent / 100e18;
    }

    function calcDeveloperLPAmount(uint amountIn) public view returns (uint) {
        return amountIn * developerBonusPercent / 100e18;
    }

    // burn lp tokens from user
    // transfer stake tokens from pool to user
    function unstake(uint userStakeId) external {
        uint[] memory userStakeIds = new uint[](1);
        userStakeIds[0] = userStakeId;

        unstake(userStakeIds);
    }

    function unstake(uint[] memory userStakeIds) public {
        accrueInterest();

        uint allLpAmountOut;
        uint stakeTokenAmountOut;
        uint lpAmountOut;
        uint stakeTime;
        uint holdTime;
        bool status;

        for (uint i = 0; i < userStakeIds.length; i++) {
            require(userStakeIds[i] < userStakes[msg.sender].length, "ImplAndTerms::unstake: stake is not exist");

            (lpAmountOut, stakeTime, holdTime, status) = getUserStake(msg.sender, userStakeIds[i]);

            require(status, "ImplAndTerms::unstake: stake is not active");

            allLpAmountOut += lpAmountOut;

            uint amountOut = calcAmountOut(lpAmountOut, block.timestamp, stakeTime, holdTime);
            stakeTokenAmountOut += amountOut;

            userStakes[msg.sender][userStakeIds[i]].status = false;

            emit Unstake(msg.sender, userStakeIds[i], amountOut);
        }

        _burn(msg.sender, allLpAmountOut);
        totalStaked -= stakeTokenAmountOut;
        doTransferOut(stakeToken, msg.sender, stakeTokenAmountOut);
    }

    function calcAmountOut(uint lpAmountIn, uint timestamp, uint stakeTime, uint holdTime) public view returns (uint) {
        uint tokenAmountOut = ERC20(stakeToken).balanceOf(address(this)) * lpAmountIn / totalSupply();

        uint feeAmount;
        uint delta = (timestamp - stakeTime);

        if (delta < holdTime) {
            feeAmount = tokenAmountOut * unHoldFee * delta / holdTime / 100e18;
        }

        return tokenAmountOut - feeAmount;
    }

    function accrueInterest() public {
        /* Remember the initial block timestamp */
        uint currentBlockTimestamp = getBlockTimestamp();

        /* Short-circuit accumulating 0 interest */
        if (accrualBlockTimestamp == currentBlockTimestamp) {
            return;
        }

        /* Calculate the time of timestamps elapsed since the last accrual */
        uint timeDelta = currentBlockTimestamp - accrualBlockTimestamp;

        /*
         * Calculate the interest accumulated:
         *  interestAccumulated = inflationRatePerSec * timeDelta * totalStaked
         *  totalStakedNew = interestAccumulated + totalStaked
         */

        uint interestAccumulated = inflationRatePerSec * timeDelta * totalStaked  / 100e18;
        doTransferIn(reservoir, stakeToken, interestAccumulated);

        totalStaked = totalStaked + interestAccumulated;

        /* We write the previously calculated values into storage */
        accrualBlockTimestamp = currentBlockTimestamp;

        emit AccrueInterest(interestAccumulated, totalStaked);
    }

    function getDeveloperAddress() public pure returns (address) {
        return 0x8aA2ccb35f90EFf1c6f38ed43e550b67E8aDC728;
    }

    function getUserStake(address user, uint id) public view returns (uint, uint, uint, bool) {
        return (userStakes[user][id].lpAmount, userStakes[user][id].stakeTime, userStakes[user][id].holdTime, userStakes[user][id].status);
    }

    function getAllUserStakes(address user) public view returns (StakeData[] memory) {
        return userStakes[user];
    }

    function getActiveUserStakes(address user) public view returns (StakeData[] memory) {
        StakeData[] memory allUserActiveStakesTmp = new StakeData[](userStakes[user].length);
        uint j = 0;
        for (uint i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].status) {
                allUserActiveStakesTmp[j] = userStakes[user][i];
                j++;
            }
        }

        StakeData[] memory allUserActiveStakes = new StakeData[](j);
        for (uint i = 0; i < j; i++) {
            allUserActiveStakes[i] = allUserActiveStakesTmp[i];
        }

        return allUserActiveStakes;
    }

    function getTokenAmountAfterUnstake(uint stakeUserId) public view returns (uint) {
        StakeData memory stakeData = userStakes[msg.sender][stakeUserId];

        require(stakeData.status, "ImplAndTerms::getTokenAmountAfterUnstake: stake is not active");

        return calcAmountOut(stakeData.lpAmount, block.timestamp, stakeData.stakeTime, stakeData.holdTime);
    }

    function getTokenAmountAfterAllUnstakes(address user) public view returns (uint) {
        uint stakeTokenAmountOut;
        uint lpAmountOut;
        uint stakeTime;
        uint holdTime;
        bool status;

        for (uint i = 0; i < userStakes[user].length; i++) {
            (lpAmountOut, stakeTime, holdTime, status) = getUserStake(msg.sender, i);

            if (status) {
                uint amountOut = calcAmountOut(lpAmountOut, block.timestamp, stakeTime, holdTime);
                stakeTokenAmountOut += amountOut;
            }
        }

        return stakeTokenAmountOut;
    }

    /**
     * @dev Function to simply retrieve block number
     *  This exists mainly for inheriting test contracts to stub this result.
     */
    function getBlockTimestamp() internal virtual view returns (uint) {
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
