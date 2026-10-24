# Blockchain-Based Shared Data Layer for Interoperable Metaverse Applications

A modular blockchain-based smart contract system for managing shared avatar and digital asset information across metaverse applications.

The project implements an **EIP-2535 Diamond-based architecture** in which application functionality is divided into independent facets while a shared on-chain storage structure maintains common application state. The system provides a unified contract interface for managing avatars, digital assets, ownership, usage rights, avatar–asset associations, world compatibility, and asset-related messages.

## Overview

Metaverse applications commonly maintain their own user, avatar, and digital asset data structures. As a result, information created in one application may not be directly accessible or interpretable by another application.

This project investigates a blockchain-based shared data layer in which multiple applications can access common on-chain avatar and digital asset records.

### Main Objectives

* Provide a shared on-chain data layer for metaverse applications
* Manage avatar and digital asset information through modular smart contracts
* Maintain ownership and transfer information on-chain
* Support time-limited asset usage rights
* Associate digital assets with authorized avatars
* Store world-specific asset compatibility information
* Associate messages or content references with digital assets
* Provide a single Diamond contract address as the system interface
* Evaluate the implementation through automated functional, integration, authorization, and gas tests

## Architecture

The system is based on the **EIP-2535 Diamond architecture**.

```text
                    METAVERSE APPLICATIONS
                             |
                             v
                    --------------------
                   |   DIAMOND CONTRACT  |
                   |  Unified Interface  |
                    ---------------------
                              |
             -----------------------------------
             |                |                |
             v                v                v
        -----------      -----------      -----------
       |  Avatar   |    |   Asset   |    |  Message  |
       |  Facets   |    |  Facets   |    |   Facet   |
        -----------      ----------       -----------
             |                |                |
             -----------------+-----------------
                              |
                              v
                     ---------------------
                    |     AppStorage      |
                    | Shared Application  |
                    |       State         |
                     ----------+----------
                               |
                               v
                          BLOCKCHAIN
```

### Diamond and Facets

The Diamond contract provides a single entry point for interacting with the system. Function calls are routed to the appropriate facet according to their function selectors.

The current implementation separates application functionality into the following facets:

| Facet                     | Responsibility                                                     |
| ------------------------- | ------------------------------------------------------------------ |
| `AvatarCoreFacet`         | Creating avatars and managing avatar ownership and URI information |
| `AvatarStateFacet`        | Managing avatar operational states and activation status           |
| `AssetCoreFacet`          | Creating digital assets and storing asset information              |
| `AssetTransferFacet`      | Managing transfer approvals and asset ownership transfers          |
| `AssetUsageFacet`         | Managing time-limited usage rights                                 |
| `AssetEquipFacet`         | Associating assets with authorized avatars                         |
| `AssetCompatibilityFacet` | Recording asset compatibility information for virtual worlds       |
| `MessageFacet`            | Managing messages or content references associated with assets     |

Diamond management functionality is provided through the corresponding Diamond facets, including facet management, facet inspection, and ownership management.

## Shared Storage

Application data is stored in a shared `AppStorage` structure accessed through the `LibAppStorage` library.

The shared storage contains information including:

* Avatar identifiers
* Avatar owners
* Avatar URIs
* Avatar states
* Digital asset identifiers
* Asset ownership and transfer approvals
* Asset profiles and metadata
* Asset states
* Time-limited usage information
* Avatar–asset associations
* World compatibility information
* World-specific profile URIs
* Asset-related message and content references

The Diamond's own management data is maintained separately through `LibDiamond`.

This separation allows the technical Diamond infrastructure and application-specific metaverse data to be managed independently.


### World Compatibility

The compatibility module stores whether an asset is supported by a specific virtual world or application.

A compatibility record can contain:

* Asset identifier
* World identifier
* Compatibility status
* World-specific profile URI

The compatibility record does not automatically make an asset executable or visually compatible with a particular metaverse. Instead, it provides on-chain information that an application can query when determining how an asset should be represented.


## Standards and Architecture

The project is based on concepts from:

* **EIP-2535 Diamond Standard** — modular and upgradeable smart contract architecture
* **ERC-721** — digital asset ownership and transfer concepts
* **ERC-4907** — separation of ownership and time-limited usage concepts

The implementation uses these standards as architectural references where applicable and does not claim complete implementation of ERC-721 or ERC-4907.

## Technology Stack

| Technology | Version / Role                   |
| ---------- | -------------------------------- |
| Solidity   | `0.8.28`                         |
| Hardhat    | `3.9.1`                          |
| Ethers.js  | `6.17.0`                         |
| TypeScript | Test and development environment |
| Mocha      | Testing framework                |
| Chai       | Assertions                       |
| EIP-2535   | Diamond architecture             |


## Installation

Clone the repository:

```bash
git clone https://github.com/Busraa77/Blockchain-diamond.git
cd Blockchain-diamond
```

Install dependencies:

```bash
npm install
```

## Compile

Compile the smart contracts with:

```bash
npx hardhat compile
```

## Testing

Run the automated test suite with:

```bash
npx hardhat test
```

## Research Context

This repository supports research on blockchain-based interoperability between metaverse applications.

The corresponding research investigates whether a modular smart contract architecture can provide a shared on-chain data layer through which independent applications can access common avatar and digital asset state.

The research evaluates the following questions:

**RQ1:** Can avatar, digital asset, usage, compatibility, and messaging modules be managed modularly through a single Diamond contract?

**RQ2:** Can a shared storage structure ensure the consistent use of ownership, usage, avatar association, and world profile information across modules?

**RQ3:** Can the developed smart contracts successfully satisfy the defined functional and authorization tests?


