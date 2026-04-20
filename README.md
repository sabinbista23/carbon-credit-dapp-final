# Carbon Credit App

## Overview

The Carbon Credit App is a blockchain-based platform that facilitates the issuance, transfer, and management of carbon credits using smart contracts. It includes a React front end, an Express backend (Pinata proxy), and a Hardhat project for deployment/testing.

## Prerequisites

- Node.js + npm
- MetaMask (browser extension)
- Pinata API key with scopes `pinFileToIPFS` + `unpin`

## Getting Started (Local Hardhat)

### Windows PowerShell note

If PowerShell blocks `npm`/`npx` scripts, use `npm.cmd` / `npx.cmd`, or run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

Quick links (blue links on GitHub):

- [Step 1: Clone](#1-clone-the-repository)
- [Step 2: Install](#2-install-dependencies)
- [Step 3: Hardhat node](#3-start-a-local-blockchain)
- [Step 4: Compile](#4-compile-smart-contracts)
- [Step 5: Deploy local](#5-deploy-smart-contracts-to-localhost)
- [Step 6: Env files](#6-configure-environment-variables)
- [Step 7: Client deps](#7-install-react-application-dependencies)
- [Step 8: Backend](#8-start-the-backend-pinata-proxy)
- [Step 9: Client](#9-run-the-react-application)
- [Sepolia demo](#sepolia-demo-testnet)
- [Evidence (Sepolia)](#evidence-sepolia)
- [Code quality](#code-quality)

### [1) Clone the Repository](#1-clone-the-repository)

```bash
git clone https://github.com/dteti-sys-rsch/carbon-credit-app.git
cd carbon-credit-app
```

### [2) Install Dependencies](#2-install-dependencies)

```bash
npm.cmd install
```

### [3) Start a local blockchain](#3-start-a-local-blockchain)

```bash
npx.cmd hardhat node
```

### [4) Compile Smart Contracts](#4-compile-smart-contracts)

```bash
npm.cmd run compile
```

### [5) Deploy Smart Contracts to localhost](#5-deploy-smart-contracts-to-localhost)

```bash
npm.cmd run deploy:localhost
```

Copy the printed `Contract Address:` and put it into `client/.env` as `REACT_APP_TOKEN_ADDRESS`.

### [6) Configure environment variables](#6-configure-environment-variables)

Copy:

- `.env.example` -> `.env`
- `client/.env.example` -> `client/.env`

Root `.env` (backend + Hardhat):

```env
SECRET_MESSAGE="carbon-credits-2026"
PINATA_API_KEY="YOUR_PINATA_API_KEY"
PINATA_SECRET_API_KEY="YOUR_PINATA_SECRET_API_KEY"
```

Client `client/.env` (React):

```env
REACT_APP_TOKEN_ADDRESS="YOUR_LOCAL_CONTRACT_ADDRESS"
REACT_APP_EXPECTED_NETWORK_ID="31337"
REACT_APP_SECRET_MESSAGE="carbon-credits-2026"
```

### [7) Install React Application Dependencies](#7-install-react-application-dependencies)

```bash
npm.cmd --prefix client install
```

### [8) Start the backend (Pinata proxy)](#8-start-the-backend-pinata-proxy)

```bash
npm.cmd run server:start
```

Health check: open `http://localhost:5001/health` (should return `{ "ok": true }`).

Backend endpoints (used by the React app):

- `GET /health` (liveness)
- `POST /api/pinata/pinFile` (multipart form-data, field name: `file`)
- `POST /api/pinata/pinJSON` (pins JSON to IPFS via Pinata)
- `DELETE /api/pinata/unpin/:hash` (unpin by CID)

### [9) Run the React Application](#9-run-the-react-application)

```bash
npm.cmd run client:start
```

Open `http://localhost:3000`.

## Sepolia demo (testnet)

Sepolia is the Ethereum test network (chainId `11155111`).

1. In MetaMask, enable test networks and select Sepolia.

2. Fund your deployer account with Sepolia ETH (faucet).

3. Set these in root `.env` (used by Hardhat):

```env
API_URL="YOUR_SEPOLIA_RPC_HTTPS_URL"
PRIVATE_KEY="YOUR_SEPOLIA_FUNDED_PRIVATE_KEY"
SECRET_MESSAGE="carbon-credits-2026"
PINATA_API_KEY="YOUR_PINATA_API_KEY"
PINATA_SECRET_API_KEY="YOUR_PINATA_SECRET_API_KEY"
```

4. Deploy to Sepolia:

```bash
npm.cmd run deploy:sepolia
```

5. Put the printed `Contract Address:` into `client/.env`:

```env
REACT_APP_TOKEN_ADDRESS="YOUR_SEPOLIA_CONTRACT_ADDRESS"
REACT_APP_EXPECTED_NETWORK_ID="11155111"
REACT_APP_SECRET_MESSAGE="carbon-credits-2026"
```

6. Start backend + client:

```bash
npm.cmd run server:start
npm.cmd run client:start
```

### Common problems

- Wrong network (`Expected chainId 11155111, got 31337`): switch MetaMask to Sepolia and restart the client.
- Pinata `403 (NO_SCOPES_FOUND)`: recreate the Pinata key with `pinFileToIPFS` + `unpin`, update root `.env`, restart backend.
- Pinata `502`: backend not running or Pinata rejected the request; start backend and check `http://localhost:5001/health`.

## Evidence (Sepolia)

Paste your Sepolia evidence here for the report/demo:

- Contract deploy tx: `<0x268bc410bb4d5147355e034498a5e2a087df55f7b1b3270d2e03be619060db7f>`
- Mint tx: `<0x40b17ee0ead270f13640fefec10825f362ee2764a41550a31bdedf6751f53c42>`
- List-for-sale tx: `<0x2c1c747dc0a09f1e556249262a62a2ff094e619604c9f80287a5500cdea75c3d>`
- Buy tx: `<0x4271d33131cba79137d21c1b655d1b2eb8c48d6a4bad2a951cdfb4b45112a1a1>`

## Code quality

This repo uses Prettier for basic code formatting.

- Check formatting: `npm.cmd run format:check`
- Auto-format: `npm.cmd run format`

## Project Structure

- `contracts/`: Solidity smart contracts
- `scripts/`: Hardhat deployment scripts
- `test/`: Hardhat tests
- `server/`: Express backend (Pinata proxy)
- `client/`: React front-end
- `artifacts/`: compiled contract output

## How signing works (anti-tamper)

When minting / listing / buying / deleting a listing, the front-end creates an off-chain signature that is bound to the action parameters (amounts, listing index, IPFS hash, contract address, and chainId). The smart contract verifies this signature before executing the action.

Additional on-chain protections:

- Certificate de-duplication: the contract rejects minting the same non-empty IPFS hash twice.
- Safer purchases: `buyToken` sends exactly the listing price to the seller and refunds any overpayment to the buyer.
