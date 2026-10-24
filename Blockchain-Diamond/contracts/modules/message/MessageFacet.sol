// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibAppStorage} from "../../libraries/LibAppStorage.sol";

contract MessageFacet {
    event MessageSent(
        uint256 indexed messageId,
        uint256 indexed tokenId,
        address indexed sender,
        string contentURI
    );

    event MessageDeactivated(
        uint256 indexed messageId
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

    modifier messageExists(uint256 messageId) {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        require(
            s.messages[messageId].sender != address(0),
            "Message does not exist"
        );

        _;
    }

    function sendMessage(
        uint256 tokenId,
        string calldata contentURI
    )
        external
        assetExists(tokenId)
        returns (uint256)
    {
        require(
            bytes(contentURI).length > 0,
            "Empty content URI"
        );

        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        bool isOwner =
            s.assetOwners[tokenId] == msg.sender;

        LibAppStorage.UsageInfo storage usage =
            s.usageInfos[tokenId];

        bool isActiveUser =
            usage.active &&
            usage.user == msg.sender &&
            usage.expires > block.timestamp;

        require(
            isOwner || isActiveUser,
            "Not allowed to send message"
        );

        if (s.nextMessageId == 0) {
            s.nextMessageId = 1;
        }

        uint256 messageId = s.nextMessageId;
        s.nextMessageId++;

        s.messages[messageId] =
            LibAppStorage.AssetMessage({
                messageId: messageId,
                tokenId: tokenId,
                sender: msg.sender,
                contentURI: contentURI,
                sentAt: uint64(block.timestamp),
                active: true
            });

        s.assetMessageIds[tokenId].push(messageId);

        emit MessageSent(
            messageId,
            tokenId,
            msg.sender,
            contentURI
        );

        return messageId;
    }

    function messageOf(
        uint256 messageId
    )
        external
        view
        messageExists(messageId)
        returns (LibAppStorage.AssetMessage memory)
    {
        return LibAppStorage
            .appStorage()
            .messages[messageId];
    }

    function messageIdsOfAsset(
        uint256 tokenId
    )
        external
        view
        assetExists(tokenId)
        returns (uint256[] memory)
    {
        return LibAppStorage
            .appStorage()
            .assetMessageIds[tokenId];
    }

    function deactivateMessage(
        uint256 messageId
    )
        external
        messageExists(messageId)
    {
        LibAppStorage.AppStorage storage s =
            LibAppStorage.appStorage();

        LibAppStorage.AssetMessage storage message =
            s.messages[messageId];

        require(
            message.sender == msg.sender,
            "Not message sender"
        );

        require(
            message.active,
            "Message already inactive"
        );

        message.active = false;

        emit MessageDeactivated(messageId);
    }
}