# AlloX dApp

A Web3 points and rewards dashboard built on **BNB Smart Chain (BSC)** and compatible with other EVM networks, featuring seamless wallet connectivity via the **BNB Wallet SDK**.

## Technology Stack

- **Blockchain**: BNB Smart Chain + EVM-compatible chains
- **BNB Chain SDKs:** `@binance/w3w-wagmi-connector-v2` (BNB Chain official Web3 Wallet Connector)
- **Smart Contracts**: Solidity ^0.8.x
- **Frontend**: React + ethers.js + BNB Wallet SDK
- **Development**: Hardhat, OpenZeppelin libraries

## Supported Networks

- **BNB Smart Chain Mainnet** (Chain ID: 56)
- **Ethereum Mainnet** (Chain ID: 1)
- **Base Mainnet** (Chain ID: 8453)

## Contract Addresses

| Network          | Check-in Contract Address                    |
| ---------------- | -------------------------------------------- |
| Base Mainnet     | `0x43be8192363899B853a98661e2ea6451940e27e3` |
| Ethereum Mainnet | `0x43be8192363899b853a98661e2ea6451940e27e3` |
| BNB Mainnet      | `0x43be8192363899b853a98661e2ea6451940e27e3` |

> **Note**: These addresses correspond to the deployed check-in contracts on each supported network.

## Features

- **BNB Wallet SDK integration**: Native integration with the **BNB Wallet SDK** for secure, seamless wallet connections, transaction signing, and account management directly in the dApp.
- **Points and rewards system**: Users can earn points through activities such as welcome bonuses, daily check-ins, portfolio creation, AI chat interactions, and more.
- **Engagement-focused UX**: Modern, responsive UI with a points dashboard, activity cards, and clear progress tracking to encourage on-chain activity.
- **Multi-network readiness**: Designed to support BNB Smart Chain (mainnet and testnet) and other EVM networks with minimal configuration changes.
