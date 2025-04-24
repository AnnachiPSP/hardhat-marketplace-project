require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require('dotenv').config();
require("hardhat-deploy");

const ALCHEMY_API = process.env.ALCHEMY_API;
const WALLET_1 = process.env.WALLET_1;
const WALLET_2 = process.env.WALLET_2;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {

    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API}`,
      accounts: [ WALLET_1, WALLET_2 ],
      chainId: 11155111,
      blockConfirmations: 6,
    }
    
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    // customChains: [], // uncomment this line if you are getting a TypeError: customChains is not iterable
  },
  sourcify: {
    enabled: true
  },
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    user1: {
      default: 1
    },
    user2: {
      default: 2
    },
    user3: {
      default: 3
    }
  },
  gasReporter:{
    enabled: true
  },
  mocha: {
    timeout: 2000000,
  }
};