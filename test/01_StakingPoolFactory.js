const { expect } = require('chai');

const init = require('./shared/initTests');

describe('Staking pool factory', async () => {

    let stakeToken;
    let stakingPoolFactory;
    let implAndTerms;
    let whitelist;
    let helper;

    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        stakeToken = await helper.getStakeToken();
        [stakingPoolFactory, implAndTerms, whitelist, reservoir] = await helper.deployManyContracts(['StakingPoolFactory', 'ImplAndTerms', 'Whitelist', 'Reservoir']);
    });

    describe('Transactions', async () => {
        it('deploy new StakingPool and check data', async () => {
            const tx = await (await stakingPoolFactory.createStakingPool(helper.OWNER.address, implAndTerms.address, whitelist.address, stakeToken.address, reservoir.address)).wait();
            const event = tx.events.find(e => e.event === helper.eventsName.StakingPoolCreated);
            const address = event.args[0];

            expect(event).not.to.be.null;
            expect(address).not.to.be.equal(helper.ADDRESS_ZERO);

            const stakingPool = helper.ImplAndTerms.attach(address);

            const [name, symbol, ownerAddress] = await Promise.all([
                stakingPool.name(),
                stakingPool.symbol(),
                stakingPool.owner()
            ]);
            expect(name).to.be.equal(helper.LP_TOKEN_NAME);
            expect(symbol).to.be.equal(helper.LP_TOKEN_SYMBOL);
            expect(ownerAddress).to.be.equal(helper.OWNER.address);
        });
        
        it('Should fail due to zero owner address', async () => {
            await expect(stakingPoolFactory.createStakingPool(helper.ADDRESS_ZERO, implAndTerms.address, whitelist.address, stakeToken.address, reservoir.address))
                .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
        
        it('Should fail due to zero implementation address', async () => {
            await expect(stakingPoolFactory.createStakingPool(helper.OWNER.address, helper.ADDRESS_ZERO, whitelist.address, stakeToken.address, reservoir.address))
                .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
    
        it('Should fail due to zero stake token address', async () => {
            await expect(stakingPoolFactory.createStakingPool(helper.OWNER.address, implAndTerms.address, whitelist.address, helper.ADDRESS_ZERO, reservoir.address))
                .to.be.revertedWith(helper.getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
    });
});
