const { expect } = require('chai');
const { ethers } = require('hardhat');
const { eventsName, revertMessages } = require('./shared/enums');

describe('Whitelist', async () => {

    let Whitelist, whitelist;
    let owner, user1, user2;

    before(async () => {
        Whitelist = await ethers.getContractFactory('WhiteList');
        [owner, user1, user2] = await ethers.getSigners();
    });

    beforeEach(async () => {
        whitelist = await Whitelist.deploy();
    });

    describe('Transactions', async () => {
        it('Should return false on getWhiteListStatus when user is not in whitelist', async () => {
            const result = await whitelist.getWhiteListStatus(user1.address);
            expect(result).to.be.false;
        });
        
        it('Should add user to whitelist with event', async () => {
            const tx = await (await whitelist.addWhiteList(user1.address)).wait();
            const event = tx.events.find(e => e.event === eventsName.AddedWhiteList);
            
            expect(event).not.to.be.null;
            expect(event.args[0]).to.be.equal(user1.address);
    
            const result = await whitelist.getWhiteListStatus(user1.address);
            expect(result).to.be.true;
        });
        
        it('Should remove user from whitelist with event', async () => {
            await whitelist.addWhiteList(user1.address);
            const tx = await (await whitelist.removeWhiteList(user1.address)).wait();
            const event = tx.events.find(e => e.event === eventsName.RemovedWhiteList);
            
            expect(event).not.to.be.null;
            expect(event.args[0]).to.be.equal(user1.address);
    
            const result = await whitelist.getWhiteListStatus(user1.address);
            expect(result).to.be.false;
        });
        
        it('Should fail due to caller is not owner', async () => {
            await expect(whitelist.connect(user1).addWhiteList(user2.address))
                .to.be.revertedWith(revertMessages.callerIsNotOwner);
            await expect(whitelist.connect(user1).removeWhiteList(user2.address))
                .to.be.revertedWith(revertMessages.callerIsNotOwner);
        });
    });
});
