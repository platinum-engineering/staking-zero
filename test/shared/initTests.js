const {ethers} = require('hardhat');
const constants = require('./constants');
const utils = require('./utils');
const enums = require('./enums');
const { expect } = require('chai');
const BN = ethers.BigNumber.from;

const init = async () => {
    const [
        StakeToken,
        StakingPoolFactory,
        StakingPool,
        ImplAndTerms,
        ImplAndTermsLaunchPad,
        Whitelist,
        Reservoir,
        ERC20Init
    ] = await utils.getContractFactories();

    const [
        OWNER,
        STAKER,
        REFERER,
        INFLUENCER,
        ...otherAccounts
    ] = await ethers.getSigners();

    const getStakeToken = async () => StakeToken.deploy(
        constants.DEPLOY_STAKE_TOKEN_AMOUNT,
        constants.STAKE_TOKEN_NAME,
        constants.STAKE_TOKEN_SYMBOL
    );
    
    const calcStakerAmountWithTimeBonus = (amount, holdTime) =>
        BN(amount).add(BN(amount).mul(holdTime).mul(constants.TIME_BONUS_PERCENT).div(100).div(constants.TIME_NORMALIZER));

    const calcAmountWithTimeBonus = (amount, holdTime) =>
        BN(amount).add(BN(amount).mul(holdTime).mul(constants.TIME_BONUS_PERCENT)).div(100);
    
    const data = {
        ...constants,
        ...enums,
        StakeToken,
        StakingPoolFactory,
        StakingPool,
        ImplAndTerms,
        ImplAndTermsLaunchPad,
        Whitelist,
        Reservoir,
        ERC20Init,
        OWNER,
        STAKER,
        REFERER,
        INFLUENCER,
        DEVELOPER: otherAccounts[5],
        DEVELOPER_BONUS_LP_AMOUNT: constants.STAKE_TOKEN_AMOUNT * constants.DEVELOPER_BONUS_PERCENT / 100,
        REFERER_BONUS_LP_AMOUNT: constants.STAKE_TOKEN_AMOUNT * constants.REFERER_BONUS_PERCENT / 100,
        INFLUENCER_BONUS_LP_AMOUNT: constants.STAKE_TOKEN_AMOUNT * constants.INFLUENCER_BONUS_PERCENT / 100,
    };
    
    const deployOneContract = async (name) => data[name].deploy();
    const deployManyContracts = async (names) => Promise.all(names.map(name => data[name].deploy()));
    
    const STAKER_AMOUNT_WITH_TIME_BONUS = calcStakerAmountWithTimeBonus(constants.STAKE_TOKEN_AMOUNT, constants.HOLD_TIME);
    const REFERER_AMOUNT_WITH_TIME_BONUS = calcAmountWithTimeBonus(data.REFERER_BONUS_LP_AMOUNT, constants.HOLD_TIME);
    const INFLUENCER_AMOUNT_WITH_TIME_BONUS = calcAmountWithTimeBonus(data.INFLUENCER_BONUS_LP_AMOUNT, constants.HOLD_TIME);
    const DEVELOPER_AMOUNT_WITH_TIME_BONUS = calcAmountWithTimeBonus(data.DEVELOPER_BONUS_LP_AMOUNT, constants.HOLD_TIME);
    
    const calcStakerAmountWithFee = () =>
        BN(STAKER_AMOUNT_WITH_TIME_BONUS).sub(BN(STAKER_AMOUNT_WITH_TIME_BONUS).mul(constants.UNHOLD_FEE_PERCENT).mul(constants.TIME_DIFF_LT_HOLD_TIME).div(constants.HOLD_TIME).div(100));
    
    const checkUserStakes = async (contract, data) => {
        const p = [];
        for (const item of data) {
            const { account, indexes, amounts, holdTimes, statuses } = item;
            for (let i = 0; i < indexes.length; i ++) {
                p.push(contract.userStakes(account.address, i).then(res => {
                    expect(res[0]).to.be.equal(amounts[i]);
                    expect(res[2]).to.be.equal(holdTimes[i]);
                    expect(res[3]).to.be.equal(statuses[i]);
                }));
            }
        }
        return Promise.all(p);
    };
    
    const getCurrentBlockTimestamp = async () => {
        const blockNum = await ethers.provider.getBlockNumber();
        const block = await ethers.provider.getBlock(blockNum);
        return block.timestamp;
    }

    return {
        ...data,
        deployOneContract,
        deployManyContracts,
        getAddressIs0ErrorMessage: utils.getAddressIs0ErrorMessage,
        getStakeToken,
        calcStakerAmountWithTimeBonus,
        STAKER_AMOUNT_WITH_TIME_BONUS,
        REFERER_AMOUNT_WITH_TIME_BONUS,
        INFLUENCER_AMOUNT_WITH_TIME_BONUS,
        DEVELOPER_AMOUNT_WITH_TIME_BONUS,
        calcStakerAmountWithFee,
        checkUserStakes,
        BN,
        getCurrentBlockTimestamp,
    };
}

module.exports = init;
