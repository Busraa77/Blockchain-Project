// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

//kullanıcıların doğrudan kullanacağı ana adres
contract Diamond {
    //facet bağlama
    constructor(
        address owner,
        address diamondCutFacet
    ) payable {
        LibDiamond.setContractOwner(owner);

        IDiamondCut.FacetCut[] memory cut =
            new IDiamondCut.FacetCut[](1);

        bytes4[] memory selectors =
            new bytes4[](1);

        selectors[0] =
            IDiamondCut.diamondCut.selector;

        cut[0] = IDiamondCut.FacetCut({
            facetAddress: diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });

        LibDiamond.diamondCut(
            cut,
            address(0),
            new bytes(0)
        );
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds =
            LibDiamond.diamondStorage();

        address facet =
            ds.selectorToFacetAndPosition[
                msg.sig
            ].facetAddress;

        require(
            facet != address(0),
            "Diamond: Function does not exist"
        );

        assembly {
            calldatacopy(
                0,
                0,
                calldatasize()
            )

            let result := delegatecall(
                gas(),
                facet,
                0,
                calldatasize(),
                0,
                0
            )

            returndatacopy(
                0,
                0,
                returndatasize()
            )

            switch result
            case 0 {
                revert(
                    0,
                    returndatasize()
                )
            }
            default {
                return(
                    0,
                    returndatasize()
                )
            }
        }
    }

    receive() external payable {}
}
//Fallback, Diamond’da bulunmayan fonksiyon çağrısını yakalar; 
//delegatecall ise ilgili facet’in kodunu çalıştırırken veriyi Diamond’ın storage alanına yazar.