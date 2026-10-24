// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AssetEquipFacet {
    event AssetEquipped(
        uint256 indexed tokenId,
        uint256 indexed avatarId,
        bytes32 indexed slotType
    );

    event AssetUnequipped(
        uint256 indexed tokenId,
        uint256 indexed avatarId
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

    modifier avatarExists(uint256 avatarId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.avatarProfiles[avatarId].owner != address(0),
            "Avatar does not exist"
        );

        _;
    }

    function equip(
        uint256 tokenId,
        uint256 avatarId
    )
        external
        assetExists(tokenId)
        avatarExists(avatarId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AvatarProfile storage avatar =
            s.avatarProfiles[avatarId];

        require(
            avatar.active,
            "Avatar is not active"
        );

        bool isAssetOwner =
            s.assetOwners[tokenId] == msg.sender;

        LibAppStorage.UsageInfo storage usage =
            s.usageInfos[tokenId];

        bool isActiveUser =
            usage.active &&
            usage.user == msg.sender &&
            usage.avatarId == avatarId &&
            usage.expires > block.timestamp;

        require(
            isAssetOwner || isActiveUser,
            "Not allowed to equip asset"
        );

        require(
            avatar.owner == msg.sender,
            "Not avatar owner"
        );

        require(
            !s.equipInfos[tokenId].equipped,
            "Asset already equipped"
        );

        bytes32 slotType =
            s.assetProfiles[tokenId].slotType;

        s.equipInfos[tokenId] =
            LibAppStorage.EquipInfo({
                avatarId: avatarId,
                slotType: slotType,
                equippedAt: uint64(block.timestamp),
                equipped: true
            });

        s.assetStates[tokenId] =
            LibAppStorage.AssetState.Equipped;

        emit AssetEquipped(
            tokenId,
            avatarId,
            slotType
        );
    }

    function unequip(
        uint256 tokenId
    )
        external
        assetExists(tokenId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.EquipInfo storage equipInfo =
            s.equipInfos[tokenId];

        require(
            equipInfo.equipped,
            "Asset is not equipped"
        );

        uint256 avatarId = equipInfo.avatarId;

        require(
            s.avatarProfiles[avatarId].owner == msg.sender,
            "Not avatar owner"
        );

        delete s.equipInfos[tokenId];

        LibAppStorage.UsageInfo storage usage =
            s.usageInfos[tokenId];

        if (
            usage.active &&
            usage.expires > block.timestamp
        ) {
            s.assetStates[tokenId] =
                LibAppStorage.AssetState.InUse;
        } else {
            s.assetStates[tokenId] =
                LibAppStorage.AssetState.Idle;
        }

        emit AssetUnequipped(
            tokenId,
            avatarId
        );
    }

    function equipInfoOf(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (LibAppStorage.EquipInfo memory)
    {
        return LibAppStorage
            .appStorage()
            .equipInfos[tokenId];
    }

    function isEquipped(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (bool)
    {
        return LibAppStorage
            .appStorage()
            .equipInfos[tokenId]
            .equipped;
    }
}