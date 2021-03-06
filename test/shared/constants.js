const { ethers } = require('hardhat');
const ADDRESS_ZERO = ethers.constants.AddressZero;

const STAKE_TOKEN_NAME = 'Stake Token';
const STAKE_TOKEN_SYMBOL = 'STK';
const DEPLOY_STAKE_TOKEN_AMOUNT = '100000000000000000000'; // 100e18
const LP_TOKEN_NAME = `Staking LP ${STAKE_TOKEN_NAME}`;
const LP_TOKEN_SYMBOL = `StLP ${STAKE_TOKEN_SYMBOL}`;
const REFERER_BONUS_PERCENT = 0.5;
const INFLUENCER_BONUS_PERCENT = 0.75;
const DEVELOPER_BONUS_PERCENT = 0.2;
const TIME_BONUS_PERCENT = 10;
const TIME_NORMALIZER = 365 * 24 * 60 * 60; // 365 days
const STAKE_TOKEN_AMOUNT = '1000000000000000000'; // 1e18
const HOLD_TIME = 400 * 24 * 60 * 60; // 400 days
const UNHOLD_FEE_PERCENT = 20;
const TIME_DIFF_LT_HOLD_TIME = 12 * 60 * 60;
const TIME_DIFF_GT_HOLD_TIME = 48 * 60 * 60;
const INIT_TIME = 1662319864;

module.exports = {
    STAKE_TOKEN_NAME,
    STAKE_TOKEN_SYMBOL,
    DEPLOY_STAKE_TOKEN_AMOUNT,
    LP_TOKEN_NAME,
    LP_TOKEN_SYMBOL,
    REFERER_BONUS_PERCENT,
    INFLUENCER_BONUS_PERCENT,
    DEVELOPER_BONUS_PERCENT,
    TIME_BONUS_PERCENT,
    TIME_NORMALIZER,
    STAKE_TOKEN_AMOUNT,
    ADDRESS_ZERO,
    HOLD_TIME,
    UNHOLD_FEE_PERCENT,
    TIME_DIFF_LT_HOLD_TIME,
    TIME_DIFF_GT_HOLD_TIME,
    INIT_TIME,
};
