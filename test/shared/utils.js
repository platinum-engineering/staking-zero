const { ethers } = require('hardhat');
const { revertMessages } = require('./enums');

const getContractFactories = async () =>
    Promise.all([
        ethers.getContractFactory('ERC20Token'),
        ethers.getContractFactory('StakingPoolFactory'),
        ethers.getContractFactory('StakingPool'),
        ethers.getContractFactory('ImplAndTerms'),
        ethers.getContractFactory('WhiteList'),
    ]);

const getAddressIs0ErrorMessage = (contractName, functionName) =>
    `${contractName}::${functionName}: ${revertMessages.addressIs0}`;

module.exports = {
    getContractFactories,
    getAddressIs0ErrorMessage,
};
