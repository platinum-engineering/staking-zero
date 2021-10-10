const { expect } = require('chai');
const { network } = require('hardhat');

const init = require('./shared/initTests');

describe('Staking pool', async () => {

    let stakeToken;
    let implAndTerms;
    let whitelist;
    let helper;
    let stakingPool;
    let implemented;
    let reservoir;

    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        stakeToken = await helper.getStakeToken();
        [implAndTerms, whitelist, reservoir] = await helper.deployManyContracts(['ImplAndTerms', 'Whitelist', 'Reservoir']);
        stakingPool = await helper.StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, reservoir.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL);
        implemented = helper.ImplAndTerms.attach(stakingPool.address);
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                expect(stakingPool.address).not.to.be.equal(helper.ADDRESS_ZERO);
                expect(await implemented.stakeToken()).to.be.equal(stakeToken.address);
                expect(await implemented.implementation()).to.be.equal(implAndTerms.address);
                expect(await implemented.name()).to.be.equal(helper.LP_TOKEN_NAME);
                expect(await implemented.symbol()).to.be.equal(helper.LP_TOKEN_SYMBOL);
                expect(await implemented.owner()).to.be.equal(helper.OWNER.address);
            });

            it('Should fail deploy Staking Pool due to zero implementation address', async () => {
                await expect(helper.StakingPool.deploy(helper.ADDRESS_ZERO, whitelist.address, stakeToken.address, reservoir.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail deploy Staking Pool due to zero stake token address', async () => {
                await expect(helper.StakingPool.deploy(implAndTerms.address, whitelist.address, helper.ADDRESS_ZERO, reservoir.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail initialize already initialized ImplAndTerms', async () => {
                await expect(implemented['initialize(address,address,address,string,string)'](helper.ADDRESS_ZERO, helper.ADDRESS_ZERO, reservoir.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(helper.revertMessages.mayOnlyBeInitializedOnce);
            });
        });

        describe('Stake', async () => {
            it('Should fail due to not enough balance', async () => {
                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT))
                    .to.be.revertedWith(helper.revertMessages.transferAmountExceedsBalance);
            });

            it('Should success stake', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(helper.STAKER.address);

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT))
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, helper.STAKE_TOKEN_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(helper.STAKER.address);

                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [{
                    account: helper.STAKER,
                    indexes: [0],
                    amounts: [helper.STAKE_TOKEN_AMOUNT],
                    holdTimes: [0],
                    statuses: [true],
                }]);
            });

            it('Should success stake with holdTime', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);
                    return tx;
                })
                    .to.changeTokenBalance(implemented, helper.STAKER, helper.STAKER_AMOUNT_WITH_TIME_BONUS);

                expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [{
                    account: helper.STAKER,
                    indexes: [0],
                    amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                    holdTimes: [helper.HOLD_TIME],
                    statuses: [true],
                }]);
            });

            it('Should success stake with referer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.REFERER.address
                    );
                    return tx;
                })
                    .to.changeTokenBalances(implemented, [helper.STAKER, helper.REFERER, helper.DEVELOPER], [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.REFERER_BONUS_LP_AMOUNT, helper.DEVELOPER_BONUS_LP_AMOUNT]);

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.REFERER.address, 1, helper.REFERER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.DEVELOPER.address, 1, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [true],
                    },
                    {
                        account: helper.REFERER,
                        indexes: [0],
                        amounts: [helper.REFERER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    },
                    {
                        account: helper.DEVELOPER,
                        indexes: [0],
                        amounts: [helper.DEVELOPER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    }
                ]);
            });

            it('Should fail due to referer address equals to msg.sender', async () => {
                await expect(implemented.connect(helper.STAKER)['stake(uint256,uint256,address)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.STAKER.address))
                    .to.be.revertedWith(helper.revertMessages.refererOrInfluencerEqualsToSender);
            });

            it('Should success stake with influencer without referer', async () => {
                await whitelist.addWhiteList(helper.INFLUENCER.address);

                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address,  helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.ADDRESS_ZERO,
                        helper.INFLUENCER.address
                    );
                    return tx;
                })
                    .to.changeTokenBalances(implemented, [helper.STAKER, helper.INFLUENCER, helper.DEVELOPER], [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.INFLUENCER_BONUS_LP_AMOUNT, helper.DEVELOPER_BONUS_LP_AMOUNT]);

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.INFLUENCER.address, 1, helper.INFLUENCER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.DEVELOPER.address, 1, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [true],
                    },
                    {
                        account: helper.INFLUENCER,
                        indexes: [0],
                        amounts: [helper.INFLUENCER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    },
                    {
                        account: helper.DEVELOPER,
                        indexes: [0],
                        amounts: [helper.DEVELOPER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    }
                ]);
            });

            it('Should fail stake with influencer due to influencer is not in whitelist', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address,  helper.STAKE_TOKEN_AMOUNT);
                await expect(implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address)'](
                    helper.STAKE_TOKEN_AMOUNT,
                    helper.HOLD_TIME,
                    helper.ADDRESS_ZERO,
                    helper.INFLUENCER.address
                )).to.be.revertedWith(helper.revertMessages.influencerIsNotInWhitelist);
            });

            it('Should fail due to influencer address equals to msg.sender', async () => {
                await expect(implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.ADDRESS_ZERO, helper.STAKER.address))
                    .to.be.revertedWith(helper.revertMessages.refererOrInfluencerEqualsToSender);
            });

            it('Should success stake with influencer with referer', async () => {
                await whitelist.addWhiteList(helper.INFLUENCER.address);

                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address,  helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.REFERER.address,
                        helper.INFLUENCER.address
                    );
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER, helper.REFERER, helper.INFLUENCER, helper.DEVELOPER],
                        [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.REFERER_BONUS_LP_AMOUNT, helper.INFLUENCER_BONUS_LP_AMOUNT, helper.DEVELOPER_BONUS_LP_AMOUNT]
                    );
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.REFERER.address, 1, helper.REFERER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.INFLUENCER.address, 1, helper.INFLUENCER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.DEVELOPER.address, 1, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [true],
                    },
                    {
                        account: helper.REFERER,
                        indexes: [0],
                        amounts: [helper.REFERER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    },
                    {
                        account: helper.INFLUENCER,
                        indexes: [0],
                        amounts: [helper.INFLUENCER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    },
                    {
                        account: helper.DEVELOPER,
                        indexes: [0],
                        amounts: [helper.DEVELOPER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [true],
                    }
                ]);
            });

        });

        describe('Unstake', async () => {
            it('Should fail due to stake is not exist', async () => {
                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](0))
                    .to.be.revertedWith(helper.revertMessages.stakeIsNotExist);
            });

            it('Should fail due to stake is not active', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['unstake(uint256)'](0);

                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](0))
                    .to.be.revertedWith(helper.revertMessages.stakeIsNotActive);
            });

            it('Should success unstake without holdTime', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['unstake(uint256)'](0);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER],
                        [`-${helper.STAKE_TOKEN_AMOUNT}`]
                    );

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.STAKER.address, 0, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKE_TOKEN_AMOUNT],
                        holdTimes: [0],
                        statuses: [false],
                    }
                ]);
            });

            it('Should success unstake with holdTime and fee', async () => {
                await stakeToken.transfer(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);

                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(helper.STAKER.address);
                const stakeData = await implemented.userStakes(helper.STAKER.address, 0);
                const stakeTime = stakeData[1];

                await network.provider.send('evm_setNextBlockTimestamp', [stakeTime.add(helper.TIME_DIFF_LT_HOLD_TIME).toNumber()]);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['unstake(uint256)'](0);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER],
                        [`-${stakingPoolUserBalanceBefore}`]
                    );

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.STAKER.address, 0, helper.calcStakerAmountWithFee());

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(+helper.calcStakerAmountWithFee());
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(+helper.calcStakerAmountWithFee());

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [false],
                    },
                ]);
            });

            it('Should success unstake bonus Lp from referer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256,address)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.REFERER.address);

                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceBefore = await stakeToken.balanceOf(helper.REFERER.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.REFERER)['unstake(uint256)'](0);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.REFERER],
                        [`-${helper.REFERER_BONUS_LP_AMOUNT}`]
                    );

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.REFERER.address, 0, helper.REFERER_BONUS_LP_AMOUNT);

                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(helper.REFERER.address);

                expect(stakeTokenRefererBalanceAfter - stakeTokenRefererBalanceBefore).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [true],
                    },
                    {
                        account: helper.REFERER,
                        indexes: [0],
                        amounts: [helper.REFERER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [false],
                    }
                ]);
            });

            it('Should success unstake bonus Lp from influencer', async () => {
                await whitelist.addWhiteList(helper.INFLUENCER.address);

                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.ADDRESS_ZERO, helper.INFLUENCER.address);

                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeTokenInfluencerBalanceBefore = await stakeToken.balanceOf(helper.INFLUENCER.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.INFLUENCER)['unstake(uint256)'](0);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.INFLUENCER],
                        [`-${helper.INFLUENCER_BONUS_LP_AMOUNT}`]
                    );

                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.INFLUENCER.address, 0, helper.INFLUENCER_BONUS_LP_AMOUNT);

                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(helper.INFLUENCER.address);

                expect(stakeTokenRefererBalanceAfter - stakeTokenInfluencerBalanceBefore).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);

                await helper.checkUserStakes(implemented, [
                    {
                        account: helper.STAKER,
                        indexes: [0],
                        amounts: [helper.STAKER_AMOUNT_WITH_TIME_BONUS],
                        holdTimes: [helper.HOLD_TIME],
                        statuses: [true],
                    },
                    {
                        account: helper.INFLUENCER,
                        indexes: [0],
                        amounts: [helper.INFLUENCER_BONUS_LP_AMOUNT],
                        holdTimes: [0],
                        statuses: [false],
                    },
                ]);
            });
        });

        describe('other functions', async () => {
            it('calcAllLPAmountOut', async () => {
                const result = await implemented.calcAllLPAmountOut(helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);
                expect(result[1]).to.be.equal(helper.calcStakerAmountWithTimeBonus(helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME));
                expect(result[2]).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
                expect(result[3]).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
                expect(result[4]).to.be.equal(helper.DEVELOPER_BONUS_LP_AMOUNT);
            });

            it('getTokenAmountAfterUnstake', async () => {
                await stakeToken.connect(helper.STAKER).mint(helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                const result = await implemented.connect(helper.STAKER).getTokenAmountAfterUnstake(0);

                expect(result).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
            });

            it('getTokenAmountAfterUnstake with not active stake', async () => {
                await stakeToken.connect(helper.STAKER).mint(helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['unstake(uint256)'](0);

                let result = await implemented.connect(helper.STAKER).getTokenAmountAfterUnstake(0);

                expect(result).to.be.equal(0);
            });

            it('getTokenAmountAfterAllUnstakes', async () => {
                const amount = helper.BN(helper.STAKE_TOKEN_AMOUNT).mul(2);
                await stakeToken.transfer(helper.STAKER.address, amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                const result = await implemented.connect(helper.STAKER).getTokenAmountAfterAllUnstakes(helper.STAKER.address);

                expect(result).to.be.equal(amount);
            });

            it('getTokenAmountAfterAllUnstakes with one of stakes is not active', async () => {
                const amount = helper.BN(helper.STAKE_TOKEN_AMOUNT).mul(2);
                await stakeToken.transfer(helper.STAKER.address, amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['unstake(uint256)'](0);

                const result = await implemented.connect(helper.STAKER).getTokenAmountAfterAllUnstakes(helper.STAKER.address);

                expect(result).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
            });

            it('getAllUserStakes', async () => {
                const currentBlockTimestamp = await helper.getCurrentBlockTimestamp();
                const blockTimestamps = [currentBlockTimestamp + 1000, currentBlockTimestamp + 2000];
                const amount = helper.BN(helper.STAKE_TOKEN_AMOUNT).mul(2);
                await stakeToken.transfer(helper.STAKER.address, amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);
                await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamps[0]]);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamps[1]]);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                const result = await implemented.connect(helper.STAKER).getAllUserStakes(helper.STAKER.address);
                expect(result).to.have.lengthOf(2);
                expect(result[0][0]).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
                expect(result[0][1]).to.be.equal(blockTimestamps[0]);
                expect(result[0][2]).to.be.equal(0);
                expect(result[0][3]).to.be.equal(true);
                expect(result[1][0]).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
                expect(result[1][1]).to.be.equal(blockTimestamps[1]);
                expect(result[1][2]).to.be.equal(0);
                expect(result[1][3]).to.be.equal(true);
            });

            it('getActiveUserStakes', async () => {
                const currentBlockTimestamp = await helper.getCurrentBlockTimestamp();
                const blockTimestamps = [currentBlockTimestamp + 1000, currentBlockTimestamp + 2000];
                const amount = helper.BN(helper.STAKE_TOKEN_AMOUNT).mul(2);
                await stakeToken.transfer(helper.STAKER.address, amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);
                await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamps[0]]);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);
                await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamps[1]]);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                implemented.connect(helper.STAKER)['unstake(uint256)'](0);

                const result = await implemented.connect(helper.STAKER).getActiveUserStakes(helper.STAKER.address);

                expect(result).to.have.lengthOf(1);
                expect(result[0][0]).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
                expect(result[0][1]).to.be.equal(blockTimestamps[1]);
                expect(result[0][2]).to.be.equal(0);
                expect(result[0][3]).to.be.equal(true);
            });
        });
    });
});
