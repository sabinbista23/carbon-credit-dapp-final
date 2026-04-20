import { expect } from "chai";
import pkg from "hardhat";

const { ethers } = pkg;

describe("CarbonToken", function () {
  let CarbonToken, carbonToken, owner, addr1, addr2;
  let authorizedMessage;

  async function signMint({ signer, to, amount, ipfsHash }) {
    const salt = ethers.keccak256(ethers.toUtf8Bytes(authorizedMessage));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const contractAddress = await carbonToken.getAddress();
    const ipfsHashHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsHash || ""));

    const payloadHash = ethers.solidityPackedKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256", "bytes32"],
      ["MINT", salt, contractAddress, chainId, to, amount, ipfsHashHash]
    );

    return signer.signMessage(ethers.getBytes(payloadHash));
  }

  async function signList({ signer, seller, amountCTKN, priceETH }) {
    const salt = ethers.keccak256(ethers.toUtf8Bytes(authorizedMessage));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const contractAddress = await carbonToken.getAddress();

    const payloadHash = ethers.solidityPackedKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256", "uint256"],
      ["LIST", salt, contractAddress, chainId, seller, amountCTKN, priceETH]
    );

    return signer.signMessage(ethers.getBytes(payloadHash));
  }

  async function signBuy({ signer, buyer, seller, listingIndex }) {
    const salt = ethers.keccak256(ethers.toUtf8Bytes(authorizedMessage));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const contractAddress = await carbonToken.getAddress();

    const payloadHash = ethers.solidityPackedKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "address", "uint256"],
      ["BUY", salt, contractAddress, chainId, buyer, seller, listingIndex]
    );

    return signer.signMessage(ethers.getBytes(payloadHash));
  }

  async function signDelete({ signer, seller, listingIndex }) {
    const salt = ethers.keccak256(ethers.toUtf8Bytes(authorizedMessage));
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const contractAddress = await carbonToken.getAddress();

    const payloadHash = ethers.solidityPackedKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256"],
      ["DELETE", salt, contractAddress, chainId, seller, listingIndex]
    );

    return signer.signMessage(ethers.getBytes(payloadHash));
  }

  beforeEach(async function () {
    CarbonToken = await ethers.getContractFactory("CarbonToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    authorizedMessage = "skripsi_mufidus_sani";
    carbonToken = await CarbonToken.deploy(owner.address, authorizedMessage);
    await carbonToken.waitForDeployment();
  });

  it("Should deploy and set the correct owner", async function () {
    expect(await carbonToken.owner()).to.equal(owner.address);
  });

  it("Should mint tokens with correct signature", async function () {
    const amount = ethers.parseEther("100");
    const ipfsHash = "QmExampleHash";
    const signature = await signMint({
      signer: owner,
      to: addr1.address,
      amount,
      ipfsHash,
    });

    await carbonToken.connect(owner).mint(addr1.address, amount, ipfsHash, signature);

    expect(await carbonToken.balanceOf(addr1.address)).to.equal(amount);
  });

  it("Should reject duplicate certificate minting (same IPFS hash)", async function () {
    const amount = ethers.parseEther("100");
    const ipfsHash = "QmExampleHash";

    const sig1 = await signMint({
      signer: owner,
      to: addr1.address,
      amount,
      ipfsHash,
    });
    await carbonToken.connect(owner).mint(addr1.address, amount, ipfsHash, sig1);

    const sig2 = await signMint({
      signer: owner,
      to: addr2.address,
      amount,
      ipfsHash,
    });

    await expect(
      carbonToken.connect(owner).mint(addr2.address, amount, ipfsHash, sig2)
    ).to.be.revertedWithCustomError(carbonToken, "CertificateAlreadyMinted");
  });

  it("Should list tokens for sale with correct signature", async function () {
    const amount = ethers.parseEther("100");
    const price = ethers.parseEther("1");

    const mintSig = await signMint({
      signer: owner,
      to: owner.address,
      amount,
      ipfsHash: "",
    });
    await carbonToken.connect(owner).mint(owner.address, amount, "", mintSig);

    const listSig = await signList({
      signer: owner,
      seller: owner.address,
      amountCTKN: amount,
      priceETH: price,
    });
    await carbonToken.connect(owner).listTokenForSale(amount, price, listSig);

    const listing = await carbonToken.listings(owner.address, 0);
    expect(listing.amountCTKN).to.equal(amount);
    expect(listing.priceETH).to.equal(price);
    expect(listing.active).to.be.true;
  });

  it("Should buy tokens with correct signature", async function () {
    const amount = ethers.parseEther("100");
    const price = ethers.parseEther("1");

    const mintSig = await signMint({
      signer: owner,
      to: owner.address,
      amount,
      ipfsHash: "",
    });
    await carbonToken.connect(owner).mint(owner.address, amount, "", mintSig);

    const listSig = await signList({
      signer: owner,
      seller: owner.address,
      amountCTKN: amount,
      priceETH: price,
    });
    await carbonToken.connect(owner).listTokenForSale(amount, price, listSig);

    const buySig = await signBuy({
      signer: addr1,
      buyer: addr1.address,
      seller: owner.address,
      listingIndex: 0,
    });

    await carbonToken.connect(addr1).buyToken(owner.address, 0, buySig, { value: price });

    expect(await carbonToken.balanceOf(addr1.address)).to.equal(amount);
    const listing = await carbonToken.listings(owner.address, 0);
    expect(listing.active).to.be.false;
  });

  it("Should refund buyer when overpaying", async function () {
    const amount = ethers.parseEther("100");
    const price = ethers.parseEther("1");

    const mintSig = await signMint({
      signer: owner,
      to: owner.address,
      amount,
      ipfsHash: "",
    });
    await carbonToken.connect(owner).mint(owner.address, amount, "", mintSig);

    const listSig = await signList({
      signer: owner,
      seller: owner.address,
      amountCTKN: amount,
      priceETH: price,
    });
    await carbonToken.connect(owner).listTokenForSale(amount, price, listSig);

    const sellerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const buyerBalanceBefore = await ethers.provider.getBalance(addr1.address);

    const buySig = await signBuy({
      signer: addr1,
      buyer: addr1.address,
      seller: owner.address,
      listingIndex: 0,
    });

    const overpay = ethers.parseEther("2");
    const tx = await carbonToken.connect(addr1).buyToken(owner.address, 0, buySig, {
      value: overpay,
    });
    const receipt = await tx.wait();
    const gasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice;
    const gasCost = receipt.gasUsed * gasPrice;

    const sellerBalanceAfter = await ethers.provider.getBalance(owner.address);
    const buyerBalanceAfter = await ethers.provider.getBalance(addr1.address);

    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(price);
    expect(buyerBalanceBefore - buyerBalanceAfter - gasCost).to.equal(price);
  });

  it("Should delete listing with correct signature", async function () {
    const amount = ethers.parseEther("100");
    const price = ethers.parseEther("1");

    const mintSig = await signMint({
      signer: owner,
      to: owner.address,
      amount,
      ipfsHash: "",
    });
    await carbonToken.connect(owner).mint(owner.address, amount, "", mintSig);

    const listSig = await signList({
      signer: owner,
      seller: owner.address,
      amountCTKN: amount,
      priceETH: price,
    });
    await carbonToken.connect(owner).listTokenForSale(amount, price, listSig);

    const deleteSig = await signDelete({
      signer: owner,
      seller: owner.address,
      listingIndex: 0,
    });
    await carbonToken.connect(owner).deleteListing(0, deleteSig);

    const listing = await carbonToken.listings(owner.address, 0);
    expect(listing.active).to.be.false;
    expect(await carbonToken.balanceOf(owner.address)).to.equal(amount);
  });
});
