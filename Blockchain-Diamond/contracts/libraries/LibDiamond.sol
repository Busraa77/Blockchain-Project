// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

/*
Diamond’a hangi facet’ler ekli?
Diamond’ın sahibi kim?, yeni fonksiyon nasıl eklenir vb.
*/
library LibDiamond {
    //Diamond verilerinin blockchain üzerinde saklanacağı özel konumu belirler
    bytes32 internal constant DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.diamond.storage");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition;
    }

    struct FacetFunctionSelectors {
        bytes4[] functionSelectors;
        uint256 facetAddressPosition;
    }

    struct DiamondStorage {
        /*
        Selector gelir, mapping selectora bakar,bu selector hangi facet adresine bağlı 
        onu bulur,çağrı o facete yönlendirilir
        */
        // Fonksiyon selectorü => facet adresi
        mapping(bytes4 => FacetAddressAndPosition)
            selectorToFacetAndPosition;

        // Facet adresi => o facet içindeki selectorler
        mapping(address => FacetFunctionSelectors)
            facetFunctionSelectors;

        // Diamond'a bağlı bütün facet adresleri
        address[] facetAddresses;

        // Diamond’ın hangi interface standartlarını desteklediği
        mapping(bytes4 => bool) supportedInterfaces;

        // Diamond yöneticisi
        address contractOwner;
    }

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    //Diamond verilerine ulaşır
    function diamondStorage()
        internal
        pure
        returns (DiamondStorage storage ds)
    {
        bytes32 position = DIAMOND_STORAGE_POSITION;

        assembly {
            ds.slot := position
        }
    }

    function setContractOwner(
        address newOwner
    ) internal {
        DiamondStorage storage ds = diamondStorage();

        address previousOwner = ds.contractOwner;

        ds.contractOwner = newOwner;

        emit OwnershipTransferred(
            previousOwner,
            newOwner
        );
    }

    function contractOwner()
        internal
        view
        returns (address)
    {
        return diamondStorage().contractOwner;
    }

    //Fonksiyonu çağıran kişinin Diamond sahibi olup olmadığını kontrol eder.
    function enforceIsContractOwner()
        internal
        view
    {
        require(
            msg.sender == diamondStorage().contractOwner,
            "LibDiamond: Must be contract owner"
        );
    }

    function diamondCut(
    IDiamondCut.FacetCut[] memory cuts,
    address init,
    bytes memory data
) internal {
    for (uint256 i = 0; i < cuts.length; i++) {
        IDiamondCut.FacetCutAction action = cuts[i].action;

        if (action == IDiamondCut.FacetCutAction.Add) {
            addFunctions(
                cuts[i].facetAddress,
                cuts[i].functionSelectors
            );
        } else if (
            action == IDiamondCut.FacetCutAction.Replace
        ) {
            replaceFunctions(
                cuts[i].facetAddress,
                cuts[i].functionSelectors
            );
        } else if (
            action == IDiamondCut.FacetCutAction.Remove
        ) {
            removeFunctions(
                cuts[i].facetAddress,
                cuts[i].functionSelectors
            );
        } else {
            revert("LibDiamond: Invalid action");
        }
    }

    emit IDiamondCut.DiamondCut(cuts, init, data);

    initializeDiamondCut(init, data);
}

function addFunctions(
    address facetAddress,
    bytes4[] memory selectors
) internal {
    require(
        selectors.length > 0,
        "LibDiamond: No selectors"
    );

    require(
        facetAddress != address(0),
        "LibDiamond: Facet address is zero"
    );

    DiamondStorage storage ds = diamondStorage();

    uint96 selectorPosition = uint96(
        ds.facetFunctionSelectors[facetAddress]
            .functionSelectors
            .length
    );

    if (selectorPosition == 0) {
        addFacet(ds, facetAddress);
    }

    for (uint256 i = 0; i < selectors.length; i++) {
        bytes4 selector = selectors[i];

        require(
            ds.selectorToFacetAndPosition[selector]
                    .facetAddress ==
                address(0),
            "LibDiamond: Function already exists"
        );

        addFunction(
            ds,
            selector,
            selectorPosition,
            facetAddress
        );

        selectorPosition++;
    }
}

function replaceFunctions(
    address facetAddress,
    bytes4[] memory selectors
) internal {
    require(
        selectors.length > 0,
        "LibDiamond: No selectors"
    );

    require(
        facetAddress != address(0),
        "LibDiamond: Facet address is zero"
    );

    DiamondStorage storage ds = diamondStorage();

    uint96 selectorPosition = uint96(
        ds.facetFunctionSelectors[facetAddress]
            .functionSelectors
            .length
    );

    if (selectorPosition == 0) {
        addFacet(ds, facetAddress);
    }

    for (uint256 i = 0; i < selectors.length; i++) {
        bytes4 selector = selectors[i];

        address oldFacetAddress =
            ds.selectorToFacetAndPosition[selector]
                .facetAddress;

        require(
            oldFacetAddress != address(0),
            "LibDiamond: Function does not exist"
        );

        require(
            oldFacetAddress != facetAddress,
            "LibDiamond: Same facet"
        );

        removeFunction(
            ds,
            oldFacetAddress,
            selector
        );

        addFunction(
            ds,
            selector,
            selectorPosition,
            facetAddress
        );

        selectorPosition++;
    }
}

