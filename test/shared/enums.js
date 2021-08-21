const eventsName = {
    StakingPoolCreated: 'StakingPoolCreated',
    Stake: 'Stake',
    Unstake: 'Unstake',
};
const revertMessages = {
    stakingPoolAddressIs0: 'StakingPool::constructor: address is 0',
    transferAmountExceedsBalance: 'ERC20: transfer amount exceeds balance',
    burnAmountExceedsBalance: 'ERC20: burn amount exceeds balance',
};

module.exports = {
    eventsName,
    revertMessages,
};
