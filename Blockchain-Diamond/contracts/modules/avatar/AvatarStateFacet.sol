// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract AvatarStateFacet {
    event AvatarStateChanged(
        uint256 indexed avatarId,
        LibAppStorage.AvatarState oldState,
        LibAppStorage.AvatarState newState
    );

    event AvatarDeactivated(
        uint256 indexed avatarId
    );

    event AvatarReactivated(
        uint256 indexed avatarId
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

    function setAvatarState(
        uint256 avatarId,
        LibAppStorage.AvatarState newState
    )
        external
        avatarExists(avatarId)
        onlyAvatarOwner(avatarId)
    {
        require(
            newState != LibAppStorage.AvatarState.None,
            "Invalid avatar state"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AvatarProfile storage avatar =
            s.avatarProfiles[avatarId];

        require(
            avatar.active,
            "Avatar is not active"
        );

        LibAppStorage.AvatarState oldState =
            avatar.state;

        avatar.state = newState;

        emit AvatarStateChanged(
            avatarId,
            oldState,
            newState
        );
    }

    function deactivateAvatar(
        uint256 avatarId
    )
        external
        avatarExists(avatarId)
        onlyAvatarOwner(avatarId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AvatarProfile storage avatar =
            s.avatarProfiles[avatarId];

        require(
            avatar.active,
            "Avatar already inactive"
        );

        LibAppStorage.AvatarState oldState =
            avatar.state;

        avatar.active = false;
        avatar.state =
            LibAppStorage.AvatarState.Offline;

        emit AvatarStateChanged(
            avatarId,
            oldState,
            LibAppStorage.AvatarState.Offline
        );

        emit AvatarDeactivated(avatarId);
    }

    function reactivateAvatar(
        uint256 avatarId
    )
        external
        avatarExists(avatarId)
        onlyAvatarOwner(avatarId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AvatarProfile storage avatar =
            s.avatarProfiles[avatarId];

        require(
            !avatar.active,
            "Avatar already active"
        );

        LibAppStorage.AvatarState oldState =
            avatar.state;

        avatar.active = true;
        avatar.state =
            LibAppStorage.AvatarState.Idle;

        emit AvatarStateChanged(
            avatarId,
            oldState,
            LibAppStorage.AvatarState.Idle
        );

        emit AvatarReactivated(avatarId);
    }

    function avatarStateOf(
        uint256 avatarId
    )
        external
        view
        avatarExists(avatarId)
        returns (LibAppStorage.AvatarState)
    {
        return LibAppStorage
            .appStorage()
            .avatarProfiles[avatarId]
            .state;
    }

    function isAvatarActive(
        uint256 avatarId
    )
        external
        view
        avatarExists(avatarId)
        returns (bool)
    {
        return LibAppStorage
            .appStorage()
            .avatarProfiles[avatarId]
            .active;
    }
}