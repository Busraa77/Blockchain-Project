// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IAsset} from "./interfaces/IAsset.sol";
import {IAvatar} from "./interfaces/IAvatar.sol";

contract Asset is IAsset {
    uint256 public nextTokenId = 1;
    IAvatar public immutable avatarContract;

    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => address) private tokenApprovals;
    mapping(uint256 => AssetProfile) private assetProfiles;
    mapping(uint256 => AssetState) private assetStates;
    mapping(uint256 => UsageInfo) private usageInfos;
    mapping(uint256 => EquipInfo) private equipInfos;
    mapping(uint256 => mapping(bytes32 => WorldProfile)) private worldProfiles;

    constructor(address avatarContractAddress) {
        require(avatarContractAddress != address(0), "Invalid avatar contract");
        avatarContract = IAvatar(avatarContractAddress);
    }

    modifier assetExists(uint256 tokenId) {
        require(owners[tokenId] != address(0), "Asset does not exist");
        _;
    }

    modifier onlyAssetOwner(uint256 tokenId) {
        require(owners[tokenId] == msg.sender, "Not asset owner");
        _;
    }

    function createAsset(
        address owner,
        bytes32 assetClass,
        bytes32 slotType,
        bytes32 fingerprint,
        string calldata metadataURI,
        string calldata compatibilityURI
    ) external override returns (uint256) {
        require(owner != address(0), "Invalid owner");
        require(bytes(metadataURI).length > 0, "Empty metadata URI");

        uint256 tokenId = nextTokenId++;
        owners[tokenId] = owner;
        balances[owner]++;
        assetProfiles[tokenId] = AssetProfile({
            assetClass: assetClass,
            slotType: slotType,
            fingerprint: fingerprint,
            metadataURI: metadataURI,
            compatibilityURI: compatibilityURI
        });
        assetStates[tokenId] = AssetState.Idle;

        emit AssetCreated(tokenId, owner, assetClass);
        return tokenId;
    }

    function ownerOf(uint256 tokenId) external view override assetExists(tokenId) returns (address) {
        return owners[tokenId];
    }

    function balanceOf(address owner) external view override returns (uint256) {
        require(owner != address(0), "Invalid owner");
        return balances[owner];
    }

    function assetProfileOf(uint256 tokenId) external view override assetExists(tokenId) returns (AssetProfile memory) {
        return assetProfiles[tokenId];
    }

    function assetStateOf(uint256 tokenId) external view override assetExists(tokenId) returns (AssetState) {
        return assetStates[tokenId];
    }

    function approve(address approved, uint256 tokenId) external override assetExists(tokenId) onlyAssetOwner(tokenId) {
        address owner = owners[tokenId];
        require(approved != owner, "Cannot approve current owner");
        tokenApprovals[tokenId] = approved;
        emit Approval(owner, approved, tokenId);
    }

    function getApproved(uint256 tokenId) external view override assetExists(tokenId) returns (address) {
        return tokenApprovals[tokenId];
    }

    function transferFrom(address from, address to, uint256 tokenId) external override assetExists(tokenId) {
        require(to != address(0), "Invalid receiver");
        address owner = owners[tokenId];
        require(owner == from, "From is not owner");
        require(msg.sender == owner || msg.sender == tokenApprovals[tokenId], "Not owner or approved");

        balances[from]--;
        balances[to]++;
        owners[tokenId] = to;
        delete tokenApprovals[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function setUser(uint256 tokenId, address user, uint256 avatarId, uint64 expires)
        external override assetExists(tokenId) onlyAssetOwner(tokenId)
    {
        require(user != address(0), "Invalid user");
        require(expires > block.timestamp, "Expiration must be in future");
        require(avatarContract.avatarOwnerOf(avatarId) == user, "User does not own avatar");
        require(avatarContract.isAvatarActive(avatarId), "Avatar is not active");

        usageInfos[tokenId] = UsageInfo({user: user, avatarId: avatarId, expires: expires, active: true});
        assetStates[tokenId] = AssetState.InUse;
        emit AssetUserUpdated(tokenId, user, avatarId, expires);
    }

    function userOf(uint256 tokenId) public view override assetExists(tokenId) returns (address) {
        UsageInfo storage usage = usageInfos[tokenId];
        if (!usage.active || usage.expires <= block.timestamp) return address(0);
        return usage.user;
    }

    function userAvatarOf(uint256 tokenId) external view override assetExists(tokenId) returns (uint256) {
        UsageInfo storage usage = usageInfos[tokenId];
        if (!usage.active || usage.expires <= block.timestamp) return 0;
        return usage.avatarId;
    }

    function userExpires(uint256 tokenId) external view override assetExists(tokenId) returns (uint64) {
        return usageInfos[tokenId].expires;
    }

    function clearUser(uint256 tokenId) external override assetExists(tokenId) onlyAssetOwner(tokenId) {
        delete usageInfos[tokenId];
        assetStates[tokenId] = AssetState.Idle;
        emit AssetUserCleared(tokenId);
    }

    function equip(uint256 tokenId, uint256 avatarId) external override assetExists(tokenId) {
        require(avatarContract.isAvatarActive(avatarId), "Avatar is not active");

        bool isAssetOwner = owners[tokenId] == msg.sender;
        UsageInfo storage usage = usageInfos[tokenId];
        bool isActiveUser = usage.active && usage.user == msg.sender && usage.avatarId == avatarId && usage.expires > block.timestamp;
        require(isAssetOwner || isActiveUser, "Not allowed to equip asset");
        require(avatarContract.avatarOwnerOf(avatarId) == msg.sender, "Not avatar owner");
        require(!equipInfos[tokenId].equipped, "Asset already equipped");

        bytes32 slotType = assetProfiles[tokenId].slotType;
        equipInfos[tokenId] = EquipInfo({avatarId: avatarId, slotType: slotType, equippedAt: uint64(block.timestamp), equipped: true});
        assetStates[tokenId] = AssetState.Equipped;
        emit AssetEquipped(tokenId, avatarId, slotType);
    }

    function unequip(uint256 tokenId) external override assetExists(tokenId) {
        EquipInfo storage info = equipInfos[tokenId];
        require(info.equipped, "Asset is not equipped");
        uint256 avatarId = info.avatarId;
        require(avatarContract.avatarOwnerOf(avatarId) == msg.sender, "Not avatar owner");

        delete equipInfos[tokenId];
        UsageInfo storage usage = usageInfos[tokenId];
        if (usage.active && usage.expires > block.timestamp) {
            assetStates[tokenId] = AssetState.InUse;
        } else {
            assetStates[tokenId] = AssetState.Idle;
        }
        emit AssetUnequipped(tokenId, avatarId);
    }

    function equipInfoOf(uint256 tokenId) external view override assetExists(tokenId) returns (EquipInfo memory) {
        return equipInfos[tokenId];
    }

    function isEquipped(uint256 tokenId) external view override assetExists(tokenId) returns (bool) {
        return equipInfos[tokenId].equipped;
    }

    function setWorldProfile(uint256 tokenId, bytes32 worldId, bool supported, string calldata profileURI)
        external override assetExists(tokenId) onlyAssetOwner(tokenId)
    {
        require(worldId != bytes32(0), "Invalid world ID");
        worldProfiles[tokenId][worldId] = WorldProfile({worldId: worldId, supported: supported, profileURI: profileURI});
        emit WorldProfileUpdated(tokenId, worldId, supported, profileURI);
    }

    function worldProfileOf(uint256 tokenId, bytes32 worldId)
        external view override assetExists(tokenId) returns (WorldProfile memory)
    {
        return worldProfiles[tokenId][worldId];
    }

    function supportsWorld(uint256 tokenId, bytes32 worldId)
        external view override assetExists(tokenId) returns (bool)
    {
        return worldProfiles[tokenId][worldId].supported;
    }
}
