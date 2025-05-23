const { network } = require("hardhat")
const { developmentChains } = require("../utils/helper")
const {verify} = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("----------------------------------------------------")
    const arguments = []
    const basicNftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Verify the deployment
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(basicNftMarketplace.address, arguments)
    }
    log("----------------------------------------------------")
    log("NFT Marketplace deployed!")
}

module.exports.tags = ["all", "marketplace"]
