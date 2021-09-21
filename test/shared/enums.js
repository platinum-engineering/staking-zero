const eventsName = {
    StakingPoolCreated: 'StakingPoolCreated',
    Stake: 'Stake',
    Unstake: 'Unstake',
    AddedWhiteList: 'AddedWhiteList',
    RemovedWhiteList: 'RemovedWhiteList'
};
const revertMessages = {
    addressIs0: 'address is 0',
    transferAmountExceedsBalance: 'ERC20: transfer amount exceeds balance',
    burnAmountExceedsBalance: 'ERC20: burn amount exceeds balance',
    callerIsNotOwner: 'Ownable: caller is not the owner',
    ERC20TransferFrom0Address: 'ERC20: transfer from the zero address',
    ERC20TransferTo0Address: 'ERC20: transfer to the zero address',
    ERC20DecreasedAllowanceBelowZero: 'ERC20: decreased allowance below zero',
    ERC20ApproveTo0: 'ERC20: approve to the zero address',
    refererOrInfluencerEqualsToSender: 'ImplAndTerms::stakeInternal: referer of influencer address equals to staker address',
    senderIsNotStaker: 'ImplAndTerms::unstake: msg.sender is not staker',
    stakeIsNotExist: 'ImplAndTerms::unstake: stake is not exist',
    stakeIsNotActive: 'ImplAndTerms::unstake: stake is not active',
    afterUnstakeStakeIsNotActive: 'ImplAndTerms::getTokenAmountAfterUnstake: stake is not active',
    mayOnlyBeInitializedOnce: 'ImplAndTerms::initialize: may only be initialized once',
    influencerIsNotInWhitelist: 'ImplAndTerms::stakeInternal: influencer is not in whitelist',
};

module.exports = {
    eventsName,
    revertMessages,
};
