const { expect } = require('chai');

const init = require('./shared/initTests');
const { network } = require("hardhat");

describe('Staking pool', async () => {

    let stakeToken;
    let implAndTerms;
    let whitelist;
    let helper;
    let stakingPool;
    let implemented;

    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        stakeToken = await helper.getStakeToken();
        [implAndTerms, whitelist] = await helper.deployManyContracts(['ImplAndTerms', 'Whitelist']);
        stakingPool = await helper.StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL);
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
                await expect(helper.StakingPool.deploy(helper.ADDRESS_ZERO, whitelist.address, stakeToken.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail deploy Staking Pool due to zero stake token address', async () => {
                await expect(helper.StakingPool.deploy(implAndTerms.address, whitelist.address, helper.ADDRESS_ZERO, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
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
                const stakeCounterBefore = await implemented.stakeCounter();
                
                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT))
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(helper.STAKER.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakeData = await implemented.stakes(1);

                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(1);
                expect(stakeData[0]).to.be.equal(helper.STAKER.address);
                expect(stakeData[1]).to.be.equal(helper.STAKE_TOKEN_AMOUNT);
            });

            it('Should success stake with holdTime', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeCounterBefore = await implemented.stakeCounter();
                
                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);
                    return tx;
                })
                    .to.changeTokenBalance(implemented, helper.STAKER, helper.STAKER_AMOUNT_WITH_TIME_BONUS);
                
                expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME);
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakeData = await implemented.stakes(1);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(1);
                expect(stakeData[0]).to.be.equal(helper.STAKER.address);
                expect(stakeData[1]).to.be.equal(helper.STAKER_AMOUNT_WITH_TIME_BONUS);
            });

            it('Should success stake with referer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeCounterBefore = await implemented.stakeCounter();

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.REFERER.address
                    );
                    return tx;
                })
                    .to.changeTokenBalances(implemented, [helper.STAKER, helper.REFERER], [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.REFERER_BONUS_LP_AMOUNT]);
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.REFERER.address, helper.REFERER_BONUS_LP_AMOUNT, 0);
               

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2)]);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
                expect(stakesData[0][0]).to.be.equal(helper.STAKER.address);
                expect(stakesData[0][1]).to.be.equal(helper.STAKER_AMOUNT_WITH_TIME_BONUS);
                expect(stakesData[1][0]).to.be.equal(helper.REFERER.address);
                expect(stakesData[1][1]).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
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
                const stakeCounterBefore = await implemented.stakeCounter();
    
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
                    .to.changeTokenBalances(implemented, [helper.STAKER, helper.INFLUENCER], [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.INFLUENCER_BONUS_LP_AMOUNT]);
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.INFLUENCER.address, helper.INFLUENCER_BONUS_LP_AMOUNT, 0);
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2)]);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
                expect(stakesData[0][0]).to.be.equal(helper.STAKER.address);
                expect(stakesData[0][1]).to.be.equal(helper.STAKER_AMOUNT_WITH_TIME_BONUS);
                expect(stakesData[1][0]).to.be.equal(helper.INFLUENCER.address);
                expect(stakesData[1][1]).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
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
                const stakeCounterBefore = await implemented.stakeCounter();

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
                        [helper.STAKER, helper.REFERER, helper.INFLUENCER],
                        [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.REFERER_BONUS_LP_AMOUNT, helper.INFLUENCER_BONUS_LP_AMOUNT]
                    );
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.REFERER.address, helper.REFERER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(3, helper.INFLUENCER.address, helper.INFLUENCER_BONUS_LP_AMOUNT, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2), implemented.stakes(3)]);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);

                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(3);
                expect(stakesData[0][0]).to.be.equal(helper.STAKER.address);
                expect(stakesData[0][1]).to.be.equal(helper.STAKER_AMOUNT_WITH_TIME_BONUS);
                expect(stakesData[1][0]).to.be.equal(helper.REFERER.address);
                expect(stakesData[1][1]).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
                expect(stakesData[2][0]).to.be.equal(helper.INFLUENCER.address);
                expect(stakesData[2][1]).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
            });

            it('Should success stake with developer bonus without influencer without referer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeCounterBefore = await implemented.stakeCounter();
    
                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address,bool)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.ADDRESS_ZERO,
                        helper.ADDRESS_ZERO,
                        true
                    );
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER, helper.DEVELOPER],
                        [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.DEVELOPER_BONUS_LP_AMOUNT]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.DEVELOPER.address, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
            });

            it('Should success stake with developer bonus without influencer with referer', async () => {
                await stakeToken.transfer(helper.STAKER.address,  helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeCounterBefore = await implemented.stakeCounter();
    
                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address,bool)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.REFERER.address,
                        helper.ADDRESS_ZERO,
                        true
                    );
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER, helper.REFERER, helper.DEVELOPER],
                        [helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.REFERER_BONUS_LP_AMOUNT, helper.DEVELOPER_BONUS_LP_AMOUNT]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.REFERER.address, helper.REFERER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(3, helper.DEVELOPER.address, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);
                

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(3);
            });

            it('Should success stake with developer bonus with influencer with referer', async () => {
                await whitelist.addWhiteList(helper.INFLUENCER.address);

                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeCounterBefore = await implemented.stakeCounter();

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address,bool)'](
                        helper.STAKE_TOKEN_AMOUNT,
                        helper.HOLD_TIME,
                        helper.REFERER.address,
                        helper.INFLUENCER.address,
                        true
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
                    .withArgs(1, helper.STAKER.address, helper.STAKER_AMOUNT_WITH_TIME_BONUS, helper.HOLD_TIME)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(2, helper.REFERER.address, helper.REFERER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(3, helper.INFLUENCER.address, helper.INFLUENCER_BONUS_LP_AMOUNT, 0)
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(4, helper.DEVELOPER.address, helper.DEVELOPER_BONUS_LP_AMOUNT, 0);
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeCounterAfter = await implemented.stakeCounter();

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(4);
            });
        });

        describe('Unstake', async () => {
            it('Should fail due to sender is not staker', async () => {
                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](1))
                    .to.be.revertedWith(helper.revertMessages.senderIsNotStaker);
            });

            it('Should success unstake without holdTime', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
    
                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['unstake(uint256)'](1);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER],
                        [`-${helper.STAKE_TOKEN_AMOUNT}`]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(1, helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(+helper.STAKE_TOKEN_AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(-helper.STAKE_TOKEN_AMOUNT);
            });

            it('Should success unstake with holdTime and fee', async () => {
                await stakeToken.transfer(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(helper.STAKER.address);
                const stakeData = await implemented.stakes(1);
                const stakeTime = stakeData[2];
    
                await network.provider.send('evm_setNextBlockTimestamp', [stakeTime.add(helper.TIME_DIFF_LT_HOLD_TIME).toNumber()]);
                
                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.STAKER)['unstake(uint256)'](1);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.STAKER],
                        [`-${stakingPoolUserBalanceBefore}`]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(1, helper.STAKER.address, helper.calcStakerAmountWithFee());
                
                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(+helper.calcStakerAmountWithFee());
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(+helper.calcStakerAmountWithFee());
            });

            it('Should success unstake bonus Lp from referer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256,address)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.REFERER.address);

                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceBefore = await stakeToken.balanceOf(helper.REFERER.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.REFERER)['unstake(uint256)'](2);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.REFERER],
                        [`-${helper.REFERER_BONUS_LP_AMOUNT}`]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(2, helper.REFERER.address, helper.REFERER_BONUS_LP_AMOUNT);
    
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(helper.REFERER.address);

                expect(stakeTokenRefererBalanceAfter - stakeTokenRefererBalanceBefore).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
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
                    tx = implemented.connect(helper.INFLUENCER)['unstake(uint256)'](2);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.INFLUENCER],
                        [`-${helper.INFLUENCER_BONUS_LP_AMOUNT}`]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(2, helper.INFLUENCER.address, helper.INFLUENCER_BONUS_LP_AMOUNT);
                
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(helper.INFLUENCER.address);

                expect(stakeTokenRefererBalanceAfter - stakeTokenInfluencerBalanceBefore).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
            });

            it('Should success unstake bonus Lp from developer', async () => {
                await stakeToken.transfer(helper.STAKER.address, helper.STAKE_TOKEN_AMOUNT);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, helper.STAKE_TOKEN_AMOUNT);
                await implemented.connect(helper.STAKER)['stake(uint256,uint256,address,address,bool)'](helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME, helper.ADDRESS_ZERO, helper.ADDRESS_ZERO, true);

                const stakeTokenDeveloperBalanceBefore = await stakeToken.balanceOf(helper.DEVELOPER.address);

                let tx;
                await expect(() => {
                    tx = implemented.connect(helper.DEVELOPER)['unstake(uint256)'](2);
                    return tx;
                })
                    .to.changeTokenBalances(
                        implemented,
                        [helper.DEVELOPER],
                        [`-${helper.DEVELOPER_BONUS_LP_AMOUNT}`]
                    );
    
                await expect(tx)
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(2, helper.DEVELOPER.address, helper.DEVELOPER_BONUS_LP_AMOUNT);
                
                const stakeTokenDeveloperBalanceAfter = await stakeToken.balanceOf(helper.DEVELOPER.address);

                expect(stakeTokenDeveloperBalanceAfter - stakeTokenDeveloperBalanceBefore).to.be.equal(helper.DEVELOPER_BONUS_LP_AMOUNT);
            });
        });

        describe('other functions', async () => {
            it('calcAllLPAmountOut', async () => {
                const result = await implemented.calcAllLPAmountOut(helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME);
                expect(result[0]).to.be.equal(helper.calcStakerAmountWithTimeBonus(helper.STAKE_TOKEN_AMOUNT, helper.HOLD_TIME));
                expect(result[1]).to.be.equal(helper.REFERER_BONUS_LP_AMOUNT);
                expect(result[2]).to.be.equal(helper.INFLUENCER_BONUS_LP_AMOUNT);
                expect(result[3]).to.be.equal(helper.DEVELOPER_BONUS_LP_AMOUNT);
            });
        });
    });
});
