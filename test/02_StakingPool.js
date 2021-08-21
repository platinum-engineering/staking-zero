const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getContractFactories } = require('./shared/utils');
const { eventsName, revertMessages } = require('./shared/enums');

const {
    STAKE_TOKEN_NAME,
    STAKE_TOKEN_SYMBOL,
    STAKE_TOKEN_AMOUNT,
    LP_TOKEN_NAME,
    LP_TOKEN_SYMBOL
} = require('./shared/constants');

describe('Staking pool', async () => {

    let stakeToken, StakeToken;
    let StakingPool, StakingPoolFactory;
    let owner, user1, user2;

    before(async () => {
        [StakeToken, StakingPoolFactory, StakingPool] = await getContractFactories();
        [owner, user1, user2] = await ethers.getSigners();
    });

    beforeEach(async () => {
        stakeToken = await StakeToken.deploy(STAKE_TOKEN_AMOUNT, STAKE_TOKEN_NAME, STAKE_TOKEN_SYMBOL);
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                const stakingPool = await StakingPool.deploy(stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);

                expect(stakingPool.address).not.to.be.equal(ethers.constants.AddressZero);
                expect(await stakingPool.stakeToken()).to.be.equal(stakeToken.address);
            });

            it('Should fail deploy Staking Pool with due to zero address of stake token', async () => {
                await expect(StakingPool.deploy(ethers.constants.AddressZero, LP_TOKEN_NAME, LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(revertMessages.stakingPoolAddressIs0);
            });
        });

        describe('Stake', async () => {
            it('Should fail due to not enough balance', async () => {
                const stakingPool = await StakingPool.deploy(stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);

                await expect(stakingPool.connect(user1).stake(10))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
            });

            it('Should success stake 10 tokens', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                await stakeToken.transfer(user1.address, amount);
                await stakeToken.connect(user1).approve(stakingPool.address, amount);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(stakingPool.address);
                const stakingPoolUserBalanceBefore = await stakingPool.balanceOf(user1.address);

                const tx = await (await stakingPool.connect(user1).stake(amount)).wait();
                const event = tx.events.find(e => e.event === eventsName.Stake);

                expect(event).not.to.be.null;
                expect(event.args[0]).to.be.equal(user1.address);
                expect(event.args[1]).to.be.equal(amount);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(stakingPool.address);
                const stakingPoolUserBalanceAfter = await stakingPool.balanceOf(user1.address);

                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(amount);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(amount);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(amount);
            });
        });

        describe('Unstake', async () => {
            it('Should fail due to not enough balance', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);

                await expect(stakingPool.connect(user1).unstake(amount))
                  .to.be.revertedWith(revertMessages.burnAmountExceedsBalance);
            });

            it('Should success unstake 10 tokens', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                await stakeToken.transfer(user1.address, amount);
                await stakeToken.connect(user1).approve(stakingPool.address, amount);
                await stakingPool.connect(user1).stake(amount);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(stakingPool.address);
                const stakingPoolUserBalanceBefore = await stakingPool.balanceOf(user1.address);

                const tx = await (await stakingPool.connect(user1).unstake(amount)).wait();
                const event = tx.events.find(e => e.event === eventsName.Unstake);

                expect(event).not.to.be.null;
                expect(event.args[0]).to.be.equal(user1.address);
                expect(event.args[1]).to.be.equal(amount);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(stakingPool.address);
                const stakingPoolUserBalanceAfter = await stakingPool.balanceOf(user1.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(amount);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(amount);
                expect(stakingPoolUserBalanceBefore - stakingPoolUserBalanceAfter).to.be.equal(amount);
            });
        });
    });
});
