// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDiamondCut {
    enum FacetCutAction {
        Add,
        Replace,
        Remove
    }

    struct FacetCut {
        address facetAddress; //Eklemek veya değiştirmek istenen facet sözleşmesinin adresi
        FacetCutAction action;
        bytes4[] functionSelectors; //Facet içindeki hangi fonksiyonların ekleneceğini, değiştirileceğini veya kaldırılacağını belirtir.
                                    //Her Solidity fonksiyonunun 4 byte uzunluğunda bir kimliği vardır.
    }

    event DiamondCut(
        FacetCut[] diamondCut,
        address init,
        bytes data
    );

    //“başlangıç fonksiyonu”, Diamond’a yeni kod ekledikten sonra bir kere çalıştırılan ayar fonksiyonudur.
    function diamondCut(
        FacetCut[] calldata diamondCut,
        address init, //Diamond güncellendikten hemen sonra çalıştırılacak başlangıç sözleşmesinin adresi
        bytes calldata data //init adresinde çalıştırılacak fonksiyonun kodlanmış çağrı verisidir
    ) external;
}