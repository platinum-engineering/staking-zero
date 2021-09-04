const { expect } = require('chai');

const init = require('./shared/initTests');

describe('Whitelist', async () => {

    let whitelist;
    let helper;
    
    before(async () => {
        helper = await init();
    });

    beforeEach(async () => {
        whitelist = await helper.deployOneContract('Whitelist');
    });

    describe('Transactions', async () => {
        it('Should return false on getWhiteListStatus when user is not in whitelist', async () => {
            await expect(await whitelist.getWhiteListStatus(helper.STAKER.address))
                .to.be.false;
        });
        
        it('Should add user to whitelist with event', async () => {
            await expect(whitelist.addWhiteList(helper.STAKER.address))
                .to.emit(whitelist, helper.eventsName.AddedWhiteList)
                .withArgs(helper.STAKER.address);
    
            await expect(await whitelist.getWhiteListStatus(helper.STAKER.address))
                .to.be.true;
        });
        
        it('Should remove user from whitelist with event', async () => {
            await whitelist.addWhiteList(helper.STAKER.address);

            await expect(whitelist.removeWhiteList(helper.STAKER.address))
                .to.emit(whitelist, helper.eventsName.RemovedWhiteList)
                .withArgs(helper.STAKER.address);
    
            await expect(await whitelist.getWhiteListStatus(helper.STAKER.address))
                .to.be.false;
        });
        
        it('Should fail due to caller is not owner', async () => {
            await expect(whitelist.connect(helper.STAKER).addWhiteList(helper.STAKER.address))
                .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);
            await expect(whitelist.connect(helper.STAKER).removeWhiteList(helper.STAKER.address))
                .to.be.revertedWith(helper.revertMessages.callerIsNotOwner);
        });
    });
});
