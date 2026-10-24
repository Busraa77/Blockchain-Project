import { network } from "hardhat";
import type { BaseContract } from "ethers";
import { getSelectors } from "../../scripts/helpers/getSelectors.js";

/*
 * Diamond'a eklenecek her facet için gerekli bilgilerin tipi.
 */
type FacetCut = {
  facetAddress: string;
  action: number;
  functionSelectors: string[];
};

/*
 * Bu fonksiyon testlerde kullanılacak bütün sistemi hazırlar.
 *
 * Yaptığı işler:
 * - Test hesaplarını alır.
 * - DiamondCutFacet'i deploy eder.
 * - Diamond sözleşmesini deploy eder.
 * - Diğer facet'leri deploy eder.
 * - Facet'leri Diamond'a ekler.
 * - Testlerde kullanılacak sözleşme nesnelerini döndürür.
 */
export async function deployDiamondFixture() {
  /*
   * Hardhat ağına bağlı ethers nesnesini alırız.
   */
  const { ethers } = await network.create();

  /*
   * Hardhat bize testlerde kullanabileceğimiz
   * hazır ve bakiyeli hesaplar verir.
   */
  const [owner, user1, user2] =
    await ethers.getSigners();

  /*
   * TypeScript açısından hesapların gerçekten
   * bulunup bulunmadığını kontrol ediyoruz.
   */
  if (!owner || !user1 || !user2) {
    throw new Error(
      "Test hesapları alınamadı."
    );
  }

  /*
   * Owner hesabının adresini alırız.
   */
  const ownerAddress =
    await owner.getAddress();

  /*
   * 1. DiamondCutFacet deploy edilir.
   *
   * Bu facet, Diamond'a yeni facet eklemek,
   * mevcut facet'i değiştirmek veya kaldırmak
   * için kullanılan diamondCut fonksiyonunu içerir.
   */
  const diamondCutFacet =
    await ethers.deployContract(
      "DiamondCutFacet"
    );

  /*
   * Deploy işleminin tamamlanmasını bekleriz.
   */
  await diamondCutFacet.waitForDeployment();

  /*
   * Deploy edilen DiamondCutFacet'in
   * blockchain üzerindeki adresini alırız.
   */
  const diamondCutFacetAddress =
    await diamondCutFacet.getAddress();

  /*
   * 2. Ana Diamond sözleşmesi deploy edilir.
   *
   * Constructor'a:
   * - owner adresi
   * - DiamondCutFacet adresi
   *
   * gönderilir.
   */
  const diamond =
    await ethers.deployContract(
      "Diamond",
      [
        ownerAddress,
        diamondCutFacetAddress,
      ]
    );

  /*
   * Diamond deploy işleminin tamamlanmasını bekleriz.
   */
  await diamond.waitForDeployment();

  /*
   * Ana Diamond sözleşmesinin adresini alırız.
   */
  const diamondAddress =
    await diamond.getAddress();

  /*
   * 3. Diamond'a sonradan eklenecek facet'lerin adları.
   *
   * DiamondCutFacet burada bulunmaz.
   * Çünkü Diamond oluşturulurken zaten eklenmiştir.
   */
  const facetNames = [
    "DiamondLoupeFacet",
    "OwnershipFacet",
    "AvatarCoreFacet",
    "AvatarStateFacet",
    "AssetCoreFacet",
    "AssetTransferFacet",
    "AssetUsageFacet",
    "AssetEquipFacet",
    "AssetCompatibilityFacet",
    "MessageFacet",
  ];

  /*
   * diamondCut fonksiyonuna göndereceğimiz
   * facet ekleme bilgilerinin tutulacağı dizi.
   */
  const cuts: FacetCut[] = [];

  /*
   * Deploy edilen gerçek facet sözleşmelerini
   * isimleriyle saklarız.
   *
   * Örnek:
   * deployedFacets["AvatarCoreFacet"]
   */
  const deployedFacets: Record<
    string,
    BaseContract
  > = {};

  /*
   * 4. Listedeki bütün facet'ler sırayla
   * deploy edilir.
   */
  for (const facetName of facetNames) {
    /*
     * O anki facet'i deploy ederiz.
     */
    const facet =
      await ethers.deployContract(
        facetName
      );

    /*
     * Deploy işleminin tamamlanmasını bekleriz.
     */
    await facet.waitForDeployment();

    /*
     * Facet'in kendi adresini alırız.
     */
    const facetAddress =
      await facet.getAddress();

    /*
     * Facet'in içinde bulunan fonksiyonların
     * selector'larını çıkarırız.
     */
    const selectors =
      getSelectors(facet);

    /*
     * Facet'i Diamond'a eklemek için gerekli
     * bilgileri cuts dizisine koyarız.
     *
     * action: 0
     * FacetCutAction.Add anlamına gelir.
     */
    cuts.push({
      facetAddress,
      action: 0,
      functionSelectors: selectors,
    });

    /*
     * Deploy edilen facet sözleşmesini
     * daha sonra kullanabilmek için saklarız.
     */
    deployedFacets[facetName] = facet;
  }

  /*
   * Diamond adresine IDiamondCut ABI'siyle bağlanırız.
   *
   * Burada yeni bir sözleşme deploy edilmez.
   * Yalnızca mevcut Diamond adresine,
   * diamondCut fonksiyonunu kullanabilecek
   * bir sözleşme nesnesi oluşturulur.
   */
  const diamondCut =
    await ethers.getContractAt(
      "IDiamondCut",
      diamondAddress
    );

  /*
   * Deploy ettiğimiz bütün facet'leri
   * ana Diamond sözleşmesine ekleriz.
   */
  const cutTransaction =
    await diamondCut.diamondCut(
      cuts,
      ethers.ZeroAddress,
      "0x"
    );

  /*
   * diamondCut işleminin blockchain üzerinde
   * tamamlanmasını bekleriz.
   */
  await cutTransaction.wait();

  /*
   * Bundan sonraki nesnelerin hepsinde adres
   * olarak Diamond adresini kullanıyoruz.
   *
   * Değişen yalnızca ABI'dir.
   *
   * Böylece ilgili facet'in fonksiyonunu
   * Diamond üzerinden çağırabiliriz.
   */

  const loupe =
    await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );

  const ownership =
    await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );

  const avatarCore =
    await ethers.getContractAt(
      "AvatarCoreFacet",
      diamondAddress
    );

  const avatarState =
    await ethers.getContractAt(
      "AvatarStateFacet",
      diamondAddress
    );

  const assetCore =
    await ethers.getContractAt(
      "AssetCoreFacet",
      diamondAddress
    );

  const assetTransfer =
    await ethers.getContractAt(
      "AssetTransferFacet",
      diamondAddress
    );

  const assetUsage =
    await ethers.getContractAt(
      "AssetUsageFacet",
      diamondAddress
    );

  const assetEquip =
    await ethers.getContractAt(
      "AssetEquipFacet",
      diamondAddress
    );

  const assetCompatibility =
    await ethers.getContractAt(
      "AssetCompatibilityFacet",
      diamondAddress
    );

  const message =
    await ethers.getContractAt(
      "MessageFacet",
      diamondAddress
    );

  /*
   * Test dosyalarında ihtiyacımız olacak
   * bütün değerleri dışarı döndürürüz.
   */
  return {
    ethers,

    accounts: {
      owner,
      user1,
      user2,
    },

    addresses: {
      owner: ownerAddress,
      user1: await user1.getAddress(),
      user2: await user2.getAddress(),
      diamond: diamondAddress,
      diamondCutFacet:
        diamondCutFacetAddress,
    },

    contracts: {
      diamond,
      diamondCut,
      loupe,
      ownership,
      avatarCore,
      avatarState,
      assetCore,
      assetTransfer,
      assetUsage,
      assetEquip,
      assetCompatibility,
      message,
    },

    deployedFacets,
  };
}