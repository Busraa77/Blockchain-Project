// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAsset {
    enum AssetState { None, Idle, InUse, Equipped, Locked }

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

    event AssetCreated(uint256 indexed tokenId, address indexed owner, bytes32 assetClass);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event AssetUserUpdated(uint256 indexed tokenId, address indexed user, uint256 indexed avatarId, uint64 expires);
    event AssetUserCleared(uint256 indexed tokenId);
    event AssetEquipped(uint256 indexed tokenId, uint256 indexed avatarId, bytes32 indexed slotType);
    event AssetUnequipped(uint256 indexed tokenId, uint256 indexed avatarId);
    event WorldProfileUpdated(uint256 indexed tokenId, bytes32 indexed worldId, bool supported, string profileURI);

    function createAsset(address owner, bytes32 assetClass, bytes32 slotType, bytes32 fingerprint,
        string calldata metadataURI, string calldata compatibilityURI) external returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function assetProfileOf(uint256 tokenId) external view returns (AssetProfile memory);
    function assetStateOf(uint256 tokenId) external view returns (AssetState);

    function approve(address approved, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;

    function setUser(uint256 tokenId, address user, uint256 avatarId, uint64 expires) external;
    function userOf(uint256 tokenId) external view returns (address);
    function userAvatarOf(uint256 tokenId) external view returns (uint256);
    function userExpires(uint256 tokenId) external view returns (uint64);
    function clearUser(uint256 tokenId) external;

    function equip(uint256 tokenId, uint256 avatarId) external;
    function unequip(uint256 tokenId) external;
    function equipInfoOf(uint256 tokenId) external view returns (EquipInfo memory);
    function isEquipped(uint256 tokenId) external view returns (bool);

    function setWorldProfile(uint256 tokenId, bytes32 worldId, bool supported, string calldata profileURI) external;
    function worldProfileOf(uint256 tokenId, bytes32 worldId) external view returns (WorldProfile memory);
    function supportsWorld(uint256 tokenId, bytes32 worldId) external view returns (bool);
}
