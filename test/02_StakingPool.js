const { expect } = require('chai');
const { ethers } = require('hardhat');
const { getContractFactories, getAddressIs0ErrorMessage } = require('./shared/utils');
const { eventsName, revertMessages } = require('./shared/enums');

const {
    STAKE_TOKEN_NAME,
    STAKE_TOKEN_SYMBOL,
    STAKE_TOKEN_AMOUNT,
    LP_TOKEN_NAME,
    LP_TOKEN_SYMBOL,
    REFERER_BONUS_PERCENT,
    INFLUENCER_BONUS_PERCENT,
    DEVELOPER_BONUS_PERCENT,
} = require('./shared/constants');

describe('Staking pool', async () => {

    let stakeToken, StakeToken;
    let StakingPool;
    let implAndTerms, ImplAndTerms;
    let whitelist, Whitelist;
    let owner, user1, user2, otherAccounts;
    let AMOUNT;
    let developerBonusLpAmount;
    let refererBonusLpAmount;
    let influencerBonusLpAmount;

    before(async () => {
        [StakeToken, _, StakingPool, ImplAndTerms, Whitelist] = await getContractFactories();
        [owner, user1, user2, ...otherAccounts] = await ethers.getSigners();
        AMOUNT = 1000000000;
        developerBonusLpAmount = AMOUNT * DEVELOPER_BONUS_PERCENT / 100;
        refererBonusLpAmount = AMOUNT * REFERER_BONUS_PERCENT / 100;
        influencerBonusLpAmount = AMOUNT * INFLUENCER_BONUS_PERCENT / 100;
    });

    beforeEach(async () => {
        stakeToken = await StakeToken.deploy(STAKE_TOKEN_AMOUNT, STAKE_TOKEN_NAME, STAKE_TOKEN_SYMBOL);
        implAndTerms = await ImplAndTerms.deploy();
        whitelist = await Whitelist.deploy();
    });

    describe('Transactions', async () => {
        describe('Deploy', async () => {
            it('Should success deploy Staking Pool', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);

                expect(stakingPool.address).not.to.be.equal(ethers.constants.AddressZero);
                
                const implemented = ImplAndTerms.attach(stakingPool.address);
                expect(await implemented.stakeToken()).to.be.equal(stakeToken.address);
                expect(await implemented.implementation()).to.be.equal(implAndTerms.address);
                expect(await implemented.name()).to.be.equal(LP_TOKEN_NAME);
                expect(await implemented.symbol()).to.be.equal(LP_TOKEN_SYMBOL);
                expect(await implemented.owner()).to.be.equal(owner.address);
            });

            it('Should fail deploy Staking Pool due to zero implementation address', async () => {
                await expect(StakingPool.deploy(ethers.constants.AddressZero, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });

            it('Should fail deploy Staking Pool due to zero stake token address', async () => {
                await expect(StakingPool.deploy(implAndTerms.address, whitelist.address, ethers.constants.AddressZero, LP_TOKEN_NAME, LP_TOKEN_SYMBOL))
                  .to.be.revertedWith(getAddressIs0ErrorMessage('StakingPool', 'constructor'));
            });
        });

        describe('Stake', async () => {
            it('Should fail due to not enough balance', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                await expect(implemented.connect(user1)['stake(uint256)'](10))
                    .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
            });

            it('Should success stake', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakeCounterBefore = await implemented.stakeCounter();

                const tx = await (await implemented.connect(user1)['stake(uint256)'](AMOUNT)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakeData = await implemented.stakes(1);

                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(1);
                expect(stakeData[0]).to.be.equal(user1.address);
                expect(stakeData[1]).to.be.equal(AMOUNT);
            });
            
            it('Should success stake with referer', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolRefererBalanceBefore = await implemented.balanceOf(user2.address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address)'](AMOUNT, user2.address)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(user2.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2)]);
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolRefererBalanceAfter - stakingPoolRefererBalanceBefore).to.be.equal(refererBonusLpAmount);
                
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
                expect(stakesData[0][0]).to.be.equal(user1.address);
                expect(stakesData[0][1]).to.be.equal(AMOUNT);
                expect(stakesData[1][0]).to.be.equal(user2.address);
                expect(stakesData[1][1]).to.be.equal(refererBonusLpAmount);
            });
    
            it('Should fail due to referer address equals to msg.sender', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await expect(implemented.connect(user1)['stake(uint256,address)'](10, user1.address))
                    .to.be.revertedWith(revertMessages.refererOrInfluencerEqualsToSender);
            });
            
            it('Should success stake with influencer without referer', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                await whitelist.addWhiteList(user2.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolInfluencerBalanceBefore = await implemented.balanceOf(user2.address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address,address)'](AMOUNT, ethers.constants.AddressZero, user2.address)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolInfluencerBalanceAfter = await implemented.balanceOf(user2.address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2)]);
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolInfluencerBalanceAfter - stakingPoolInfluencerBalanceBefore).to.be.equal(influencerBonusLpAmount);
                
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
                expect(stakesData[0][0]).to.be.equal(user1.address);
                expect(stakesData[0][1]).to.be.equal(AMOUNT);
                expect(stakesData[1][0]).to.be.equal(user2.address);
                expect(stakesData[1][1]).to.be.equal(influencerBonusLpAmount);
            });
    
            it('Should fail due to influencer address equals to msg.sender', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await expect(implemented.connect(user1)['stake(uint256,address,address)'](AMOUNT, ethers.constants.AddressZero, user1.address))
                    .to.be.revertedWith(revertMessages.refererOrInfluencerEqualsToSender);
            });
    
            it('Should success stake with influencer with referer', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                await whitelist.addWhiteList(otherAccounts[0].address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolRefererBalanceBefore = await implemented.balanceOf(user2.address);
                const stakingPoolInfluencerBalanceBefore = await implemented.balanceOf(otherAccounts[0].address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address,address)'](AMOUNT, user2.address, otherAccounts[0].address)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(user2.address);
                const stakingPoolInfluencerBalanceAfter = await implemented.balanceOf(otherAccounts[0].address);
                const stakeCounterAfter = await implemented.stakeCounter();
                const stakesData = await Promise.all([implemented.stakes(1), implemented.stakes(2), implemented.stakes(3)]);
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolRefererBalanceAfter - stakingPoolRefererBalanceBefore).to.be.equal(refererBonusLpAmount);
                expect(stakingPoolInfluencerBalanceAfter - stakingPoolInfluencerBalanceBefore).to.be.equal(influencerBonusLpAmount);
        
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(3);
                expect(stakesData[0][0]).to.be.equal(user1.address);
                expect(stakesData[0][1]).to.be.equal(AMOUNT);
                expect(stakesData[1][0]).to.be.equal(user2.address);
                expect(stakesData[1][1]).to.be.equal(refererBonusLpAmount);
                expect(stakesData[2][0]).to.be.equal(otherAccounts[0].address);
                expect(stakesData[2][1]).to.be.equal(influencerBonusLpAmount);
            });
    
            it('Should success stake with developer bonus without influencer without referer', async () => {
                const developer = otherAccounts[6];
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceBefore = await implemented.balanceOf(developer.address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address,address,bool)'](AMOUNT, ethers.constants.AddressZero, ethers.constants.AddressZero, true)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceAfter = await implemented.balanceOf(developer.address);
                const stakeCounterAfter = await implemented.stakeCounter();
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolDeveloperBalanceAfter - stakingPoolDeveloperBalanceBefore).to.be.equal(developerBonusLpAmount);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(2);
            });
    
            it('Should success stake with developer bonus without influencer with referer', async () => {
                const developer = otherAccounts[6];
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceBefore = await implemented.balanceOf(developer.address);
                const stakingPoolRefererBalanceBefore = await implemented.balanceOf(user2.address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address,address,bool)'](AMOUNT, user2.address, ethers.constants.AddressZero, true)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceAfter = await implemented.balanceOf(developer.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(user2.address);
                const stakeCounterAfter = await implemented.stakeCounter();
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolDeveloperBalanceAfter - stakingPoolDeveloperBalanceBefore).to.be.equal(developerBonusLpAmount);
                expect(stakingPoolRefererBalanceAfter - stakingPoolRefererBalanceBefore).to.be.equal(refererBonusLpAmount);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(3);
            });
    
            it('Should success stake with developer bonus with influencer with referer', async () => {
                const developer = otherAccounts[6];
                const influencer = otherAccounts[0];
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                await whitelist.addWhiteList(influencer.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
        
                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceBefore = await implemented.balanceOf(developer.address);
                const stakingPoolRefererBalanceBefore = await implemented.balanceOf(user2.address);
                const stakingPoolInfluencerBalanceBefore = await implemented.balanceOf(influencer.address);
                const stakeCounterBefore = await implemented.stakeCounter();
        
                const tx = await (await implemented.connect(user1)['stake(uint256,address,address,bool)'](AMOUNT, user2.address, influencer.address, true)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);
                const stakingPoolDeveloperBalanceAfter = await implemented.balanceOf(developer.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(user2.address);
                const stakingPoolInfluencerBalanceAfter = await implemented.balanceOf(influencer.address);
                const stakeCounterAfter = await implemented.stakeCounter();
        
                expect(stakeTokenUserBalanceBefore - stakeTokenUserBalanceAfter).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceAfter - stakeTokenContractBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceAfter - stakingPoolUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakingPoolDeveloperBalanceAfter - stakingPoolDeveloperBalanceBefore).to.be.equal(developerBonusLpAmount);
                expect(stakingPoolRefererBalanceAfter - stakingPoolRefererBalanceBefore).to.be.equal(refererBonusLpAmount);
                expect(stakingPoolInfluencerBalanceAfter - stakingPoolInfluencerBalanceBefore).to.be.equal(influencerBonusLpAmount);
                expect(stakeCounterAfter - stakeCounterBefore).to.be.equal(4);
            });
        });

        describe('Unstake', async () => {
            it('Should fail due to sender is not staker', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);

                await expect(implemented.connect(user1)['unstake(uint256)'](1))
                    .to.be.revertedWith(revertMessages.senderIsNotStaker);
            });

            it('Should success unstake', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
                await implemented.connect(user1)['stake(uint256)'](AMOUNT);

                const stakeTokenUserBalanceBefore = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceBefore = await implemented.balanceOf(user1.address);

                const tx = await (await implemented.connect(user1)['unstake(uint256)'](1)).wait();

                const stakeTokenUserBalanceAfter = await stakeToken.balanceOf(user1.address);
                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakingPoolUserBalanceAfter = await implemented.balanceOf(user1.address);

                expect(stakeTokenUserBalanceAfter - stakeTokenUserBalanceBefore).to.be.equal(AMOUNT);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(AMOUNT);
                expect(stakingPoolUserBalanceBefore - stakingPoolUserBalanceAfter).to.be.equal(AMOUNT);
            });
    
            it('Should success unstake bonus Lp from referer', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
                await implemented.connect(user1)['stake(uint256,address)'](AMOUNT, user2.address);
        
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceBefore = await stakeToken.balanceOf(user2.address);
                const stakingPoolRefererBalanceBefore = await implemented.balanceOf(user2.address);
        
                const tx = await (await implemented.connect(user2)['unstake(uint256)'](2)).wait();

                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(user2.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(user2.address);
        
                expect(stakeTokenRefererBalanceAfter - stakeTokenRefererBalanceBefore).to.be.equal(refererBonusLpAmount);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(refererBonusLpAmount);
                expect(stakingPoolRefererBalanceBefore - stakingPoolRefererBalanceAfter).to.be.equal(refererBonusLpAmount);
            });
            
            it('Should success unstake bonus Lp from influencer', async () => {
                const influencer = otherAccounts[0];
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                await whitelist.addWhiteList(influencer.address);
                
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
                await implemented.connect(user1)['stake(uint256,address,address)'](AMOUNT, ethers.constants.AddressZero, influencer.address);
    
                const stakeTokenContractBalanceBefore = await stakeToken.balanceOf(implemented.address);
                const stakeTokenInfluencerBalanceBefore = await stakeToken.balanceOf(influencer.address);
                const stakingPoolInfluencerBalanceBefore = await implemented.balanceOf(influencer.address);
    
                const tx = await (await implemented.connect(influencer)['unstake(uint256)'](2)).wait();

                const stakeTokenContractBalanceAfter = await stakeToken.balanceOf(implemented.address);
                const stakeTokenRefererBalanceAfter = await stakeToken.balanceOf(influencer.address);
                const stakingPoolRefererBalanceAfter = await implemented.balanceOf(influencer.address);
    
                expect(stakeTokenRefererBalanceAfter - stakeTokenInfluencerBalanceBefore).to.be.equal(influencerBonusLpAmount);
                expect(stakeTokenContractBalanceBefore - stakeTokenContractBalanceAfter).to.be.equal(influencerBonusLpAmount);
                expect(stakingPoolInfluencerBalanceBefore - stakingPoolRefererBalanceAfter).to.be.equal(influencerBonusLpAmount);
            });
    
            it('Should success unstake bonus Lp from developer', async () => {
                const developer = otherAccounts[6];
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
        
                await stakeToken.transfer(user1.address, AMOUNT);
                await stakeToken.connect(user1).approve(implemented.address, AMOUNT);
                await implemented.connect(user1)['stake(uint256,address,address,bool)'](AMOUNT, ethers.constants.AddressZero, ethers.constants.AddressZero, true);
        
                const stakeTokenDeveloperBalanceBefore = await stakeToken.balanceOf(developer.address);
                const stakingPoolDeveloperBalanceBefore = await implemented.balanceOf(developer.address);
        
                const tx = await (await implemented.connect(developer)['unstake(uint256)'](2)).wait();

                const stakeTokenDeveloperBalanceAfter = await stakeToken.balanceOf(developer.address);
                const stakingPoolDeveloperBalanceAfter = await implemented.balanceOf(developer.address);
        
                expect(stakingPoolDeveloperBalanceBefore - stakingPoolDeveloperBalanceAfter).to.be.equal(developerBonusLpAmount);
                expect(stakeTokenDeveloperBalanceAfter - stakeTokenDeveloperBalanceBefore).to.be.equal(developerBonusLpAmount);
            });
        });
        
        describe('other functions', async () => {
            it('calcAllLPAmountOut', async () => {
                const stakingPool = await StakingPool.deploy(implAndTerms.address, whitelist.address, stakeToken.address, LP_TOKEN_NAME, LP_TOKEN_SYMBOL);
                const implemented = ImplAndTerms.attach(stakingPool.address);
                const result = await implemented.calcAllLPAmountOut(AMOUNT);
                expect(result[0]).to.be.equal(AMOUNT);
                expect(result[1]).to.be.equal(refererBonusLpAmount);
                expect(result[2]).to.be.equal(influencerBonusLpAmount);
                expect(result[3]).to.be.equal(developerBonusLpAmount);
            });
        });
    });
});
