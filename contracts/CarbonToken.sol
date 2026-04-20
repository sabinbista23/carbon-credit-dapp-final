// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CarbonToken is ERC20, ERC20Burnable, Ownable, ERC20Permit, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    error InvalidSignature();
    error CertificateAlreadyMinted();
    error InsufficientCTKNBalance();
    error InvalidListingIndex();
    error ListingNotActive();
    error InsufficientEthSent();
    error SellerPaymentFailed();
    error RefundFailed();
    error CannotDeleteInactiveListing();

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
    mapping(bytes32 => bool) public mintedCertificates;

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
    event CertificateDuplicateRejected(address indexed account, string ipfsHash);

    function _requireValidSignature(
        bytes32 payloadHash,
        bytes memory signature
    ) internal view {
        bytes32 messageHash = payloadHash.toEthSignedMessageHash();
        address signer = messageHash.recover(signature);
        if (signer != msg.sender) revert InvalidSignature();
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
        if (bytes(ipfsHash).length > 0) {
            bytes32 certificateHash = keccak256(bytes(ipfsHash));
            if (mintedCertificates[certificateHash]) {
                emit CertificateDuplicateRejected(to, ipfsHash);
                revert CertificateAlreadyMinted();
            }
            mintedCertificates[certificateHash] = true;
        }
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
        if (balanceOf(msg.sender) < amountCTKN) revert InsufficientCTKNBalance();
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
    ) external payable nonReentrant {
        _requireValidSignature(
            _hashForBuy(msg.sender, seller, listingIndex),
            signature
        );
        if (listingIndex >= listings[seller].length) revert InvalidListingIndex();
        Listing storage listing = listings[seller][listingIndex];
        if (!listing.active) revert ListingNotActive();
        uint256 price = listing.priceETH;
        if (msg.value < price) revert InsufficientEthSent();

        uint256 amountCTKN = listing.amountCTKN;
        listing.active = false;

        _transfer(address(this), msg.sender, amountCTKN);

        (bool okSeller, ) = payable(seller).call{value: price}("");
        if (!okSeller) revert SellerPaymentFailed();

        uint256 refund = msg.value - price;
        if (refund > 0) {
            (bool okBuyer, ) = payable(msg.sender).call{value: refund}("");
            if (!okBuyer) revert RefundFailed();
        }
        emit TokenPurchased(
            msg.sender,
            seller,
            amountCTKN,
            price,
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
        if (listingIndex >= listings[msg.sender].length) revert InvalidListingIndex();
        Listing storage listing = listings[msg.sender][listingIndex];
        if (!listing.active) revert CannotDeleteInactiveListing();
        _transfer(address(this), msg.sender, listing.amountCTKN);
        listing.active = false;
        emit ListingDeleted(msg.sender, listingIndex);
    }

    function updateAuthorizedMessage(
        string memory newMessage
    ) external onlyOwner {
        authorizedMessage = keccak256(abi.encodePacked(newMessage));
    }

    receive() external payable {}
}
