// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//Diamond’ın içini incelememizi sağlar
interface IDiamondLoupe {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    function facets()
        external
        view
        returns (Facet[] memory facets_);

    function facetFunctionSelectors(
        address facetAddress
    )
        external
        view
        returns (bytes4[] memory selectors_);

    function facetAddresses()
        external
        view
        returns (address[] memory facetAddresses_);

    function facetAddress(
        bytes4 functionSelector
    )
        external
        view
        returns (address facetAddress_);
}