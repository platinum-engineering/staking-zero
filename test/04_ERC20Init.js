const { expect } = require('chai');
const {revertMessages} = require("./shared/enums");
const init = require("./shared/initTests");

describe('ERC20Init', async () => {

    let ERC20InitContract;
    let helper;
    const AMOUNT = 10;
    const DECREASE_AMOUNT = 5;
    
    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        ERC20InitContract = await helper.deployOneContract('ERC20Init');
    });

    describe('Transactions', async () => {
        it('Should return decimals', async () => {
            const decimals = await ERC20InitContract.decimals();
    
            expect(decimals).to.be.equal(18);
        });
        
        it('Should return totalSupply', async () => {
            const totalSupply = await ERC20InitContract.totalSupply();
    
            expect(totalSupply).to.be.equal(0);
        });
        
        it('Should success approve', async () => {
            let allowance = await ERC20InitContract.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(0);
    
            await ERC20InitContract.approve(helper.STAKER.address, AMOUNT);
            
            allowance = await ERC20InitContract.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT);
        });
        
        it('Should fail approve to zero address', async () => {
            await expect(ERC20InitContract.approve(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
        });
        
        it('Should increase allowance on 10 wei', async () => {
            await ERC20InitContract.approve(helper.STAKER.address, AMOUNT);
            await ERC20InitContract.increaseAllowance(helper.STAKER.address, AMOUNT);
            
            allowance = await ERC20InitContract.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT * 2);
        });
        
        it('Should fail increase allowance to zero address', async () => {
            await expect(ERC20InitContract.increaseAllowance(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20ApproveTo0);
            
        });
        
        it('Should decrease allowance on 10 wei', async () => {
            await ERC20InitContract.approve(helper.STAKER.address, AMOUNT);
            await ERC20InitContract.decreaseAllowance(helper.STAKER.address, DECREASE_AMOUNT);
            
            allowance = await ERC20InitContract.allowance(helper.OWNER.address, helper.STAKER.address);
    
            expect(allowance).to.be.equal(AMOUNT - DECREASE_AMOUNT);
        });
    
        it('Should fail decrease allowance due to below zero', async () => {
            await expect(ERC20InitContract.decreaseAllowance(helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20DecreasedAllowanceBelowZero);
        
        });
        
        it('Should fail transfer due to exceeds balance', async () => {
            await expect(ERC20InitContract.transfer(helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transfer to zero address', async () => {
            await expect(ERC20InitContract.transfer(helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
        
        it('Should fail transferFrom due to exceeds balance', async () => {
            await expect(ERC20InitContract.transferFrom(helper.OWNER.address, helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.transferAmountExceedsBalance);
        });
        
        it('Should fail transferFrom due from zero address', async () => {
            await expect(ERC20InitContract.transferFrom(helper.ADDRESS_ZERO, helper.STAKER.address, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferFrom0Address);
        });
        
        it('Should fail transferFrom due to zero address', async () => {
            await expect(ERC20InitContract.transferFrom(helper.OWNER.address, helper.ADDRESS_ZERO, AMOUNT))
                .to.be.revertedWith(revertMessages.ERC20TransferTo0Address);
        });
    });
});
