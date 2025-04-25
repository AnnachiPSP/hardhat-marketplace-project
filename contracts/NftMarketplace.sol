// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";


contract NftMarketplace{

    ////////////////////
    //     Errors     //
    ////////////////////

    error NftMarketplace__InvalidPrice();
    error NftMarketplace__NotApprovedForMarket();
    error NftMarketplace__IsNotOwner();
    error NftMarketplace__AlreadyListed(address nftContract, uint256 tokenId);
    error NftMarketplace__NotListed(address nftContract, uint256 tokenId);
    error NftMarketplace__NoProceeds();

    ////////////////////
    //    State Var   //
    ////////////////////

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping (address => mapping(uint256 => Listing)) private s_listings;

    mapping (address => uint256) private s_proceeds;


    ////////////////////
    //     Events     //
    ////////////////////

    event NFTListed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFTBought(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );

    event NFTCancelled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );

    event UpdateListing(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event WithdrawProceeds(
        address indexed seller,
        uint256 proceeds
    );


    /////////////////
    //  Modifiers  //
    /////////////////

    // Check if the NFT is already listed
    // We are using price as an indicator becuase initially the price is 0
    // If the price is greater than 0, it means that the NFT is already listed
    modifier notListed(
        address _nftContract,
        uint256 _tokenId
    ) {
        Listing memory listing = s_listings[_nftContract][_tokenId];
        if(listing.price > 0) revert NftMarketplace__AlreadyListed(_nftContract, _tokenId);
        _;
    }

    modifier isListed(
        address _nftContract,
        uint256 _tokenId
    ) {
        Listing memory listing = s_listings[_nftContract][_tokenId];
        if(listing.price <= 0) revert NftMarketplace__NotListed(_nftContract, _tokenId);
        _;
    }

    modifier isOwner(
        address _nftContract,
        uint256 _tokenId
    ) {
        IERC721 nftContract = IERC721(_nftContract);
        if(nftContract.ownerOf(_tokenId) != msg.sender) revert NftMarketplace__IsNotOwner();
        _;
    }


    ////////////////////
    // Main Functions //
    ////////////////////

    function listNFT(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price
    ) notListed(_nftContract, _tokenId) isOwner(_nftContract, _tokenId) external {

        // Check if the price is valid
        // If the price is less than or equal to 0, revert the transaction
        // This is a custom error that we defined above
        if(_price <= 0) revert NftMarketplace__InvalidPrice();

        // Check if the NFT is approved for transfer by the marketplace
        IERC721 nftContract = IERC721(_nftContract);
        if(nftContract.getApproved(_tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarket();
        }

        s_listings[_nftContract][_tokenId] = Listing(
            msg.sender,
            _price
        );

        emit NFTListed(
            _nftContract,
            _tokenId,
            msg.sender,
            _price
        );

    }

    function buyNFT(
        address _nftContract,
        uint256 _tokenId
    ) external payable {

        Listing memory listing = s_listings[_nftContract][_tokenId];
        if(msg.value < listing.price) revert NftMarketplace__InvalidPrice();

        // Transfer the proceeds to the seller
        // This prevents from gas greifing
        s_proceeds[listing.seller] += msg.value;

        // Remove the listing
        delete s_listings[_nftContract][_tokenId];

        // -- We are doing transferring of NFT towards the end to prevent re-entrancy attacks --
        IERC721(_nftContract).safeTransferFrom(listing.seller, msg.sender, _tokenId);

        emit NFTBought(
            _nftContract,
            _tokenId,
            msg.sender,
            listing.price
        );
    }

    function cancelNFT(
        address _nftContract,
        uint256 _tokenId
    ) isListed(_nftContract, _tokenId) isOwner(_nftContract, _tokenId) external {

        delete s_listings[_nftContract][_tokenId];

        emit NFTCancelled(
            _nftContract,
            _tokenId,
            msg.sender
        );
    }

    function updateListing(
        address _nftContract,
        uint256 _tokenId,
        uint256 _newPrice
    ) isListed(_nftContract, _tokenId) isOwner(_nftContract, _tokenId) external {

        s_listings[_nftContract][_tokenId].price = _newPrice;

        emit UpdateListing(
            _nftContract,
            _tokenId,
            msg.sender,
            _newPrice
        );
    }

    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender];
        if(proceeds <= 0) revert NftMarketplace__NoProceeds();

        s_proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer failed");

        emit WithdrawProceeds(
            msg.sender,
            proceeds
        );
    }


    ////////////////////
    // View Functions //
    ////////////////////

    function getListing(
        address _nftContract,
        uint256 _tokenId
    ) external view returns (Listing memory) {
        return s_listings[_nftContract][_tokenId];
    }

    function getProceeds(
        address _seller
    ) external view returns (uint256) {
        return s_proceeds[_seller];
    }

    
}