import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AssetEquipFacet", function () {
  /*
   * Her testten önce:
   * - Diamond sistemini kurar
   * - user1 için bir avatar oluşturur
   * - user1 için bir asset oluşturur
   *
   * İlk avatarın ID'si 1,
   * ilk asset'in token ID'si 1 olur.
   */
  async function createAvatarAndAsset() {
    const fixture =
      await deployDiamondFixture();

    const slotType =
      fixture.ethers.encodeBytes32String(
        "Hand"
      );

    /*
     * user1 için avatar oluşturulur.
     */
    await (
      await fixture.contracts.avatarCore
        .connect(fixture.accounts.user1)
        .createAvatar(
          fixture.addresses.user1,
          "ipfs://avatar-1"
        )
    ).wait();

    /*
     * user1 için asset oluşturulur.
     */
    await (
      await fixture.contracts.assetCore
        .connect(fixture.accounts.user1)
        .createAsset(
          fixture.addresses.user1,
          fixture.ethers.encodeBytes32String(
            "Sword"
          ),
          slotType,
          fixture.ethers.keccak256(
            fixture.ethers.toUtf8Bytes(
              "unique-sword-1"
            )
          ),
          "ipfs://asset-1",
          "ipfs://compatibility-1"
        )
    ).wait();

    return {
      ...fixture,
      slotType,
    };
  }

  it("Asset sahibi kendi asset'ini kendi avatarına takabilmeli", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    const equipped =
      await contracts.assetEquip
        .isEquipped(1);

    expect(equipped).to.equal(true);
  });

  it("Equip bilgileri doğru kaydedilmeli", async function () {
    const {
      accounts,
      contracts,
      slotType,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    const equipInfo =
      await contracts.assetEquip
        .equipInfoOf(1);

    expect(equipInfo.avatarId).to.equal(
      1n
    );

    expect(equipInfo.slotType).to.equal(
      slotType
    );

    expect(equipInfo.equipped).to.equal(
      true
    );

    /*
     * equippedAt işlem zamanıdır.
     * Sıfırdan büyük olması kaydedildiğini gösterir.
     */
    expect(equipInfo.equippedAt).to.be
      .greaterThan(0n);
  });

  it("Asset takılınca durumu Equipped olmalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

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
    expect(state).to.equal(3n);
  });

  it("Takılı asset tekrar takılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).to.be.revertedWith(
      "Asset already equipped"
    );
  });

  it("Asset sahibi olmayan kullanıcı asset'i takamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await expect(
      contracts.assetEquip
        .connect(accounts.user2)
        .equip(1, 1)
    ).to.be.revertedWith(
      "Not allowed to equip asset"
    );
  });

  it("Asset sahibi başka kullanıcıya ait avatara asset takamamalı", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createAvatarAndAsset();

    /*
     * İkinci avatar user2 adına oluşturulur.
     * Bunun avatar ID'si 2 olur.
     */
    await (
      await contracts.avatarCore
        .connect(accounts.user2)
        .createAvatar(
          addresses.user2,
          "ipfs://avatar-2"
        )
    ).wait();

    /*
     * user1 asset'in sahibidir ama
     * avatar 2'nin sahibi değildir.
     */
    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 2)
    ).to.be.revertedWith(
      "Not avatar owner"
    );
  });

  it("Pasif avatara asset takılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    /*
     * Avatar önce pasif hâle getirilir.
     */
    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).wait();

    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).to.be.revertedWith(
      "Avatar is not active"
    );
  });

  it("Takılı asset çıkarılabilmeli", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .unequip(1)
    ).wait();

    const equipped =
      await contracts.assetEquip
        .isEquipped(1);

    expect(equipped).to.equal(false);
  });

  it("Asset çıkarılınca durumu Idle olmalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .unequip(1)
    ).wait();

    const state =
      await contracts.assetCore
        .assetStateOf(1);

    /*
     * Aktif bir usage olmadığı için
     * asset tekrar Idle durumuna döner.
     */
    expect(state).to.equal(1n);
  });

  it("Takılı olmayan asset çıkarılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .unequip(1)
    ).to.be.revertedWith(
      "Asset is not equipped"
    );
  });

  it("Avatar sahibi olmayan kullanıcı takılı asset'i çıkaramamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await (
      await contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 1)
    ).wait();

    await expect(
      contracts.assetEquip
        .connect(accounts.user2)
        .unequip(1)
    ).to.be.revertedWith(
      "Not avatar owner"
    );
  });

  it("Olmayan asset takılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .equip(999, 1)
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Olmayan avatara asset takılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createAvatarAndAsset();

    await expect(
      contracts.assetEquip
        .connect(accounts.user1)
        .equip(1, 999)
    ).to.be.revertedWith(
      "Avatar does not exist"
    );
  });
});