const eventsName = {
    StakingPoolCreated: 'StakingPoolCreated',
    Stake: 'Stake',
    Unstake: 'Unstake',
    AddedWhiteList: 'AddedWhiteList',
    RemovedWhiteList: 'RemovedWhiteList'
};
const revertMessages = {
    stakingPoolAddressIs0: 'StakingPool::constructor: address is 0',
    transferAmountExceedsBalance: 'ERC20: transfer amount exceeds balance',
    burnAmountExceedsBalance: 'ERC20: burn amount exceeds balance',
    callerIsNotOwner: 'Ownable: caller is not the owner',
};

module.exports = {
    eventsName,
    revertMessages,
};
