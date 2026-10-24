// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IMessage} from "../interfaces/IMessage.sol";
import {IAsset} from "../interfaces/IAsset.sol";

contract MessageExtension is IMessage {
    uint256 public nextMessageId = 1;
    IAsset public immutable assetContract;

    mapping(uint256 => AssetMessage) private messages;
    mapping(uint256 => uint256[]) private assetMessageIds;

    constructor(address assetContractAddress) {
        require(assetContractAddress != address(0), "Asset contract is zero address");
        assetContract = IAsset(assetContractAddress);
    }

    modifier assetExists(uint256 tokenId) {
        assetContract.ownerOf(tokenId);
        _;
    }

    modifier messageExists(uint256 messageId) {
        require(messages[messageId].sender != address(0), "Message does not exist");
        _;
    }

    function sendMessage(uint256 tokenId, string calldata contentURI)
        external override assetExists(tokenId) returns (uint256)
    {
        require(bytes(contentURI).length > 0, "Empty content URI");

        address assetOwner = assetContract.ownerOf(tokenId);
        address activeUser = assetContract.userOf(tokenId);
        require(
            msg.sender == assetOwner || msg.sender == activeUser,
            "Not allowed to send message"
        );

        uint256 messageId = nextMessageId++;
        messages[messageId] = AssetMessage({
            messageId: messageId,
            tokenId: tokenId,
            sender: msg.sender,
            contentURI: contentURI,
            sentAt: uint64(block.timestamp),
            active: true
        });
        assetMessageIds[tokenId].push(messageId);

        emit MessageSent(messageId, tokenId, msg.sender, contentURI);
        return messageId;
    }

    function messageOf(uint256 messageId)
        external view override messageExists(messageId)
        returns (AssetMessage memory)
    {
        return messages[messageId];
    }

    function messageIdsOfAsset(uint256 tokenId)
        external view override assetExists(tokenId)
        returns (uint256[] memory)
    {
        return assetMessageIds[tokenId];
    }

    function deactivateMessage(uint256 messageId)
        external override messageExists(messageId)
    {
        AssetMessage storage message = messages[messageId];
        require(message.sender == msg.sender, "Not message sender");
        require(message.active, "Message already inactive");
        message.active = false;
        emit MessageDeactivated(messageId);
    }
}
