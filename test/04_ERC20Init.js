const { expect } = require('chai');
const { ethers } = require('hardhat');
const {revertMessages} = require("./shared/enums");

describe('ERC20Init', async () => {

    let ERC20Init, eRC20Init;
    let owner, user1, user2;

    before(async () => {
        ERC20Init = await ethers.getContractFactory('ERC20Init');
        [owner, user1, user2] = await ethers.getSigners();
    });

    beforeEach(async () => {
        eRC20Init = await ERC20Init.deploy();
    });

    describe('Transactions', async () => {
        it('Should set name and symbol on initialize', async () => {
            let [name, symbol] = await Promise.all([
                eRC20Init.name(),
                eRC20Init.symbol(),
            ]);
            
            expect(name).to.be.equal('');
            expect(symbol).to.be.equal('');
            
            await eRC20Init.initialize('Test name', 'Test symbol');
    
            [name, symbol] = await Promise.all([
                eRC20Init.name(),
                eRC20Init.symbol(),
            ]);
    
            expect(name).to.be.equal('Test name');
            expect(symbol).to.be.equal('Test symbol');
        });
        
        it('Should return decimals', async () => {
            const decimals = await eRC20Init.decimals();
    
            expect(decimals).to.be.equal(18);
        });
        
        it('Should return totalSupply', async () => {
            const totalSupply = await eRC20Init.totalSupply();
    
            expect(totalSupply).to.be.equal(0);
        });
        
        it('Should approve 10 wei', async () => {
            const amount = 10;
            let allowance = await eRC20Init.allowance(owner.address, user1.address);
    
            expect(allowance).to.be.equal(0);
    
            await eRC20Init.approve(user1.address, amount);
            
            allowance = await eRC20Init.allowance(owner.address, user1.address);
    
            expect(allowance).to.be.equal(amount);
        });
        
        it('Should fail approve to zero address', async () => {
            const amount = 10;
            await expect(eRC20Init.approve(ethers.constants.AddressZero, amount))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
        });
        
        it('Should increase allowance on 10 wei', async () => {
            const amount = 10;
            await eRC20Init.approve(user1.address, amount);
            await eRC20Init.increaseAllowance(user1.address, amount);
            
            allowance = await eRC20Init.allowance(owner.address, user1.address);
    
            expect(allowance).to.be.equal(amount * 2);
        });
        
        it('Should fail increase allowance to zero address', async () => {
            const amount = 10;
            await expect(eRC20Init.increaseAllowance(ethers.constants.AddressZero, amount))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
            
        });
        
        it('Should decrease allowance on 10 wei', async () => {
            const amount = 10;
            const decreasingAmount = 5;
            await eRC20Init.approve(user1.address, amount);
            await eRC20Init.decreaseAllowance(user1.address, decreasingAmount);
            
            allowance = await eRC20Init.allowance(owner.address, user1.address);
    
            expect(allowance).to.be.equal(amount - decreasingAmount);
        });
    
        it('Should fail decrease allowance due to below zero', async () => {
            const amount = 10;
            await expect(eRC20Init.decreaseAllowance(user1.address, amount))
                .to.be.revertedWith(revertMessages.ERC20DecreasedAllowanceBelowZero);
        
        });
        
        it('Should fail transfer due to exceeds balance', async () => {
            const amount = 10;
            await expect(eRC20Init.transfer(user1.address, amount))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transfer to zero address', async () => {
            const amount = 10;
            await expect(eRC20Init.transfer(ethers.constants.AddressZero, amount))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
        
        it('Should fail transferFrom due to exceeds balance', async () => {
            const amount = 10;
            await expect(eRC20Init.transferFrom(owner.address, user1.address, amount))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transferFrom due from zero address', async () => {
            const amount = 10;
            await expect(eRC20Init.transferFrom(ethers.constants.AddressZero, user1.address, amount))
                .to.be.revertedWith(revertMessages.ERC20TransferFrom0Address);
        });
        
        it('Should fail transferFrom due to zero address', async () => {
            const amount = 10;
            await expect(eRC20Init.transferFrom(owner.address, ethers.constants.AddressZero, amount))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
    });
});
