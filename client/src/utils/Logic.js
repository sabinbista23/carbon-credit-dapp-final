import CarbonCreditTokenABI from "../CarbonToken.json";
import { ethers } from "ethers";

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

const getAuthorizedSalt = () => {
  const secretMessage = getRequiredEnv("REACT_APP_SECRET_MESSAGE");
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secretMessage));
};

const hashUtf8 = (value) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(value || ""));

export const connectToEthereum = async () => {
  if (!window.ethereum) {
    throw new Error("No Ethereum provider found");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const signer = provider.getSigner();
  const account = await signer.getAddress();

  const network = await provider.getNetwork();
  const expectedNetworkId = parseInt(getRequiredEnv("REACT_APP_EXPECTED_NETWORK_ID"), 10);

  if (network.chainId !== expectedNetworkId) {
    throw new Error(
      `Wrong network. Expected chainId ${expectedNetworkId}, got ${network.chainId}.`
    );
  }

  // Connect to the CarbonCreditToken contract
  const contractAddress = getRequiredEnv("REACT_APP_TOKEN_ADDRESS");
  const token = new ethers.Contract(contractAddress, CarbonCreditTokenABI.abi, signer);

  return { provider, signer, account, token };
};

export const generateSignature = async ({
  action,
  account,
  provider,
  contractAddress,
  to,
  amount,
  ipfsHash,
  amountCTKN,
  priceETH,
  seller,
  buyer,
  listingIndex,
}) => {
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const chainId = network.chainId;
  const salt = getAuthorizedSalt();

  let payloadHash;
  if (action === "MINT") {
    payloadHash = ethers.utils.solidityKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256", "bytes32"],
      ["MINT", salt, contractAddress, chainId, to, amount, hashUtf8(ipfsHash)]
    );
  } else if (action === "LIST") {
    payloadHash = ethers.utils.solidityKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256", "uint256"],
      ["LIST", salt, contractAddress, chainId, seller, amountCTKN, priceETH]
    );
  } else if (action === "BUY") {
    payloadHash = ethers.utils.solidityKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "address", "uint256"],
      ["BUY", salt, contractAddress, chainId, buyer, seller, listingIndex]
    );
  } else if (action === "DELETE") {
    payloadHash = ethers.utils.solidityKeccak256(
      ["string", "bytes32", "address", "uint256", "address", "uint256"],
      ["DELETE", salt, contractAddress, chainId, seller, listingIndex]
    );
  } else {
    throw new Error(`Unknown signature action: ${action}`);
  }

  if (account) {
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== account.toLowerCase()) {
      throw new Error("Active wallet account does not match requested signer.");
    }
  }

  const signature = await signer.signMessage(ethers.utils.arrayify(payloadHash));
  return signature;
};
