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
    getContractFactories, getAddressIs0ErrorMessage,
} = require('./shared/utils');

describe('Staking pool factory', async () => {

    let stakeToken, StakeToken;
    let stakingPoolFactory, StakingPoolFactory;
    let implAndTerms, ImplAndTerms;
    let whitelist, Whitelist;
    let StakingPool;
    let owner;

    before(async () => {
        [StakeToken, StakingPoolFactory, StakingPool, ImplAndTerms, Whitelist] = await getContractFactories();
        [owner] = await ethers.getSigners();
    });

    beforeEach(async () => {
        stakeToken = await StakeToken.deploy(STAKE_TOKEN_AMOUNT, STAKE_TOKEN_NAME, STAKE_TOKEN_SYMBOL);
        stakingPoolFactory = await StakingPoolFactory.deploy();
        implAndTerms = await ImplAndTerms.deploy();
        whitelist = await Whitelist.deploy();
    });

    describe('Transactions', async () => {
        it('deploy new StakingPool and check data', async () => {
            const tx = await (await stakingPoolFactory.createStakingPool(owner.address, implAndTerms.address, whitelist.address, stakeToken.address)).wait();
            const event = tx.events.find(e => e.event === eventsName.StakingPoolCreated);
            const address = event.args[0];

            expect(event).not.to.be.null;
            expect(address).not.to.be.equal(ethers.constants.AddressZero);

            const stakingPool = ImplAndTerms.attach(address);

            const [name, symbol, ownerAddress] = await Promise.all([
                stakingPool.name(),
                stakingPool.symbol(),
                stakingPool.owner()
            ]);
            expect(name).to.be.equal(LP_TOKEN_NAME);
            expect(symbol).to.be.equal(LP_TOKEN_SYMBOL);
            expect(ownerAddress).to.be.equal(owner.address);
        });
        
        it('Should fail due to zero owner address', async () => {
            await expect(stakingPoolFactory.createStakingPool(ethers.constants.AddressZero, implAndTerms.address, whitelist.address, stakeToken.address))
                .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
        
        it('Should fail due to zero implementation address', async () => {
            await expect(stakingPoolFactory.createStakingPool(owner.address, ethers.constants.AddressZero, whitelist.address, stakeToken.address))
                .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
    
        it('Should fail due to zero stake token address', async () => {
            await expect(stakingPoolFactory.createStakingPool(owner.address, implAndTerms.address, whitelist.address, ethers.constants.AddressZero))
                .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPoolFactory', 'createStakingPool'));
        });
    });
});
