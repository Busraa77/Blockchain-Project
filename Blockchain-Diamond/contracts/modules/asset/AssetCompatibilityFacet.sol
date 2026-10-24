// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AssetCompatibilityFacet {
    event WorldProfileUpdated(
        uint256 indexed tokenId,
        bytes32 indexed worldId,
        bool supported,
        string profileURI
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

    function setWorldProfile(
        uint256 tokenId,
        bytes32 worldId,
        bool supported,
        string calldata profileURI
    )
        external
        assetExists(tokenId)
        onlyAssetOwner(tokenId)
    {
        require(
            worldId != bytes32(0),
            "Invalid world ID"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        s.worldProfiles[tokenId][worldId] =
            LibAppStorage.WorldProfile({
                worldId: worldId,
                supported: supported,
                profileURI: profileURI
            });

        emit WorldProfileUpdated(
            tokenId,
            worldId,
            supported,
            profileURI
        );
    }

    function worldProfileOf(
        uint256 tokenId,
        bytes32 worldId
    )
        external
        view
        assetExists(tokenId)
        returns (LibAppStorage.WorldProfile memory)
    {
        return LibAppStorage
            .appStorage()
            .worldProfiles[tokenId][worldId];
    }

    function supportsWorld(
        uint256 tokenId,
        bytes32 worldId
    )
        external
        view
        assetExists(tokenId)
        returns (bool)
    {
        return LibAppStorage
            .appStorage()
            .worldProfiles[tokenId][worldId]
            .supported;
    }
}