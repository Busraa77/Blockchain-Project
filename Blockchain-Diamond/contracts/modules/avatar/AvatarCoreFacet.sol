// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AvatarCoreFacet {
    event AvatarCreated(
        uint256 indexed avatarId,
        address indexed owner,
        string avatarURI
    );

    event AvatarURIUpdated(
        uint256 indexed avatarId,
        string avatarURI
    );

    event AvatarStateChanged(
        uint256 indexed avatarId,
        LibAppStorage.AvatarState oldState,
        LibAppStorage.AvatarState newState
    );

    modifier avatarExists(uint256 avatarId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.avatarProfiles[avatarId].owner != address(0),
            "Avatar does not exist"
        );

        _;
    }

    modifier onlyAvatarOwner(uint256 avatarId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.avatarProfiles[avatarId].owner == msg.sender,
            "Not avatar owner"
        );

        _;
    }

    function createAvatar(
        address owner,
        string calldata avatarURI
    ) external returns (uint256) {
        require(
            owner != address(0),
            "Invalid owner"
        );

        require(
            bytes(avatarURI).length > 0,
            "Empty avatar URI"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        if (s.nextAvatarId == 0) {
            s.nextAvatarId = 1;
        }

        uint256 avatarId = s.nextAvatarId;
        s.nextAvatarId++;

        s.avatarProfiles[avatarId] =
            LibAppStorage.AvatarProfile({
                owner: owner,
                avatarURI: avatarURI,
                state: LibAppStorage.AvatarState.Idle,
                active: true
            });

        s.avatarOfUser[owner] = avatarId;

        emit AvatarCreated(
            avatarId,
            owner,
            avatarURI
        );

        emit AvatarStateChanged(
            avatarId,
            LibAppStorage.AvatarState.None,
            LibAppStorage.AvatarState.Idle
        );

        return avatarId;
    }

    function avatarProfileOf(
        uint256 avatarId
    )
        external
        view
        avatarExists(avatarId)
        returns (LibAppStorage.AvatarProfile memory)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        return s.avatarProfiles[avatarId];
    }

    function avatarOwnerOf(
        uint256 avatarId
    )
        external
        view
        avatarExists(avatarId)
        returns (address)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        return s.avatarProfiles[avatarId].owner;
    }

    function avatarURIOf(
        uint256 avatarId
    )
        external
        view
        avatarExists(avatarId)
        returns (string memory)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        return s.avatarProfiles[avatarId].avatarURI;
    }

    function updateAvatarURI(
        uint256 avatarId,
        string calldata newAvatarURI
    )
        external
        avatarExists(avatarId)
        onlyAvatarOwner(avatarId)
    {
        require(
            bytes(newAvatarURI).length > 0,
            "Empty avatar URI"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.avatarProfiles[avatarId].active,
            "Avatar is not active"
        );

        s.avatarProfiles[avatarId].avatarURI =
            newAvatarURI;

        emit AvatarURIUpdated(
            avatarId,
            newAvatarURI
        );
    }
}