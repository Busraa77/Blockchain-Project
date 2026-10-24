import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("Diamond kurulumu", function () {
  /*
   * TEST 1:
   * Diamond sözleşmesinin geçerli bir adrese
   * deploy edilip edilmediğini kontrol eder.
   */
  it("Diamond geçerli bir adrese deploy edilmeli", async function () {
    const { ethers, addresses } =
      await deployDiamondFixture();

    expect(addresses.diamond).to.not.equal(
      ethers.ZeroAddress
    );
  });

  /*
   * TEST 2:
   * Diamond owner'ının, deploy işlemini yapan
   * owner hesabı olup olmadığını kontrol eder.
   */
  it("Diamond owner doğru atanmalı", async function () {
    const { addresses, contracts } =
      await deployDiamondFixture();

    const currentOwner =
      await contracts.ownership.owner();

    expect(currentOwner).to.equal(
      addresses.owner
    );
  });

  /*
   * TEST 3:
   * Deploy edilen bütün facet adreslerinin
   * Diamond'a gerçekten eklenip eklenmediğini
   * kontrol eder.
   */
  it("Bütün facet'ler Diamond'a eklenmiş olmalı", async function () {
    const {
      addresses,
      contracts,
      deployedFacets,
    } = await deployDiamondFixture();

    /*
     * Loupe facet'i kullanarak Diamond'a bağlı
     * bütün facet adreslerini alıyoruz.
     */
    const facetAddresses =
      await contracts.loupe.facetAddresses();

    /*
     * DiamondCutFacet, Diamond oluşturulurken
     * constructor içinde eklenmişti.
     */
    expect(facetAddresses).to.include(
      addresses.diamondCutFacet
    );

    /*
     * Sonradan deploy edip diamondCut ile
     * eklediğimiz bütün facet'leri kontrol ediyoruz.
     */
    for (
      const facet of Object.values(
        deployedFacets
      )
    ) {
      const facetAddress =
        await facet.getAddress();

      expect(facetAddresses).to.include(
        facetAddress
      );
    }
  });
});