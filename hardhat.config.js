require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-solhint");
require("solidity-coverage");
require("dotenv/config");

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// npx hardhat verify --network mainnet
function getKey(network) {
    if (network === 'mainnet')    { console.log('apiKey is ' + process.env.ETHERSCAN_API_KEY); return process.env.ETHERSCAN_API_KEY; }
    else if (network === 'rinkeby') { console.log('apiKey is ' + process.env.ETHERSCAN_API_KEY); return process.env.ETHERSCAN_API_KEY; }
    else if (network === 'bscmainnet') { console.log('apiKey is ' + process.env.BSCSCAN_API_KEY); return process.env.BSCSCAN_API_KEY; }
    else if (network === 'bsctestnet') { console.log('apiKey is ' + process.env.BSCSCAN_API_KEY); return process.env.BSCSCAN_API_KEY; }
    else if (network === 'polygon') { console.log('apiKey is ' + process.env.POLYGON_API_KEY); return process.env.POLYGON_API_KEY; }
    else if (network === 'mumbai') { console.log('apiKey is ' + process.env.POLYGON_API_KEY); return process.env.POLYGON_API_KEY; }
    else { console.log('network is hardhat or ' + network)}
}

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            initialBaseFeePerGas: 0,
            accounts: { mnemonic: process.env.ETHEREUM_HARDHAT_MNEMONIC },
        },
        mainnet: {
            url: process.env.ETHEREUM_MAINNET_URL,
            chainId: 1,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.ETHEREUM_MAINNET_PRIVATE_KEY}`]
        },
        rinkeby: {
            url: `${process.env.ETHEREUM_RINKEBY_URL}`,
            chainId: 4,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.ETHEREUM_RINKEBY_PRIVATE_KEY}`]
        },
        bscmainnet: {
            url: `${process.env.BSCMAINNET_URL}`,
            chainId: 56,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.BSCMAINNET_PRIVATE_KEY}`]
        },
        bsctestnet: {
            url: `${process.env.BSCTESTNET_URL}`,
            chainId: 97,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.BSCTESTNET_PRIVATE_KEY}`]
        },
        polygon: {
            url: `${process.env.POLYGON_URL}`,
            chainId: 137,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.POLYGON_PRIVATE_KEY}`]
        },
        mumbai: {
            url: `${process.env.MUMBAI_URL}`,
            chainId: 80001,
            gasPrice: 'auto', // (replace if necessary)
            accounts: [`0x${process.env.MUMBAI_PRIVATE_KEY}`]
        }
    },
    solidity: {
        compilers: [{
            version: "0.8.7",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        }]
    },
    mocha: {
        timeout: 10000
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    etherscan: {
        apiKey: getKey(process.argv[4])
    },
    //etherscan: {
      // Your API key for Etherscan
      // Obtain one at https://etherscan.io/
      //apiKey: process.env.BSCSCAN_API_KEY
    //}
};
