// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract CarbonToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    constructor(
        address initialOwner,
        string memory _authorizedMessage
    )
        ERC20("CarbonToken", "CTKN")
        Ownable(initialOwner)
        ERC20Permit("CarbonToken")
    {
        authorizedMessage = keccak256(abi.encodePacked(_authorizedMessage));
    }

    struct Listing {
        uint256 amountCTKN;
        uint256 priceETH;
        bool active;
    }

    mapping(address => Listing[]) public listings;
    bytes32 private authorizedMessage;

    event TokenListed(
        address indexed seller,
        uint256 amountCTKN,
        uint256 priceETH,
        uint256 listingIndex
    );
    event TokenPurchased(
        address indexed buyer,
        address indexed seller,
        uint256 amountCTKN,
        uint256 priceETH,
        uint256 listingIndex
    );
    event ListingDeleted(address indexed seller, uint256 listingIndex);
    event CertificateMinted(
        address indexed account,
        uint256 amount,
        string ipfsHash
    );

    function _requireValidSignature(
        bytes32 payloadHash,
        bytes memory signature
    ) internal view {
        bytes32 messageHash = payloadHash.toEthSignedMessageHash();
        address signer = messageHash.recover(signature);
        require(signer == msg.sender, "Invalid signature");
    }

    function _hashForMint(
        address to,
        uint256 amount,
        string memory ipfsHash
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "MINT",
                    authorizedMessage,
                    address(this),
                    block.chainid,
                    to,
                    amount,
                    keccak256(bytes(ipfsHash))
                )
            );
    }

    function _hashForList(
        address seller,
        uint256 amountCTKN,
        uint256 priceETH
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "LIST",
                    authorizedMessage,
                    address(this),
                    block.chainid,
                    seller,
                    amountCTKN,
                    priceETH
                )
            );
    }

    function _hashForBuy(
        address buyer,
        address seller,
        uint256 listingIndex
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "BUY",
                    authorizedMessage,
                    address(this),
                    block.chainid,
                    buyer,
                    seller,
                    listingIndex
                )
            );
    }

    function _hashForDelete(
        address seller,
        uint256 listingIndex
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "DELETE",
                    authorizedMessage,
                    address(this),
                    block.chainid,
                    seller,
                    listingIndex
                )
            );
    }

    function mint(
        address to,
        uint256 amount,
        string memory ipfsHash,
        bytes memory signature
    ) public {
        _requireValidSignature(_hashForMint(to, amount, ipfsHash), signature);
        _mint(to, amount);
        emit CertificateMinted(to, amount, ipfsHash);
    }

    function listTokenForSale(
        uint256 amountCTKN,
        uint256 priceETH,
        bytes memory signature
    ) external {
        _requireValidSignature(
            _hashForList(msg.sender, amountCTKN, priceETH),
            signature
        );
        require(
            balanceOf(msg.sender) >= amountCTKN,
            "Insufficient CTKN balance"
        );
        _transfer(msg.sender, address(this), amountCTKN);
        listings[msg.sender].push(
            Listing({amountCTKN: amountCTKN, priceETH: priceETH, active: true})
        );
        emit TokenListed(
            msg.sender,
            amountCTKN,
            priceETH,
            listings[msg.sender].length - 1
        );
    }

    function buyToken(
        address seller,
        uint256 listingIndex,
        bytes memory signature
    ) external payable {
        _requireValidSignature(
            _hashForBuy(msg.sender, seller, listingIndex),
            signature
        );
        Listing storage listing = listings[seller][listingIndex];
        require(listing.active, "Listing is not active");
        require(msg.value >= listing.priceETH, "Insufficient ETH sent");
        _transfer(address(this), msg.sender, listing.amountCTKN);
        payable(seller).transfer(msg.value);
        listing.active = false;
        emit TokenPurchased(
            msg.sender,
            seller,
            listing.amountCTKN,
            listing.priceETH,
            listingIndex
        );
    }

    function deleteListing(
        uint256 listingIndex,
        bytes memory signature
    ) external {
        _requireValidSignature(
            _hashForDelete(msg.sender, listingIndex),
            signature
        );
        require(
            listingIndex < listings[msg.sender].length,
            "Invalid listing index"
        );
        Listing storage listing = listings[msg.sender][listingIndex];
        require(listing.active, "Cannot delete an inactive listing");
        _transfer(address(this), msg.sender, listing.amountCTKN);
        listing.active = false;
        emit ListingDeleted(msg.sender, listingIndex);
    }

    function updateAuthorizedMessage(
        string memory newMessage
    ) external onlyOwner {
        authorizedMessage = keccak256(bytes(newMessage));
    }

    receive() external payable {}
}
