const {developmentChains} = require("../utils/helper")
const {ethers, deployments, getNamedAccounts} = require("hardhat")
const {expect, assert} = require("chai")

!developmentChains.includes(network.name)?describe.skip:
describe("NFT Marketplace Testing", () => {

    let NFT_Address, Marketplace, MarketplaceMeta, deployer, user1, user2, accounts

    beforeEach(async () => {

        await deployments.fixture(["all"]); 

        accounts  = await ethers.getSigners()
        deployer = accounts[0]
        user1 = accounts[1]
        user2 = accounts[2]

        const BasicNftMeta = await deployments.get("BasicNft")
        NFT_Address = BasicNftMeta.address

        MarketplaceMeta = await deployments.get("NftMarketplace")
        Marketplace = await ethers.getContractAt("NftMarketplace", MarketplaceMeta.address)

    });

    describe("NFT", () => {

        let NFT
        beforeEach(async () => {
            NFT = await ethers.getContractAt("BasicNft", NFT_Address)
            await NFT.connect(deployer).mintNft()
        })

        it("Token Id", async () => {
            const tokenId = await NFT.getTokenCounter()
            console.log("Token Id: ", tokenId.toString())
            expect(tokenId).to.equal(1)
        })
        
        it("Token Uri", async () => {
            const tokenUri = await NFT.tokenURI(0)
            expect(tokenUri).to.equal("ipfs://bafybeig37ioir76s7mg5oobetncojcm3c3hxasyd4rvid4jqhy4gkaheg4/?filename=0-PUG.json")
        })
    })

    describe("Marketplace", () => {

        let NFT

        beforeEach(async () => {

            NFT = await ethers.getContractAt("BasicNft", NFT_Address)
            await NFT.connect(deployer).mintNft()
            await NFT.connect(user1).mintNft()
            await NFT.connect(user2).mintNft()

        })

        describe("List NFT", async () => {

            it("Owner Error", async () => {
                await expect(Marketplace.connect(user1).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__IsNotOwner")
            })

            it("Not Approved Error", async () => {
                await expect(Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__NotApprovedForMarket")
            })

            it("Price Error", async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await expect(Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__InvalidPrice")
            })

            it("Event Emitted", async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                const nft_market = await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
                const tx = await nft_market.wait(1)
                assert(tx.logs[0].eventName, 'NFTListed')

                const listings = await Marketplace.getListing(NFT_Address, 0)
                expect(listings.price).to.equal(ethers.parseEther("0.1"))
                expect(listings.seller).to.equal(deployer.address)
            })

            it("Repeated Listing Error", async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
                await expect(Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__AlreadyListed")
            })
        })


        describe("Buy NFT", async () => {

            beforeEach(async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
            })

            it("Price Error", async () => {
                await expect(Marketplace.connect(user1).buyNFT(NFT_Address, 0, {value: ethers.parseEther("0.05")})).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__InvalidPrice")
            })

            it("Event Emitted", async () => {
                const tx = await Marketplace.connect(user1).buyNFT(NFT_Address, 0, {value: ethers.parseEther("0.1")})
                const receipt = await tx.wait(1)
                assert(receipt.logs[1].eventName, 'NFTBought')

                const owner = await NFT.ownerOf(0)
                expect(owner).to.equal(user1.address)
            })

            it("Proceed Update", async () => {
                await Marketplace.connect(user1).buyNFT(NFT_Address, 0, {value: ethers.parseEther("0.1")})
                const seller = await Marketplace.getProceeds(deployer.address)
                assert(seller.toString(), "0.1")
            })

        })

        describe("Cancel NFT", async () => {
            beforeEach(async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
            })

            it("Not Owner Error", async () => {
                await expect(Marketplace.connect(user1).cancelNFT(NFT_Address, 0)).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__IsNotOwner")
            })

            it("Event Emitted", async () => {
                const tx = await Marketplace.connect(deployer).cancelNFT(NFT_Address, 0)
                const receipt = await tx.wait(1)
                assert(receipt.logs[0].eventName, 'NFTCancelled')
            })

            it("Not Listed Error", async () => {
                await expect(Marketplace.connect(deployer).cancelNFT(NFT_Address, 1)).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__NotListed")
            })
        })

        describe("Update Listing", async () => {
            beforeEach(async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
            })

            it("Not Owner Error", async () => {
                await expect(Marketplace.connect(user1).updateListing(NFT_Address, 0, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__IsNotOwner")
            })

            it("Not Listed Error", async () => {
                await expect(Marketplace.connect(deployer).updateListing(NFT_Address, 1, ethers.parseEther("0.1"))).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__NotListed")
            })

            it("Event Emitted", async () => {
                const tx = await Marketplace.connect(deployer).updateListing(NFT_Address, 0, ethers.parseEther("0.2"))
                const receipt = await tx.wait(1)
                assert(receipt.logs[0].eventName, 'NFTUpdated')

                const listings = await Marketplace.getListing(NFT_Address, 0)
                expect(listings.price).to.equal(ethers.parseEther("0.2"))
            })
        })

        describe("Withdraw Proceeds", async () => {
            beforeEach(async () => {
                await NFT.approve(MarketplaceMeta.address, 0)
                await Marketplace.connect(deployer).listNFT(NFT_Address, 0, ethers.parseEther("0.1"))
                await Marketplace.connect(user1).buyNFT(NFT_Address, 0, {value: ethers.parseEther("0.1")})
            })

            it("No Proceeds Error", async () => {
                await expect(Marketplace.connect(user1).withdrawProceeds()).to.be.revertedWithCustomError(Marketplace, "NftMarketplace__NoProceeds")
            })

            it("Event Emitted", async () => {
                const tx = await Marketplace.connect(deployer).withdrawProceeds()
                const receipt = await tx.wait(1)
                assert(receipt.logs[0].eventName, 'ProceedsWithdrawn')
            })
        })
    })
})