const { expect } = require('chai');
const {revertMessages} = require("./shared/enums");
const init = require("./shared/initTests");

describe('ERC20Init', async () => {

    let eRC20Init;
    let helper;
    const AMOUNT = 10;
    const DECREASE_AMOUNT = 5;
    
    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        eRC20Init = await helper.deployOneContract('ERC20Init');
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
        
        it('Should success approve', async () => {
            let allowance = await eRC20Init.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(0);
    
            await eRC20Init.approve(helper.STAKER.address, AMOUNT);
            
            allowance = await eRC20Init.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT);
        });
        
        it('Should fail approve to zero address', async () => {
            await expect(eRC20Init.approve(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
        });
        
        it('Should increase allowance on 10 wei', async () => {
            await eRC20Init.approve(helper.STAKER.address, AMOUNT);
            await eRC20Init.increaseAllowance(helper.STAKER.address, AMOUNT);
            
            allowance = await eRC20Init.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT * 2);
        });
        
        it('Should fail increase allowance to zero address', async () => {
            await expect(eRC20Init.increaseAllowance(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
            
        });
        
        it('Should decrease allowance on 10 wei', async () => {
            await eRC20Init.approve(helper.STAKER.address, AMOUNT);
            await eRC20Init.decreaseAllowance(helper.STAKER.address, DECREASE_AMOUNT);
            
            allowance = await eRC20Init.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT - DECREASE_AMOUNT);
        });
    
        it('Should fail decrease allowance due to below zero', async () => {
            await expect(eRC20Init.decreaseAllowance(helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20DecreasedAllowanceBelowZero);
        
        });
        
        it('Should fail transfer due to exceeds balance', async () => {
            await expect(eRC20Init.transfer(helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transfer to zero address', async () => {
            await expect(eRC20Init.transfer(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
        
        it('Should fail transferFrom due to exceeds balance', async () => {
            await expect(eRC20Init.transferFrom(helper.OWNER.address, helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transferFrom due from zero address', async () => {
            await expect(eRC20Init.transferFrom(helper.ADDRESS_ZERO, helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferFrom0Address);
        });
        
        it('Should fail transferFrom due to zero address', async () => {
            await expect(eRC20Init.transferFrom(helper.OWNER.address, helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
    });
});
