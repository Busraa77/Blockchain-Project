// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AssetUsageFacet {
    event AssetUserUpdated(
        uint256 indexed tokenId,
        address indexed user,
        uint256 indexed avatarId,
        uint64 expires
    );

    event AssetUserCleared(
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

    function setUser(
        uint256 tokenId,
        address user,
        uint256 avatarId,
        uint64 expires
    )
        external
        assetExists(tokenId)
        onlyAssetOwner(tokenId)
    {
        require(
            user != address(0),
            "Invalid user"
        );

        require(
            expires > block.timestamp,
            "Expiration must be in future"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AvatarProfile storage avatar =
            s.avatarProfiles[avatarId];

        require(
            avatar.owner == user,
            "User does not own avatar"
        );

        require(
            avatar.active,
            "Avatar is not active"
        );

        s.usageInfos[tokenId] =
            LibAppStorage.UsageInfo({
                user: user,
                avatarId: avatarId,
                expires: expires,
                active: true
            });

        s.assetStates[tokenId] =
            LibAppStorage.AssetState.InUse;

        emit AssetUserUpdated(
            tokenId,
            user,
            avatarId,
            expires
        );
    }

    function userOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (address)
    {
        LibAppStorage.UsageInfo storage usage =
            LibAppStorage
                .appStorage()
                .usageInfos[tokenId];

        if (
            !usage.active ||
            usage.expires <= block.timestamp
        ) {
            return address(0);
        }

        return usage.user;
    }

    function userAvatarOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (uint256)
    {
        LibAppStorage.UsageInfo storage usage =
            LibAppStorage
                .appStorage()
                .usageInfos[tokenId];

        if (
            !usage.active ||
            usage.expires <= block.timestamp
        ) {
            return 0;
        }

        return usage.avatarId;
    }

    function userExpires(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (uint64)
    {
        return LibAppStorage
            .appStorage()
            .usageInfos[tokenId]
            .expires;
    }

    function clearUser(
        uint256 tokenId
    )
        external
        assetExists(tokenId)
        onlyAssetOwner(tokenId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        delete s.usageInfos[tokenId];

        s.assetStates[tokenId] =
            LibAppStorage.AssetState.Idle;

        emit AssetUserCleared(tokenId);
    }
}