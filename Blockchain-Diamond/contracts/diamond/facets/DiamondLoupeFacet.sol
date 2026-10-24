// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDiamondLoupe} from "../../interfaces/IDiamondLoupe.sol";
import {LibDiamond} from "../../libraries/LibDiamond.sol";


//Diamond'ın içini görme
contract DiamondLoupeFacet is IDiamondLoupe {
    function facets() //Diamond'da hangi facet'ler var?
        external
        view
        override
        returns (Facet[] memory facets_) //tüm facetleri ve her facetin fonksiyonlarını döner.
    {
        LibDiamond.DiamondStorage storage ds =
            LibDiamond.diamondStorage();

        uint256 facetCount = ds.facetAddresses.length;

        facets_ = new Facet[](facetCount);

        for (uint256 i = 0; i < facetCount; i++) {
            address facetAddress_ = ds.facetAddresses[i];

            facets_[i].facetAddress = facetAddress_;

            facets_[i].functionSelectors =
                ds.facetFunctionSelectors[facetAddress_]
                    .functionSelectors;
        }
    }

    function facetFunctionSelectors( //Bir facetin fonksiyonları
        address facetAddress_
    )
        external
        view
        override
        returns (bytes4[] memory selectors_)
    {
        selectors_ =
            LibDiamond
                .diamondStorage()
                .facetFunctionSelectors[facetAddress_]
                .functionSelectors;
    }

    function facetAddresses() //Tüm facet adreslerini ver
        external
        view
        override
        returns (address[] memory facetAddresses_)
    {
        facetAddresses_ =
            LibDiamond.diamondStorage().facetAddresses;
    }

    function facetAddress( //Bu fonksiyon hangi facette
        bytes4 functionSelector
    )
        external
        view
        override
        returns (address facetAddress_)
    {
        facetAddress_ =
            LibDiamond
                .diamondStorage()
                .selectorToFacetAndPosition[
                    functionSelector
                ]
                .facetAddress;
    }
}