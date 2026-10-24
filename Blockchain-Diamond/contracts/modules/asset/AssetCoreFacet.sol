// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AssetCoreFacet {
    event AssetCreated(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 assetClass
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

    function createAsset(
        address owner,
        bytes32 assetClass,
        bytes32 slotType,
        bytes32 fingerprint,
        string calldata metadataURI,
        string calldata compatibilityURI
    ) external returns (uint256) {
        require(
            owner != address(0),
            "Invalid owner"
        );

        require(
            bytes(metadataURI).length > 0,
            "Empty metadata URI"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        if (s.nextTokenId == 0) {
            s.nextTokenId = 1;
        }

        uint256 tokenId = s.nextTokenId;
        s.nextTokenId++;

        s.assetOwners[tokenId] = owner;
        s.assetBalances[owner]++;

        s.assetProfiles[tokenId] =
            LibAppStorage.AssetProfile({
                assetClass: assetClass,
                slotType: slotType,
                fingerprint: fingerprint,
                metadataURI: metadataURI,
                compatibilityURI: compatibilityURI
            });

        s.assetStates[tokenId] =
            LibAppStorage.AssetState.Idle;

        emit AssetCreated(
            tokenId,
            owner,
            assetClass
        );

        return tokenId;
    }

    function ownerOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (address)
    {
        return LibAppStorage
            .appStorage()
            .assetOwners[tokenId];
    }

    function balanceOf(
        address owner
    ) external view returns (uint256) {
        require(
            owner != address(0),
            "Invalid owner"
        );

        return LibAppStorage
            .appStorage()
            .assetBalances[owner];
    }

    function assetProfileOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (LibAppStorage.AssetProfile memory)
    {
        return LibAppStorage
            .appStorage()
            .assetProfiles[tokenId];
    }

    function assetStateOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (LibAppStorage.AssetState)
    {
        return LibAppStorage
            .appStorage()
            .assetStates[tokenId];
    }
}