function removeFunctions(
    address facetAddress,
    bytes4[] memory selectors
) internal {
    require(
        selectors.length > 0,
        "LibDiamond: No selectors"
    );

    require(
        facetAddress == address(0),
        "LibDiamond: Remove facet must be zero"
    );

    DiamondStorage storage ds = diamondStorage();

    for (uint256 i = 0; i < selectors.length; i++) {
        bytes4 selector = selectors[i];

        address oldFacetAddress =
            ds.selectorToFacetAndPosition[selector]
                .facetAddress;

        require(
            oldFacetAddress != address(0),
            "LibDiamond: Function does not exist"
        );

        removeFunction(
            ds,
            oldFacetAddress,
            selector
        );
    }
}
function addFacet(
    DiamondStorage storage ds,
    address facetAddress
) internal {
    enforceHasContractCode(facetAddress);

    ds.facetFunctionSelectors[facetAddress]
        .facetAddressPosition =
        ds.facetAddresses.length;

    ds.facetAddresses.push(facetAddress);
}

function addFunction(
    DiamondStorage storage ds,
    bytes4 selector,
    uint96 selectorPosition,
    address facetAddress
) internal {
    ds.selectorToFacetAndPosition[selector] =
        FacetAddressAndPosition({
            facetAddress: facetAddress,
            functionSelectorPosition:
                selectorPosition
        });

    ds.facetFunctionSelectors[facetAddress]
        .functionSelectors
        .push(selector);
}

function removeFunction(
    DiamondStorage storage ds,
    address facetAddress,
    bytes4 selector
) internal {
    require(
        facetAddress != address(this),
        "LibDiamond: Immutable function"
    );

    uint256 selectorPosition =
        ds.selectorToFacetAndPosition[selector]
            .functionSelectorPosition;

    uint256 lastSelectorPosition =
        ds.facetFunctionSelectors[facetAddress]
            .functionSelectors
            .length -
        1;

    if (selectorPosition != lastSelectorPosition) {
        bytes4 lastSelector =
            ds.facetFunctionSelectors[facetAddress]
                .functionSelectors[
                    lastSelectorPosition
                ];

        ds.facetFunctionSelectors[facetAddress]
            .functionSelectors[
                selectorPosition
            ] = lastSelector;

        ds.selectorToFacetAndPosition[lastSelector]
            .functionSelectorPosition =
            uint96(selectorPosition);
    }

    ds.facetFunctionSelectors[facetAddress]
        .functionSelectors
        .pop();

    delete ds.selectorToFacetAndPosition[selector];

    if (
        ds.facetFunctionSelectors[facetAddress]
            .functionSelectors
            .length ==
        0
    ) {
        uint256 facetAddressPosition =
            ds.facetFunctionSelectors[facetAddress]
                .facetAddressPosition;

        uint256 lastFacetAddressPosition =
            ds.facetAddresses.length - 1;

        if (
            facetAddressPosition !=
            lastFacetAddressPosition
        ) {
            address lastFacetAddress =
                ds.facetAddresses[
                    lastFacetAddressPosition
                ];

            ds.facetAddresses[
                facetAddressPosition
            ] = lastFacetAddress;

            ds.facetFunctionSelectors[
                lastFacetAddress
            ].facetAddressPosition =
                facetAddressPosition;
        }

        ds.facetAddresses.pop();

        delete ds.facetFunctionSelectors[
            facetAddress
        ].facetAddressPosition;
    }
}

function initializeDiamondCut(
    address init,
    bytes memory data
) internal {
    if (init == address(0)) {
        require(
            data.length == 0,
            "LibDiamond: Init is zero but data exists"
        );

        return;
    }

    require(
        data.length > 0,
        "LibDiamond: Init data is empty"
    );

    if (init != address(this)) {
        enforceHasContractCode(init);
    }

    (bool success, bytes memory errorData) =
        init.delegatecall(data);

    if (!success) {
        if (errorData.length > 0) {
            assembly {
                revert(
                    add(errorData, 32),
                    mload(errorData)
                )
            }
        }

        revert("LibDiamond: Initialization failed");
    }
}

function enforceHasContractCode(
    address contractAddress
) internal view {
    require(
        contractAddress.code.length > 0,
        "LibDiamond: Address has no contract code"
    );
}
}