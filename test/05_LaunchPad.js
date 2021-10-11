const { expect } = require('chai');

const init = require('./shared/initTests');

describe('LaunchPad pool', async () => {

    let stakeToken;
    let implAndTermsLaunchPad;
    let helper;
    let stakingPool;
    let implemented;

    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        stakeToken = await helper.getStakeToken();
        [ implAndTermsLaunchPad ] = await helper.deployManyContracts(['ImplAndTermsLaunchPad']);

        stakingPool = await helper.StakingPool.deploy(
            implAndTermsLaunchPad.address,
            implAndTermsLaunchPad.address,
            stakeToken.address,
            implAndTermsLaunchPad.address,
            '',
            ''
        );

        implemented = helper.ImplAndTermsLaunchPad.attach(stakingPool.address);
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                expect(stakingPool.address).not.to.be.equal(helper.ADDRESS_ZERO);
                expect(await implemented.stakeToken()).to.be.equal(stakeToken.address);
                expect(await implemented.implementation()).to.be.equal(implAndTermsLaunchPad.address);
                expect(await implemented.owner()).to.be.equal(helper.OWNER.address);
            });

            it('Should fail deploy Staking Pool due to zero implementation address', async () => {
                await expect(helper.StakingPool.deploy(helper.ADDRESS_ZERO, implAndTermsLaunchPad.address, stakeToken.address, implAndTermsLaunchPad.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                    .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail deploy Staking Pool due to zero stake token address', async () => {
                await expect(helper.StakingPool.deploy(implAndTermsLaunchPad.address, implAndTermsLaunchPad.address, helper.ADDRESS_ZERO, implAndTermsLaunchPad.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                    .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail initialize already initialized ImplAndTerms', async () => {
                await expect(implemented['initialize(address,address,address,string,string)'](helper.ADDRESS_ZERO, helper.ADDRESS_ZERO, implAndTermsLaunchPad.address, helper.LP_TOKEN_NAME, helper.LP_TOKEN_SYMBOL))
                    .to.be.revertedWith(helper.revertMessages.mayOnlyBeInitializedOnce);
            });
        });

        describe('Stake', async () => {
            it('Should fail due to not enough balance', async () => {
                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](helper.STAKE_TOKEN_AMOUNT))
                    .to.be.revertedWith(helper.revertMessages.transferAmountExceedsBalance);
            });

            it('Should success stake', async () => {
                let amount = '5000000000000000000000'; // 5000e18
                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);

                let totalStakeAmountBefore = await implemented.totalStakeAmount();
                let stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                let stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                let blockTimestamp = await implemented.getBlockTimestamp();

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 0, amount, +blockTimestamp + 1);

                let totalStakeAmountAfter = await implemented.totalStakeAmount();
                let stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                let stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect((stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter)).to.be.equal(+amount);
                expect((stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore)).to.be.equal(+amount);
                expect((totalStakeAmountAfter - totalStakeAmountBefore)).to.be.equal(+amount);

                let userCount = await implemented.getUsersCount();
                expect(userCount).to.be.equal(1);

                let userStake = await implemented.getUserStake(0);
                expect(userStake[0]).to.be.equal(amount);
                expect(userStake[1]).to.be.equal(+blockTimestamp + 1);

                let user = await implemented.getUser(0);
                expect(user).to.be.equal(helper.STAKER.address);

                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);

                totalStakeAmountBefore = await implemented.totalStakeAmount();
                stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);

                blockTimestamp = await implemented.getBlockTimestamp();

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 1, amount, +blockTimestamp + 1);

                totalStakeAmountAfter = await implemented.totalStakeAmount();
                stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);

                expect((stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter)).to.be.equal(+amount);
                expect((stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore)).to.be.equal(+amount);
                expect((totalStakeAmountAfter - totalStakeAmountBefore)).to.be.equal(+amount);

                userCount = await implemented.getUsersCount();
                expect(userCount).to.be.equal(2);

                let stakeAmount = '10000000000000000000000'; // 10000e18
                userStake = await implemented.getUserStake(0);
                expect(userStake[0]).to.be.equal(stakeAmount);
                expect(userStake[1]).to.be.equal(+blockTimestamp + 1);

                user = await implemented.getUser(1);
                expect(user).to.be.equal(helper.STAKER.address);
            });

            it('Should fail (min stake amount)', async () => {
                let amount = await implemented.minStakeAmount();

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);
                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount.sub(1)))
                    .to.be.revertedWith(helper.revertMessages.stakeAmountMustBeMoreThanMinStakeAmount);
            });

            it('Should fail (max stake amount)', async () => {
                let amount = await implemented.maxStakeAmount();

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);
                await stakeToken.connect(helper.STAKER).mint(amount + 1);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount + 1);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount + 1))
                    .to.be.revertedWith(helper.revertMessages.stakeAmountMustBeLessThanMaxStakeAmount);
            });

            it('Should fail (max total stake amount)', async () => {
                let amount = await implemented.minStakeAmount();

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);

                amount = await implemented.maxTotalStakeAmount();

                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount))
                    .to.be.revertedWith(helper.revertMessages.totalStakeAmountMustBeLessThanMaxTotalStakeAmount);
            });
        });

        describe('Unstake and setStakeTime', async () => {
            it('Should success unstake', async () => {
                let amount = '5000000000000000000000'; // 5000e18
                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);
                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);

                let blockTimestamp = await implemented.getBlockTimestamp();

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake)
                    .withArgs(helper.STAKER.address, 0, amount, +blockTimestamp + 1);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);

                let userStake = await implemented.getUserStake(0);
                let stakeAmount = userStake[0];
                expect(userStake[0]).to.be.equal(amount);

                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](amount + 1))
                    .to.be.revertedWith(helper.revertMessages.amountMoreThanStakeAmount);

                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](amount))
                    .to.be.revertedWith(helper.revertMessages.badTimeForRequest);

                await expect(implemented.connect(helper.STAKER)['setUnStakeTime(uint256)'](0))
                    .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);

                await implemented.connect(helper.OWNER).setUnStakeTime(0);

                await expect(implemented.connect(helper.STAKER)['unstake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.STAKER.address, amount);

                userStake = await implemented.getUserStake(0);
                expect(userStake[0]).to.be.equal(0);

                await expect(implemented.connect(helper.OWNER)['unstake(uint256)'](1))
                    .to.emit(implemented, helper.eventsName.Unstake)
                    .withArgs(helper.OWNER.address, 1);

                userStake = await implemented.getUserStake(1);
                expect(userStake[0]).to.be.equal(stakeAmount.sub(1));
            });
        });

        describe('other functions', async () => {
            it('setStakeAmounts', async () => {
                let startMinAmount = '5000000000000000000000'; // 5000e18
                let startMaxAmount = '10000000000000000000000'; // 10000e18

                let minAmount = await implemented.minStakeAmount();
                let maxAmount = await implemented.maxStakeAmount();

                expect(startMinAmount).to.be.equal(minAmount);
                expect(startMaxAmount).to.be.equal(maxAmount);

                let newAmount = '500000000000000000000'; // 500e18

                await expect(implemented.connect(helper.STAKER)['setStakeAmounts(uint256,uint256)'](newAmount, newAmount))
                    .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);

                await implemented.connect(helper.OWNER).setStakeAmounts(newAmount, newAmount);

                minAmount = await implemented.minStakeAmount();
                maxAmount = await implemented.maxStakeAmount();

                expect(newAmount).to.be.equal(minAmount);
                expect(newAmount).to.be.equal(maxAmount);

                await expect(implemented.connect(helper.OWNER)['setStakeAmounts(uint256,uint256)'](minAmount, minAmount.sub(1)))
                    .to.be.revertedWith(helper.revertMessages.setStakeAmountsMaxAmountMustBeMoreThanMinAmount);
            });

            it('setMaxTotalStakeAmount', async () => {
                let startMaxTotalAmount = '100000000000000000000000000'; // 100_000_000e18

                let maxTotalAmount = await implemented.maxTotalStakeAmount();

                expect(startMaxTotalAmount).to.be.equal(maxTotalAmount);

                let newAmount = '500000000000000000000'; // 500e18

                await expect(implemented.connect(helper.STAKER)['setMaxTotalStakeAmount(uint256)'](newAmount))
                    .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);

                await implemented.connect(helper.OWNER).setMaxTotalStakeAmount(newAmount);

                maxTotalAmount = await implemented.maxTotalStakeAmount();

                expect(newAmount).to.be.equal(maxTotalAmount);
            });

            it('setPauseStake', async () => {
                let amount = await implemented.minStakeAmount();

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);

                let pauseStake = await implemented.pauseStake();
                expect(pauseStake).to.be.equal(false);

                await expect(implemented.connect(helper.STAKER)['setPauseStake(bool)'](true))
                    .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);

                await implemented.connect(helper.OWNER).setPauseStake(true);

                pauseStake = await implemented.pauseStake();
                expect(pauseStake).to.be.equal(true);

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.be.revertedWith(helper.revertMessages.stakeIsPaused);

                await implemented.connect(helper.OWNER).setPauseStake(false);

                await stakeToken.connect(helper.OWNER).mint(amount);
                await stakeToken.connect(helper.OWNER).approve(implemented.address, amount);

                await expect(implemented.connect(helper.OWNER)['stake(uint256)'](amount))
                    .to.emit(implemented, helper.eventsName.Stake);
            });
        });
    });
});
