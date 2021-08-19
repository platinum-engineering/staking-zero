const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Staking pool factory', async () => {

    let StakeToken;
    let stakeToken;
    let StakingPoolFactory;
    let stakingPoolFactory;
    let owner;

    before(async () => {
        StakeToken = await ethers.getContractFactory('ERC20Token');
        StakingPoolFactory = await ethers.getContractFactory('StakingPoolFactory');
        [owner] = await ethers.getSigners();
    });

    beforeEach(async () => {
        let amount = '100000000000000000000'; // 100e18
        stakeToken = await StakeToken.deploy(amount, 'Stake Token', 'STK');
        stakingPoolFactory = await StakingPoolFactory.deploy();
    });

    describe('Transactions', async () => {
        it('Should deploy new StakingPool with event', async () => {
            const tx = await (await stakingPoolFactory.createStakingPool(owner.address, stakeToken.address)).wait();
            const event = tx.events.find(e => e.event === 'StakingPoolCreated');

            expect(event).not.to.be.null;
            expect(event.args[0]).not.to.be.equal(ethers.constants.AddressZero);
        });
    });
});
