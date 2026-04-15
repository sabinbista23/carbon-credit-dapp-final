import pkg from 'hardhat';
const { ethers } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // 1. Get the deployer wallet
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 2. Get the Contract Factory
  const CarbonToken = await ethers.getContractFactory("CarbonToken");

  // 3. Prepare Constructor Arguments
  const secretMessage = process.env.SECRET_MESSAGE;
  if (!secretMessage) {
    throw new Error("Missing SECRET_MESSAGE in .env file");
  }

  const initialOwner = deployer.address;
  console.log("Using Secret Message:", secretMessage);

  // 4. Start Deployment
  console.log("Deploying CarbonToken...");
  const token = await CarbonToken.deploy(initialOwner, secretMessage);

  // 5. Wait for confirmation (Ethers v6 syntax)
  await token.waitForDeployment();

  // 6. Retrieve the final address
  const deployedAddress = await token.getAddress();

  console.log("CarbonToken successfully deployed.");
  console.log("Contract Address:", deployedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });