const { ethers } = require('hardhat');

const getContractFactories = async () =>
    Promise.all([
        ethers.getContractFactory('ERC20Token'),
        ethers.getContractFactory('StakingPoolFactory'),
        ethers.getContractFactory('StakingPool'),
    ]);

module.exports = {
    getContractFactories,
};
