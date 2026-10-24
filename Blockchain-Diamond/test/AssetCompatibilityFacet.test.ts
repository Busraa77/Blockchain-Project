import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AssetCompatibilityFacet", function () {
  /*
   * Her test için:
   * - Diamond sistemini kurar
   * - user1 adına bir asset oluşturur
   * - örnek bir worldId hazırlar
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

    const worldId =
      fixture.ethers.encodeBytes32String(
        "WorldA"
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
      worldId,
    };
  }

  it("Asset sahibi dünya profili ekleyebilmeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    await (
      await contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          worldId,
          true,
          "ipfs://world-a-profile"
        )
    ).wait();

    const profile =
      await contracts.assetCompatibility
        .worldProfileOf(
          1,
          worldId
        );

    expect(profile.worldId).to.equal(
      worldId
    );

    expect(profile.supported).to.equal(
      true
    );

    expect(profile.profileURI).to.equal(
      "ipfs://world-a-profile"
    );
  });

  it("Asset'in bir dünyayı desteklediği okunabilmeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    await (
      await contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          worldId,
          true,
          "ipfs://world-a-profile"
        )
    ).wait();

    const supported =
      await contracts.assetCompatibility
        .supportsWorld(
          1,
          worldId
        );

    expect(supported).to.equal(true);
  });

  it("Desteklenmeyen dünya bilgisi kaydedilebilmeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    await (
      await contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          worldId,
          false,
          "ipfs://unsupported-world"
        )
    ).wait();

    const supported =
      await contracts.assetCompatibility
        .supportsWorld(
          1,
          worldId
        );

    expect(supported).to.equal(false);
  });

  it("Dünya profili güncellenebilmeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    /*
     * Önce destekleniyor olarak kaydediyoruz.
     */
    await (
      await contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          worldId,
          true,
          "ipfs://eski-profil"
        )
    ).wait();

    /*
     * Aynı tokenId ve worldId için tekrar
     * kayıt yapınca eski profil güncellenir.
     */
    await (
      await contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          worldId,
          false,
          "ipfs://yeni-profil"
        )
    ).wait();

    const profile =
      await contracts.assetCompatibility
        .worldProfileOf(
          1,
          worldId
        );

    expect(profile.supported).to.equal(
      false
    );

    expect(profile.profileURI).to.equal(
      "ipfs://yeni-profil"
    );
  });

  it("Asset sahibi olmayan kullanıcı dünya profili ekleyememeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    await expect(
      contracts.assetCompatibility
        .connect(accounts.user2)
        .setWorldProfile(
          1,
          worldId,
          true,
          "ipfs://izinsiz-profil"
        )
    ).to.be.revertedWith(
      "Not asset owner"
    );
  });

  it("Boş worldId ile dünya profili eklenememeli", async function () {
    const {
      ethers,
      accounts,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          1,
          ethers.ZeroHash,
          true,
          "ipfs://world-profile"
        )
    ).to.be.revertedWith(
      "Invalid world ID"
    );
  });

  it("Olmayan asset için dünya profili eklenememeli", async function () {
    const {
      accounts,
      contracts,
      worldId,
    } = await createTestAsset();

    await expect(
      contracts.assetCompatibility
        .connect(accounts.user1)
        .setWorldProfile(
          999,
          worldId,
          true,
          "ipfs://world-profile"
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Olmayan asset'in dünya profili okunamamalı", async function () {
    const {
      contracts,
      worldId,
    } = await createTestAsset();

    await expect(
      contracts.assetCompatibility
        .worldProfileOf(
          999,
          worldId
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Henüz kaydedilmemiş dünya varsayılan olarak desteklenmemeli", async function () {
    const {
      contracts,
      worldId,
    } = await createTestAsset();

    const supported =
      await contracts.assetCompatibility
        .supportsWorld(
          1,
          worldId
        );

    expect(supported).to.equal(false);
  });
});