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

    uint public timeNormalizer = 365 days;
    uint public stakeCounter;

    struct StakeData {
        address staker;
        uint stakeTime;
        uint holdTime;
        uint lpAmount;
    }

    mapping(uint => StakeData) public stakes;

    event Stake(uint stakeId, address indexed from, uint lpAmountOut);
    event Unstake(uint stakeId, address indexed to, uint stakeTokenAmountOut);

    function initialize(
        address whitelist_,
        address stakeToken_,
        string memory name_,
        string memory symbol_
    ) public {
        require(
            whitelist_ != address(0)
            && stakeToken_ != address(0),
            "ImplAndTerms::initialize: address is 0"
        );

        whitelist = whitelist_;
        stakeToken = stakeToken_;

        refererBonusPercent = 0.5e18; // 0.5%
        influencerBonusPercent = 0.75e18; // 0.75%
        developerBonusPercent = 0.2e18; // 0.2%
        timeBonusPercent = 10e18; // 10%

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
        stakeInternal(msg.sender, tokenAmount, holdTime, referer, address(0), false);
    }

    function stake(uint tokenAmount, uint holdTime, address referer, address influencer) public {
        stakeInternal(msg.sender, tokenAmount, holdTime, referer, influencer, false);
    }

    function stake(uint tokenAmount, uint holdTime, address referer, address influencer, bool donatForDeveloper) public {
        stakeInternal(msg.sender, tokenAmount, holdTime, referer, influencer, donatForDeveloper);
    }

    function stakeInternal(address staker, uint tokenAmount, uint holdTime, address referer, address influencer, bool donatsForDevelopers) internal {
        require(
            referer != staker && influencer != staker,
            "ImplAndTerms::stakeInternal: referer of influencer address equals to staker address"
        );

        uint amountIn = doTransferIn(staker, stakeToken, tokenAmount);

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

        stakeCounter++;
        stakes[stakeCounter] = StakeData({staker: staker, stakeTime: block.timestamp, holdTime: holdTime, lpAmount: lpAmountOut});

        emit Stake(stakeCounter, staker, lpAmountOut);
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
    function unstake(uint stakeId) external {
        uint[] memory stakeIds = new uint[](1);
        stakeIds[0] = stakeId;

        unstake(stakeIds);
    }

    function unstake(uint[] memory stakeIds) public {
        uint allLpAmountOut;
        uint stakeTokenAmountOut;

        for (uint i = 0; i < stakeIds.length; i++) {
            address staker = stakes[stakeIds[i]].staker;

            require(msg.sender == staker, "ImplAndTerms::unstake: msg.sender is not staker");

            uint lpAmountOut = stakes[stakeIds[i]].lpAmount;
            allLpAmountOut += lpAmountOut;

            uint amountOut = calcAmountOut(lpAmountOut);
            stakeTokenAmountOut += amountOut;

            emit Unstake(stakeIds[i], msg.sender, amountOut);
        }

        _burn(msg.sender, allLpAmountOut);
        doTransferOut(stakeToken, msg.sender, stakeTokenAmountOut);
    }

    function calcAmountOut(uint lpAmountIn) public pure returns (uint) {
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

    function getDeveloperAddress() public pure returns (address) {
        return 0x8aA2ccb35f90EFf1c6f38ed43e550b67E8aDC728;
    }
}
