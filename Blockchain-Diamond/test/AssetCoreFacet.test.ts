import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AssetCoreFacet", function () {
  /*
   * Her testte kullanabileceğimiz örnek bir asset oluşturur.
   */
  async function createTestAsset() {
    const fixture =
      await deployDiamondFixture();

    const assetClass =
      fixture.ethers.encodeBytes32String(
        "Sword"
      );

    const slotType =
      fixture.ethers.encodeBytes32String(
        "Hand"
      );

    const fingerprint =
      fixture.ethers.keccak256(
        fixture.ethers.toUtf8Bytes(
          "unique-sword-1"
        )
      );

    await (
      await fixture.contracts.assetCore
        .connect(fixture.accounts.user1)
        .createAsset(
          fixture.addresses.user1,
          assetClass,
          slotType,
          fingerprint,
          "ipfs://asset-1",
          "ipfs://compatibility-1"
        )
    ).wait();

    return {
      ...fixture,
      assetClass,
      slotType,
      fingerprint,
    };
  }

  it("Yeni asset oluşturulabilmeli", async function () {
    const {
      addresses,
      contracts,
    } = await createTestAsset();

    const assetOwner =
      await contracts.assetCore.ownerOf(1);

    expect(assetOwner).to.equal(
      addresses.user1
    );
  });

  it("Asset oluşturulunca sahibinin bakiyesi artmalı", async function () {
    const {
      addresses,
      contracts,
    } = await createTestAsset();

    const balance =
      await contracts.assetCore.balanceOf(
        addresses.user1
      );

    expect(balance).to.equal(1n);
  });

  it("Asset profil bilgileri doğru kaydedilmeli", async function () {
    const {
      contracts,
      assetClass,
      slotType,
      fingerprint,
    } = await createTestAsset();

    const profile =
      await contracts.assetCore
        .assetProfileOf(1);

    expect(profile.assetClass).to.equal(
      assetClass
    );

    expect(profile.slotType).to.equal(
      slotType
    );

    expect(profile.fingerprint).to.equal(
      fingerprint
    );

    expect(profile.metadataURI).to.equal(
      "ipfs://asset-1"
    );

    expect(
      profile.compatibilityURI
    ).to.equal(
      "ipfs://compatibility-1"
    );
  });

  it("Yeni asset Idle durumunda olmalı", async function () {
    const { contracts } =
      await createTestAsset();

    const state =
      await contracts.assetCore
        .assetStateOf(1);

    /*
     * AssetState enum sırası:
     *
     * None = 0
     * Idle = 1
     * InUse = 2
     * Equipped = 3
     * Locked = 4
     */
    expect(state).to.equal(1n);
  });

  it("Aynı kullanıcı için birden fazla asset oluşturulunca bakiye artmalı", async function () {
    const fixture =
      await createTestAsset();

    await (
      await fixture.contracts.assetCore
        .connect(fixture.accounts.user1)
        .createAsset(
          fixture.addresses.user1,
          fixture.ethers.encodeBytes32String(
            "Shield"
          ),
          fixture.ethers.encodeBytes32String(
            "Hand"
          ),
          fixture.ethers.keccak256(
            fixture.ethers.toUtf8Bytes(
              "unique-shield-1"
            )
          ),
          "ipfs://asset-2",
          "ipfs://compatibility-2"
        )
    ).wait();

    const balance =
      await fixture.contracts.assetCore
        .balanceOf(
          fixture.addresses.user1
        );

    expect(balance).to.equal(2n);
  });

  it("Sıfır adresi için asset oluşturulamamalı", async function () {
    const {
      ethers,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.assetCore.createAsset(
        ethers.ZeroAddress,
        ethers.encodeBytes32String(
          "Sword"
        ),
        ethers.encodeBytes32String(
          "Hand"
        ),
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unique-sword-1"
          )
        ),
        "ipfs://asset-1",
        "ipfs://compatibility-1"
      )
    ).to.be.revertedWith(
      "Invalid owner"
    );
  });

  it("Boş metadata URI ile asset oluşturulamamalı", async function () {
    const {
      ethers,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.assetCore.createAsset(
        addresses.user1,
        ethers.encodeBytes32String(
          "Sword"
        ),
        ethers.encodeBytes32String(
          "Hand"
        ),
        ethers.keccak256(
          ethers.toUtf8Bytes(
            "unique-sword-1"
          )
        ),
        "",
        "ipfs://compatibility-1"
      )
    ).to.be.revertedWith(
      "Empty metadata URI"
    );
  });

  it("Sıfır adresinin bakiyesi okunamamalı", async function () {
    const {
      ethers,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.assetCore.balanceOf(
        ethers.ZeroAddress
      )
    ).to.be.revertedWith(
      "Invalid owner"
    );
  });

  it("Olmayan asset'in sahibi okunamamalı", async function () {
    const { contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.assetCore.ownerOf(999)
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Olmayan asset'in profili okunamamalı", async function () {
    const { contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.assetCore
        .assetProfileOf(999)
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });
});