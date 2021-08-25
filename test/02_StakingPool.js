const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getContractFactories, getAddressIs0ErrorMessage } = require('./shared/utils');
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
    let StakingPool;
    let implAndTerms, ImplAndTerms;
    let owner, user1, user2;

    before(async () => {
        [StakeToken, _, StakingPool, ImplAndTerms] = await getContractFactories();
        [owner, user1, user2] = await ethers.getSigners();
    });

    beforeEach(async () => {
        stakeToken = await StakeToken.deploy(STAKE_TOKEN_AMOUNT, STAKE_TOKEN_NAME, STAKE_TOKEN_SYMBOL);
        implAndTerms = await ImplAndTerms.deploy();
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);

                expect(stakingPool.address).not.to.be.equal(ethers.constants.AddressZero);
                
                const implemented = ImplAndTerms.attach(stakingPool.address);
                expect(await implemented.stakeToken()).to.be.equal(stakeToken.address);
                expect(await implemented.implementation()).to.be.equal(implAndTerms.address);
                expect(await implemented.name()).to.be.equal(LP_TOKEN_NAME);
                expect(await implemented.symbol()).to.be.equal(LP_TOKEN_SYMBOL);
                expect(await implemented.owner()).to.be.equal(owner.address);
            });

            it('Should fail deploy Staking Pool due to zero implementation address', async () => {
                await expect(StakingPool.deploy(ethers.constants.AddressZero, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail deploy Staking Pool due to zero stake token address', async () => {
                await expect(StakingPool.deploy(implAndTerms.address, ethers.constants.AddressZero, LP_TOKEN_NAME, LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });
        });

        describe('Stake', async () => {
            it('Should fail due to not enough balance', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                
                await expect(implemented.connect(user1).stake(10))
                    .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
            });

            it('Should success stake 10 tokens', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(implAndTerms.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                
                await stakeToken.transfer(user1.address, amount);
                await stakeToken.connect(user1).approve(implemented.address, amount);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);

                const tx = await (await implemented.connect(user1).stake(amount)).wait();
                const event = tx.events.find(e => e.event === eventsName.Stake);

                expect(event).not.to.be.null;
                expect(event.args[0]).to.be.equal(user1.address);
                expect(event.args[1]).to.be.equal(amount);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);

                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(amount);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(amount);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(amount);
            });
        });

        describe('Unstake', async () => {
            it('Should fail due to not enough balance', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(implAndTerms.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);

                await expect(implemented.connect(user1).unstake(amount))
                    .to.be.revertedWith(revertMessages.burnAmountExceedsBalance);
            });

            it('Should success unstake 10 tokens', async () => {
                const amount = 10;
                const stakingPool = await StakingPool.deploy(implAndTerms.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                
                await stakeToken.transfer(user1.address, amount);
                await stakeToken.connect(user1).approve(implemented.address, amount);
                await implemented.connect(user1).stake(amount);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);

                const tx = await (await implemented.connect(user1).unstake(amount)).wait();
                const event = tx.events.find(e => e.event === eventsName.Unstake);

                expect(event).not.to.be.null;
                expect(event.args[0]).to.be.equal(user1.address);
                expect(event.args[1]).to.be.equal(amount);

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(amount);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(amount);
                expect(stakingPoolUserBalanceBefore - stakingPoolUserBalanceAfter).to.be.equal(amount);
            });
        });
    });
});
