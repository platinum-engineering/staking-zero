const { expect } = require('chai');
const { ethers } = require('hardhat');
const { eventsName } = require('./shared/enums');

const {
    STAKE_TOKEN_NAME,
    STAKE_TOKEN_SYMBOL,
    STAKE_TOKEN_AMOUNT,
    LP_TOKEN_NAME,
    LP_TOKEN_SYMBOL,
} = require('./shared/constants');

const {
    getContractFactories,
} = require('./shared/utils');

describe('Staking pool factory', async () => {

    let stakeToken, StakeToken;
    let stakingPoolFactory, StakingPoolFactory;
    let StakingPool;
    let owner;

    before(async () => {
        [StakeToken, StakingPoolFactory, StakingPool] = await getContractFactories();
        [owner] = await ethers.getSigners();
    });

    beforeEach(async () => {
        stakeToken = await StakeToken.deploy(STAKE_TOKEN_AMOUNT, STAKE_TOKEN_NAME, STAKE_TOKEN_SYMBOL);
        stakingPoolFactory = await StakingPoolFactory.deploy();
    });

    describe('Transactions', async () => {
        it('deploy new StakingPool and check data', async () => {
            const tx = await (await stakingPoolFactory.createStakingPool(owner.address, stakeToken.address)).wait();
            const event = tx.events.find(e => e.event === eventsName.StakingPoolCreated);
            const address = event.args[0];

            expect(event).not.to.be.null;
            expect(address).not.to.be.equal(ethers.constants.AddressZero);

            const stakingPool = StakingPool.attach(address);
            const [name, symbol, ownerAddress] = await Promise.all([
                stakingPool.name(),
                stakingPool.symbol(),
                stakingPool.owner()
            ]);

            expect(name).to.be.equal(LP_TOKEN_NAME);
            expect(symbol).to.be.equal(LP_TOKEN_SYMBOL);
            expect(ownerAddress).to.be.equal(owner.address);
        });
    });
});
