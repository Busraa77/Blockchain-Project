import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AssetUsageFacet", function () {
  /*
   * Her test için:
   * - Diamond sistemini kurar
   * - user1 adına bir asset oluşturur
   * - user2 adına bir avatar oluşturur
   *
   * İlk asset tokenId = 1
   * İlk avatar avatarId = 1
   */
  async function createAssetAndAvatar() {
    const fixture =
      await deployDiamondFixture();

    /*
     * Asset user1 adına oluşturulur.
     */
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

    /*
     * Avatar user2 adına oluşturulur.
     */
    await (
      await fixture.contracts.avatarCore
        .connect(fixture.accounts.user2)
        .createAvatar(
          fixture.addresses.user2,
          "ipfs://avatar-1"
        )
    ).wait();

    /*
     * Hardhat ağındaki son bloğun zamanını alırız.
     */
    const latestBlock =
      await fixture.ethers.provider.getBlock(
        "latest"
      );

    if (!latestBlock) {
      throw new Error(
        "Son blok bilgisi alınamadı."
      );
    }

    /*
     * Kullanım süresi:
     * şu andan 1 saat sonrası.
     */
    const expires =
      BigInt(latestBlock.timestamp + 3600);

    return {
      ...fixture,
      expires,
    };
  }

  it("Asset sahibi başka kullanıcıya kullanım hakkı verebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

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

    const currentUser =
      await contracts.assetUsage.userOf(1);

    expect(currentUser).to.equal(
      addresses.user2
    );
  });

  it("Kullanım hakkı verilen avatar okunabilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

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

    const avatarId =
      await contracts.assetUsage
        .userAvatarOf(1);

    expect(avatarId).to.equal(1n);
  });

  it("Kullanım süresi doğru kaydedilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

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

    const savedExpiration =
      await contracts.assetUsage
        .userExpires(1);

    expect(savedExpiration).to.equal(
      expires
    );
  });

  it("Kullanım hakkı verilince asset durumu InUse olmalı", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

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

    const state =
      await contracts.assetCore
        .assetStateOf(1);

    /*
     * AssetState:
     * None = 0
     * Idle = 1
     * InUse = 2
     */
    expect(state).to.equal(2n);
  });

  it("Asset sahibi olmayan kullanıcı kullanım hakkı verememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

    await expect(
      contracts.assetUsage
        .connect(accounts.user2)
        .setUser(
          1,
          addresses.user2,
          1,
          expires
        )
    ).to.be.revertedWith(
      "Not asset owner"
    );
  });

  it("Sıfır adresine kullanım hakkı verilememeli", async function () {
    const {
      ethers,
      accounts,
      contracts,
      expires,
    } = await createAssetAndAvatar();

    await expect(
      contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          ethers.ZeroAddress,
          1,
          expires
        )
    ).to.be.revertedWith(
      "Invalid user"
    );
  });

  it("Geçmiş zamana kadar kullanım hakkı verilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      ethers,
    } = await createAssetAndAvatar();

    const latestBlock =
      await ethers.provider.getBlock(
        "latest"
      );

    if (!latestBlock) {
      throw new Error(
        "Son blok bilgisi alınamadı."
      );
    }

    const pastExpiration =
      BigInt(latestBlock.timestamp - 1);

    await expect(
      contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          addresses.user2,
          1,
          pastExpiration
        )
    ).to.be.revertedWith(
      "Expiration must be in future"
    );
  });

  it("Kullanıcı kendisine ait olmayan avatarla kullanım hakkı alamamalı", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

    /*
     * İkinci avatar user1 adına oluşturulur.
     * Bunun avatarId değeri 2 olur.
     */
    await (
      await contracts.avatarCore
        .connect(accounts.user1)
        .createAvatar(
          addresses.user1,
          "ipfs://avatar-2"
        )
    ).wait();

    /*
     * Kullanıcı olarak user2 gönderiliyor
     * fakat avatar 2'nin sahibi user1.
     */
    await expect(
      contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          addresses.user2,
          2,
          expires
        )
    ).to.be.revertedWith(
      "User does not own avatar"
    );
  });

  it("Pasif avatar için kullanım hakkı verilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

    await (
      await contracts.avatarState
        .connect(accounts.user2)
        .deactivateAvatar(1)
    ).wait();

    await expect(
      contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          addresses.user2,
          1,
          expires
        )
    ).to.be.revertedWith(
      "Avatar is not active"
    );
  });

  it("Asset sahibi kullanım hakkını temizleyebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      ethers,
      expires,
    } = await createAssetAndAvatar();

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

    await (
      await contracts.assetUsage
        .connect(accounts.user1)
        .clearUser(1)
    ).wait();

    const currentUser =
      await contracts.assetUsage.userOf(1);

    const avatarId =
      await contracts.assetUsage
        .userAvatarOf(1);

    expect(currentUser).to.equal(
      ethers.ZeroAddress
    );

    expect(avatarId).to.equal(0n);
  });

  it("Kullanım hakkı temizlenince asset durumu Idle olmalı", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

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

    await (
      await contracts.assetUsage
        .connect(accounts.user1)
        .clearUser(1)
    ).wait();

    const state =
      await contracts.assetCore
        .assetStateOf(1);

    expect(state).to.equal(1n);
  });

  it("Asset sahibi olmayan kullanıcı kullanım hakkını temizleyememeli", async function () {
    const {
      accounts,
      contracts,
    } = await createAssetAndAvatar();

    await expect(
      contracts.assetUsage
        .connect(accounts.user2)
        .clearUser(1)
    ).to.be.revertedWith(
      "Not asset owner"
    );
  });

  it("Olmayan asset için kullanım hakkı verilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
      expires,
    } = await createAssetAndAvatar();

    await expect(
      contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          999,
          addresses.user2,
          1,
          expires
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });
});