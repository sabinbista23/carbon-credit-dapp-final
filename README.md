# Carbon Credit App

## Overview
The Carbon Credit App is a blockchain-based platform that facilitates the issuance, transfer, and management of carbon credits using smart contracts. This project leverages decentralized technology to enhance transparency and traceability in the carbon credit ecosystem, ensuring that credits are only issued to legitimate projects and used correctly.

## Features
- Issuance of Carbon Credits: Allows projects to issue tokenized carbon credits once approved.
- Transfer of Credits: Users can securely transfer carbon credits between accounts.
- Smart Contracts: Automated validation and processing of carbon credits through smart contracts.
- Transparency: Full traceability of carbon credits across their lifecycle on the blockchain.

## Prerequisites
Before getting started, ensure you have the following installed:  
- Node.js
- Hardhat
- Solidity (Smart contract language)
- A supported wallet like MetaMask for testing blockchain interactions.

## Getting Started

### Windows PowerShell note
If PowerShell blocks running `npm`/`npx` scripts, use `npm.cmd` / `npx.cmd`, or run:

```
Set-ExecutionPolicy -Scope Process Bypass
```

1. Clone the Repository
```
git clone https://github.com/dteti-sys-rsch/carbon-credit-app.git
cd carbon-credit-app
```
2. Install Dependencies
```
npm install
```
3. Run Hardhat Locally
```
npx hardhat node
```
4. Compile Smart Contracts
```
npx hardhat compile
```
5. Deploy Smart Contracts
```
npx hardhat run scripts/deploy.js --network localhost
```
6. Set .env variables for 
```
API_URL="YOUR_SEPOLIA_RPC_URL" // Sepolia RPC URL (or localhost RPC if testing locally)
PRIVATE_KEY="YOUR_PRIVATE_KEY" // deployer wallet private key (Sepolia funded if using Sepolia)
SECRET_MESSAGE="YOUR_SECRET_MESSAGE" // authentication key
PINATA_API_KEY="YOUR_PINATA_API_KEY" // for backend upload to IPFS via Pinata
PINATA_SECRET_API_KEY="YOUR_PINATA_SECRET_API_KEY" // for backend upload to IPFS via Pinata
```
7. Install React Application Dependencies
```
cd client
npm install
```
8. Set .env variables for React App
```
REACT_APP_SECRET_MESSAGE="YOUR_SECRET_MESSAGE" // must match SECRET_MESSAGE
REACT_APP_TOKEN_ADDRESS="YOUR_CONTRACT_ADDRESS" // deployed CarbonToken address
REACT_APP_EXPECTED_NETWORK_ID="11155111" // Sepolia chainId (use 31337 for localhost)
```
9. Run the React Application
```
npm start
```

### Run the backend (Pinata proxy)
The backend keeps your Pinata keys off the browser and exposes a local API for file upload/unpin.

```
npm run server:start
```
10. Start interacting with access in http://localhost:3000

## Project Structure
- contracts/: Contains Solidity smart contracts.
- scripts/: Deployment and management scripts for the contracts.
- test/: Automated test files for the smart contracts.
- src/: Front-end application files.
- artifacts/: Compiled contract output files.

## How signing works (anti-tamper)
When minting / listing / buying / deleting a listing, the front-end creates an off-chain signature that is bound to the action parameters (amounts, listing index, IPFS hash, contract address, and chainId). The smart contract verifies this signature before executing the action.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue to discuss proposed changes.

## License
This project is licensed under the MIT License
