// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../../libraries/LibDiamond.sol";

//diamondun sahibini sorgular veya transfer eder
contract OwnershipFacet {
    function transferOwnership(
        address newOwner
    ) external {
        LibDiamond.enforceIsContractOwner();

        require(
            newOwner != address(0),
            "OwnershipFacet: New owner is zero address"
        );

        LibDiamond.setContractOwner(newOwner);
    }

    function owner()
        external
        view
        returns (address)
    {
        return LibDiamond.contractOwner();
    }
}