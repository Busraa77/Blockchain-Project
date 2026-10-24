import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("MessageFacet", function () {
  /*
   * Her test için:
   * - Diamond sistemini kurar
   * - user1 adına bir asset oluşturur
   *
   * İlk asset'in tokenId değeri 1 olur.
   */
  async function createTestAsset() {
    const fixture =
      await deployDiamondFixture();

    await (
      await fixture.contracts.assetCore
        .connect(fixture.accounts.user1)
        .createAsset(
          fixture.addresses.user1,
          fixture.ethers.encodeBytes32String(
            "Sword"
          ),
          fixture.ethers.encodeBytes32String(
            "Hand"
          ),
          fixture.ethers.keccak256(
            fixture.ethers.toUtf8Bytes(
              "unique-sword-1"
            )
          ),
          "ipfs://asset-1",
          "ipfs://compatibility-1"
        )
    ).wait();

    return fixture;
  }

  /*
   * Asset oluşturur.
   * Ayrıca user2 adına bir avatar oluşturup
   * user2'ye geçici kullanım hakkı verir.
   */
  async function createAssetWithActiveUser() {
    const fixture =
      await createTestAsset();

    /*
     * user2 adına avatar oluşturulur.
     * İlk avatarın ID'si 1 olur.
     */
    await (
      await fixture.contracts.avatarCore
        .connect(fixture.accounts.user2)
        .createAvatar(
          fixture.addresses.user2,
          "ipfs://avatar-user2"
        )
    ).wait();

    const latestBlock =
      await fixture.ethers.provider.getBlock(
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
     * Asset'in sahibi user1,
     * geçici kullanıcı olarak user2'yi belirler.
     */
    await (
      await fixture.contracts.assetUsage
        .connect(fixture.accounts.user1)
        .setUser(
          1,
          fixture.addresses.user2,
          1,
          expires
        )
    ).wait();

    return fixture;
  }

  it("Asset sahibi mesaj gönderebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    const message =
      await contracts.message.messageOf(1);

    expect(message.messageId).to.equal(1n);
    expect(message.tokenId).to.equal(1n);

    expect(message.sender).to.equal(
      addresses.user1
    );

    expect(message.contentURI).to.equal(
      "ipfs://message-1"
    );

    expect(message.active).to.equal(true);
  });

  it("Mesajın gönderilme zamanı kaydedilmeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    const message =
      await contracts.message.messageOf(1);

    expect(message.sentAt).to.be.greaterThan(
      0n
    );
  });

  it("Asset'e ait mesaj ID'leri okunabilmeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-2"
        )
    ).wait();

    const messageIds =
      await contracts.message
        .messageIdsOfAsset(1);

    expect(messageIds.length).to.equal(2);

    expect(messageIds[0]).to.equal(1n);
    expect(messageIds[1]).to.equal(2n);
  });

  it("Aktif kullanım hakkı verilen kullanıcı mesaj gönderebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createAssetWithActiveUser();

    await (
      await contracts.message
        .connect(accounts.user2)
        .sendMessage(
          1,
          "ipfs://user2-message"
        )
    ).wait();

    const message =
      await contracts.message.messageOf(1);

    expect(message.sender).to.equal(
      addresses.user2
    );

    expect(message.contentURI).to.equal(
      "ipfs://user2-message"
    );
  });

  it("Yetkisiz kullanıcı mesaj gönderememeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    /*
     * user2 ne asset sahibidir
     * ne de aktif kullanım hakkına sahiptir.
     */
    await expect(
      contracts.message
        .connect(accounts.user2)
        .sendMessage(
          1,
          "ipfs://unauthorized-message"
        )
    ).to.be.revertedWith(
      "Not allowed to send message"
    );
  });

  it("Boş içerik URI ile mesaj gönderilememeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          ""
        )
    ).to.be.revertedWith(
      "Empty content URI"
    );
  });

  it("Olmayan asset için mesaj gönderilememeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.message
        .connect(accounts.user1)
        .sendMessage(
          999,
          "ipfs://message-1"
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Mesajı gönderen kullanıcı mesajı pasif yapabilmeli", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    await (
      await contracts.message
        .connect(accounts.user1)
        .deactivateMessage(1)
    ).wait();

    const message =
      await contracts.message.messageOf(1);

    expect(message.active).to.equal(false);
  });

  it("Mesajı göndermeyen kullanıcı mesajı pasif yapamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    await expect(
      contracts.message
        .connect(accounts.user2)
        .deactivateMessage(1)
    ).to.be.revertedWith(
      "Not message sender"
    );
  });

  it("Pasif mesaj tekrar pasif yapılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.message
        .connect(accounts.user1)
        .sendMessage(
          1,
          "ipfs://message-1"
        )
    ).wait();

    await (
      await contracts.message
        .connect(accounts.user1)
        .deactivateMessage(1)
    ).wait();

    await expect(
      contracts.message
        .connect(accounts.user1)
        .deactivateMessage(1)
    ).to.be.revertedWith(
      "Message already inactive"
    );
  });

  it("Olmayan mesaj okunamamalı", async function () {
    const { contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.message.messageOf(999)
    ).to.be.revertedWith(
      "Message does not exist"
    );
  });

  it("Olmayan mesaj pasif yapılamamalı", async function () {
    const {
      accounts,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.message
        .connect(accounts.user1)
        .deactivateMessage(999)
    ).to.be.revertedWith(
      "Message does not exist"
    );
  });
});