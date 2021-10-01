// npx hardhat run --network rinkeby scripts/deploy.js
// npx hardhat verify --network rinkeby 0x55e1f8159fF0AAcB9D1a67C2085846070c13c008 "0xa59c6038A6974D9b1FdA455b999B23B3e0E5E947"

const hre = require("hardhat");
const network = hre.network.name;
const dotenv = require('dotenv');
const fs = require('fs');
const envConfig = dotenv.parse(fs.readFileSync(`.env`));
for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  const PoolsInfo = await hre.ethers.getContractFactory('PoolsInfo');
  const poolsInfo = await PoolsInfo.deploy();

  console.log('PoolsInfo address:', poolsInfo.address);

  const StakingPoolFactory = await hre.ethers.getContractFactory('StakingPoolFactory');
  const stakingPoolFactory = await StakingPoolFactory.deploy(poolsInfo.address);

  console.log('StakingPoolFactory address:', stakingPoolFactory.address);

  // await poolsInfo.addWhiteList(stakingPoolFactory.address);

  const ImplAndTerms = await hre.ethers.getContractFactory('ImplAndTerms');
  const implAndTerms = await ImplAndTerms.deploy();

  console.log('ImplAndTerms address:', implAndTerms.address);

  const WhiteList = await hre.ethers.getContractFactory('WhiteList');
  const whiteList = await WhiteList.deploy();

  console.log('WhiteList address:', whiteList.address);

  const Reservoir = await hre.ethers.getContractFactory('Reservoir');
  const reservoir = await Reservoir.deploy();

  console.log('Reservoir address:', reservoir.address);

  const initialSupply = '10000000000000000000000'; // 10,000e18
  const nameToken = 'SHTestToken';
  const symbolToken = 'SHTT';

  const ERC20Token = await hre.ethers.getContractFactory('ERC20Token');
  const stakeToken = await ERC20Token.deploy(initialSupply, nameToken, symbolToken);

  console.log('ERC20Token address:', stakeToken.address);

  const reservoirAmount = '1000000000000000000000'; // 1,000e18
  await stakeToken.mint(reservoirAmount);
  await stakeToken.transfer(reservoir.address, reservoirAmount);

  console.log('Tokens added to reservoir');

  // let tx = await stakingPoolFactory.createStakingPool(deployer.address, implAndTerms.address, whiteList.address, stakeToken.address, reservoir.address);
  // console.log('tx', tx);

  // get event from tx, pool address
  // await reservoir.initialize(stakeToken.address, poolAddress);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
