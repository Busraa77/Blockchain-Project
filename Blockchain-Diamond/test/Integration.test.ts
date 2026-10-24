import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("Diamond modüller arası entegrasyon", function () {
  it("Avatar, asset, kullanım, equip ve mesaj modülleri birlikte çalışmalı", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    /*
     * 1. user2 adına bir avatar oluşturulur.
     *
     * İlk avatarın ID'si 1 olur.
     */
    await (
      await contracts.avatarCore
        .connect(accounts.user2)
        .createAvatar(
          addresses.user2,
          "ipfs://user2-avatar"
        )
    ).wait();

    const avatarOwner =
      await contracts.avatarCore
        .avatarOwnerOf(1);

    expect(avatarOwner).to.equal(
      addresses.user2
    );

    /*
     * 2. user1 adına bir asset oluşturulur.
     *
     * İlk asset'in token ID'si 1 olur.
     */
    const assetClass =
      ethers.encodeBytes32String(
        "Sword"
      );

    const slotType =
      ethers.encodeBytes32String(
        "Hand"
      );

    const fingerprint =
      ethers.keccak256(
        ethers.toUtf8Bytes(
          "integration-sword-1"
        )
      );

    await (
      await contracts.assetCore
        .connect(accounts.user1)
        .createAsset(
          addresses.user1,
          assetClass,
          slotType,
          fingerprint,
          "ipfs://integration-asset",
          "ipfs://integration-compatibility"
        )
    ).wait();

    const assetOwner =
      await contracts.assetCore.ownerOf(1);

    expect(assetOwner).to.equal(
      addresses.user1
    );

    /*
     * 3. Blockchain üzerindeki mevcut zaman alınır.
     *
     * Kullanım süresi mevcut zamandan
     * bir saat sonrası olarak belirlenir.
     */
    const latestBlock =
      await ethers.provider.getBlock(
        "latest"
      );

    if (!latestBlock) {
      throw new Error(
        "Son blok bilgisi alınamadı."
      );
    }

    const expires =
      BigInt(latestBlock.timestamp + 3600);

    /*
     * user1, sahibi olduğu asset'in kullanım hakkını
     * user2'nin Avatar 1'i için verir.
     */
    await (
      await contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          addresses.user2,
          1,
          expires
        )
    ).wait();

    const assetUser =
      await contracts.assetUsage.userOf(1);

    const userAvatarId =
      await contracts.assetUsage
        .userAvatarOf(1);

    expect(assetUser).to.equal(
      addresses.user2
    );

    expect(userAvatarId).to.equal(1n);

    /*
     * Kullanım hakkı verildikten sonra
     * asset durumu InUse olmalıdır.
     *
     * AssetState.InUse = 2
     */
    let assetState =
      await contracts.assetCore
        .assetStateOf(1);

    expect(assetState).to.equal(2n);

    /*
     * 4. user2, kullanım hakkına sahip olduğu asset'i
     * kendi avatarına takar.
     */
    await (
      await contracts.assetEquip
        .connect(accounts.user2)
        .equip(
          1,
          1
        )
    ).wait();

    const equipped =
      await contracts.assetEquip
        .isEquipped(1);

    expect(equipped).to.equal(true);

    const equipInfo =
      await contracts.assetEquip
        .equipInfoOf(1);

    expect(equipInfo.avatarId).to.equal(
      1n
    );

    expect(equipInfo.slotType).to.equal(
      slotType
    );

    /*
     * Asset takılınca durumu Equipped olur.
     *
     * AssetState.Equipped = 3
     */
    assetState =
      await contracts.assetCore
        .assetStateOf(1);

    expect(assetState).to.equal(3n);

    /*
     * 5. user2 aktif kullanıcı olduğu için
     * asset üzerinden mesaj gönderir.
     */
    await (
      await contracts.message
        .connect(accounts.user2)
        .sendMessage(
          1,
          "ipfs://integration-message"
        )
    ).wait();

    const message =
      await contracts.message.messageOf(1);

    expect(message.tokenId).to.equal(1n);

    expect(message.sender).to.equal(
      addresses.user2
    );

    expect(message.contentURI).to.equal(
      "ipfs://integration-message"
    );

    expect(message.active).to.equal(true);

    /*
     * Asset ile mesaj arasındaki bağlantı da
     * kontrol edilir.
     */
    const messageIds =
      await contracts.message
        .messageIdsOfAsset(1);

    expect(messageIds.length).to.equal(1);
    expect(messageIds[0]).to.equal(1n);

    /*
     * 6. user2 asset'i avatarından çıkarır.
     */
    await (
      await contracts.assetEquip
        .connect(accounts.user2)
        .unequip(1)
    ).wait();

    const equippedAfterUnequip =
      await contracts.assetEquip
        .isEquipped(1);

    expect(
      equippedAfterUnequip
    ).to.equal(false);

    /*
     * Kullanım hakkı hâlâ aktif olduğu için
     * asset çıkarılınca Idle değil, InUse olur.
     */
    assetState =
      await contracts.assetCore
        .assetStateOf(1);

    expect(assetState).to.equal(2n);

    /*
     * 7. Asset sahibi user1,
     * kullanım hakkını kaldırır.
     */
    await (
      await contracts.assetUsage
        .connect(accounts.user1)
        .clearUser(1)
    ).wait();

    const userAfterClear =
      await contracts.assetUsage.userOf(1);

    expect(userAfterClear).to.equal(
      ethers.ZeroAddress
    );

    /*
     * Kullanım hakkı kaldırılınca
     * asset tekrar Idle olur.
     *
     * AssetState.Idle = 1
     */
    assetState =
      await contracts.assetCore
        .assetStateOf(1);

    expect(assetState).to.equal(1n);

    /*
     * Asset'in sahibi bu işlemler sırasında
     * değişmemiş olmalıdır.
     */
    const finalAssetOwner =
      await contracts.assetCore.ownerOf(1);

    expect(finalAssetOwner).to.equal(
      addresses.user1
    );
  });
});