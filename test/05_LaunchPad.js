const { expect } = require('chai');

const init = require('./shared/initTests');
const { network } = require("hardhat");

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
            helper.LP_TOKEN_NAME,
            helper.LP_TOKEN_SYMBOL
        );

        implemented = helper.ImplAndTermsLaunchPad.attach(stakingPool.address);
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                expect(stakingPool.address).not.to.be.equal(helper.ADDRESS_ZERO);
                expect(await implemented.stakeToken()).to.be.equal(stakeToken.address);
                expect(await implemented.implementation()).to.be.equal(implAndTermsLaunchPad.address);
                expect(await implemented.name()).to.be.equal(helper.LP_TOKEN_NAME);
                expect(await implemented.symbol()).to.be.equal(helper.LP_TOKEN_SYMBOL);
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
                let amount = '5001000000000000000000'; // 5001e18
                await stakeToken.connect(helper.STAKER).mint(amount);
                await stakeToken.connect(helper.STAKER).approve(implemented.address, amount);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(helper.STAKER.address);

                await expect(implemented.connect(helper.STAKER)['stake(uint256)'](amount))
                    // .to.emit(implemented, helper.eventsName.Stake)
                    // .withArgs(helper.STAKER.address, 1, amount, 0);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(helper.STAKER.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(helper.STAKER.address);

                expect((stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter)).to.be.equal(+amount);
                expect((stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore)).to.be.equal(+amount);
                expect((stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore)).to.be.equal(+amount);

                // @todo check data
            });
        });

        describe('Unstake', async () => {

        });

        describe('other functions', async () => {
            it('setStakeAmounts', async () => {
                let amount = '5000';
                const result = await implemented.setStakeAmounts(amount, amount);

            });

            it('setMaxTotalStakeAmount', async () => {

            });

            it('setPauseStake', async () => {

            });

            it('setUnStakeTime', async () => {

            });

            it('getUserStake', async () => {

            });

            it('getUsersCount', async () => {

            });

            it('getUser', async () => {

            });
        });
    });
});
