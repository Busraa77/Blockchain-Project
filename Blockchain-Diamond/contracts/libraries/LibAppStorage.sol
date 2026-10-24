// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library LibAppStorage {
    bytes32 internal constant APP_STORAGE_POSITION =
        keccak256("tubitak.metaverse.app.storage");

    enum AvatarState {
        None,
        Idle,
        Busy,
        Offline,
        Online
    }

    enum AssetState {
        None,
        Idle,
        InUse,
        Equipped,
        Locked
    }

    struct AvatarProfile {
        address owner;
        string avatarURI;
        AvatarState state;
        bool active;
    }

    struct AssetProfile {
        bytes32 assetClass;
        bytes32 slotType;
        bytes32 fingerprint;
        string metadataURI;
        string compatibilityURI;
    }

    struct UsageInfo {
        address user;
        uint256 avatarId;
        uint64 expires;
        bool active;
    }

    struct EquipInfo {
        uint256 avatarId;
        bytes32 slotType;
        uint64 equippedAt;
        bool equipped;
    }

    struct WorldProfile {
        bytes32 worldId;
        bool supported;
        string profileURI;
    }

    struct AssetMessage {
        uint256 messageId;
        uint256 tokenId;
        address sender;
        string contentURI;
        uint64 sentAt;
        bool active;
    }

    struct AppStorage {
        uint256 nextAvatarId;
        uint256 nextTokenId;
        uint256 nextMessageId;

        mapping(uint256 => AvatarProfile) avatarProfiles;
        mapping(address => uint256) avatarOfUser;

        mapping(uint256 => address) assetOwners;
        mapping(address => uint256) assetBalances;
        mapping(uint256 => address) assetApprovals;

        mapping(uint256 => AssetProfile) assetProfiles;
        mapping(uint256 => AssetState) assetStates;

        mapping(uint256 => UsageInfo) usageInfos;
        mapping(uint256 => EquipInfo) equipInfos;

        mapping(uint256 => mapping(bytes32 => WorldProfile))
            worldProfiles;

        mapping(uint256 => AssetMessage) messages;
        mapping(uint256 => uint256[]) assetMessageIds;
    }

    function appStorage()
        internal
        pure
        returns (AppStorage storage s)
    {
        bytes32 position = APP_STORAGE_POSITION;

        assembly {
            s.slot := position
        }
    }
}