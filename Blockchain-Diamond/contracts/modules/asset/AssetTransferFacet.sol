// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AssetTransferFacet {
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );

    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    modifier assetExists(uint256 tokenId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.assetOwners[tokenId] != address(0),
            "Asset does not exist"
        );

        _;
    }

    modifier onlyAssetOwner(uint256 tokenId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.assetOwners[tokenId] == msg.sender,
            "Not asset owner"
        );

        _;
    }

    function approve(
        address approved,
        uint256 tokenId
    )
        external
        assetExists(tokenId)
        onlyAssetOwner(tokenId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        address owner = s.assetOwners[tokenId];

        require(
            approved != owner,
            "Cannot approve current owner"
        );

        s.assetApprovals[tokenId] = approved;

        emit Approval(
            owner,
            approved,
            tokenId
        );
    }

    function getApproved(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (address)
    {
        return LibAppStorage
            .appStorage()
            .assetApprovals[tokenId];
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    )
        external
        assetExists(tokenId)
    {
        require(
            to != address(0),
            "Invalid receiver"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        address owner = s.assetOwners[tokenId];

        require(
            owner == from,
            "From is not owner"
        );

        require(
            msg.sender == owner ||
                msg.sender == s.assetApprovals[tokenId],
            "Not owner or approved"
        );

        s.assetBalances[from]--;
        s.assetBalances[to]++;

        s.assetOwners[tokenId] = to;

        delete s.assetApprovals[tokenId];

        emit Transfer(
            from,
            to,
            tokenId
        );
    }
}