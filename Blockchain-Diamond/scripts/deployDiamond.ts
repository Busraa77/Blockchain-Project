import { network } from "hardhat";
import type { BaseContract } from "ethers";
import { getSelectors } from "./helpers/getSelectors.js";



//Diamond Proxy'yi kurma betiği

type FacetCut = {
  facetAddress: string;
  action: number;
  functionSelectors: string[];
};

async function deployFacet(
  ethers: any,
  contractName: string
): Promise<{
  contract: BaseContract;
  address: string;
  selectors: string[];
}> {
  const contract = await ethers.deployContract(contractName);

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const selectors = getSelectors(contract);

  console.log(`${contractName}: ${address}`);

  return {
    contract,
    address,
    selectors,
  };
}

async function main() {
  const { ethers } = await network.create();

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("Deploy hesabı bulunamadı.");
  }

  const deployerAddress = await deployer.getAddress();

  console.log("Deploy eden hesap:", deployerAddress);

  /*
   * 1. DiamondCutFacet önce deploy edilir.
   * Çünkü Diamond oluşturulurken diamondCut fonksiyonuna
   * bağlanabilmek için bu facet'in adresine ihtiyaç vardır.
   */
  const diamondCutFacet =
    await ethers.deployContract("DiamondCutFacet");

  await diamondCutFacet.waitForDeployment();

  const diamondCutFacetAddress =
    await diamondCutFacet.getAddress();

  console.log(
    "DiamondCutFacet:",
    diamondCutFacetAddress
  );

  /*
   * 2. Ana Diamond deploy edilir.
   *
   * Constructor'a:
   * - owner adresi
   * - DiamondCutFacet adresi
   *
   * gönderilir.
   */
  const diamond = await ethers.deployContract(
    "Diamond",
    [
      deployerAddress,
      diamondCutFacetAddress,
    ]
  );

  await diamond.waitForDeployment();

  const diamondAddress =
    await diamond.getAddress();

  console.log("Diamond:", diamondAddress);

 

  const facetNames: string[] = [
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
   * Diamond'a gönderilecek bütün ekleme işlemleri
   * bu dizide tutulacak.
   */
  const cuts: FacetCut[] = [];

  /*
   * 4. Listedeki her facet sırayla deploy edilir.
   */
  for (const facetName of facetNames) {
    const deployedFacet =
      await deployFacet(
        ethers,
        facetName
      );

    /*
     * Add     = 0
     * Replace = 1
     * Remove  = 2
     */
    cuts.push({
      facetAddress: deployedFacet.address,
      action: 0,
      functionSelectors:
        deployedFacet.selectors,
    });
  }

  /*
   * 5. Diamond adresine IDiamondCut arayüzüyle bağlanıyoruz.
   * diamondCut fonksiyonu Diamond.sol içinde doğrudan
   * yazılı değildir. Fallback üzerinden DiamondCutFacet'e
   * yönlendirilir.
   */
  const diamondCut =
    await ethers.getContractAt(
      "IDiamondCut",
      diamondAddress
    );

  /*
   * 6. Bütün facet'ler tek diamondCut işlemiyle
   * Diamond'a bağlanır.
   * init adresi kullanılmadığı için ZeroAddress,
   * init verisi olmadığı için "0x" gönderiyoruz.
   */
  const transaction =
    await diamondCut.diamondCut(
      cuts,
      ethers.ZeroAddress,
      "0x"
    );

  await transaction.wait();

  console.log(
    "Bütün facet'ler Diamond'a bağlandı."
  );

  console.log(
    "Ana Diamond adresi:",
    diamondAddress
  );
}

main().catch((error: unknown) => {
  console.error("Deploy hatası:", error);
  process.exitCode = 1;
});