import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AssetTransferFacet", function () {
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

  it("Asset sahibi başka kullanıcıya onay verebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.assetTransfer
        .connect(accounts.user1)
        .approve(
          addresses.user2,
          1
        )
    ).wait();

    const approved =
      await contracts.assetTransfer
        .getApproved(1);

    expect(approved).to.equal(
      addresses.user2
    );
  });

  it("Asset sahibi kendi asset'ini transfer edebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.assetTransfer
        .connect(accounts.user1)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          1
        )
    ).wait();

    const newOwner =
      await contracts.assetCore.ownerOf(1);

    expect(newOwner).to.equal(
      addresses.user2
    );
  });

  it("Transferden sonra kullanıcı bakiyeleri güncellenmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.assetTransfer
        .connect(accounts.user1)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          1
        )
    ).wait();

    const user1Balance =
      await contracts.assetCore.balanceOf(
        addresses.user1
      );

    const user2Balance =
      await contracts.assetCore.balanceOf(
        addresses.user2
      );

    expect(user1Balance).to.equal(0n);
    expect(user2Balance).to.equal(1n);
  });

  it("Onay verilen kullanıcı asset'i transfer edebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    /*
     * user1, user2'ye asset 1 için izin verir.
     */
    await (
      await contracts.assetTransfer
        .connect(accounts.user1)
        .approve(
          addresses.user2,
          1
        )
    ).wait();

    /*
     * Transfer işlemini bu kez user2 yapar.
     */
    await (
      await contracts.assetTransfer
        .connect(accounts.user2)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          1
        )
    ).wait();

    const newOwner =
      await contracts.assetCore.ownerOf(1);

    expect(newOwner).to.equal(
      addresses.user2
    );
  });

  it("Transferden sonra eski onay silinmeli", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await (
      await contracts.assetTransfer
        .connect(accounts.user1)
        .approve(
          addresses.user2,
          1
        )
    ).wait();

    await (
      await contracts.assetTransfer
        .connect(accounts.user2)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          1
        )
    ).wait();

    const approved =
      await contracts.assetTransfer
        .getApproved(1);

    expect(approved).to.equal(
      ethers.ZeroAddress
    );
  });

  it("Asset sahibi olmayan kullanıcı onay verememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetTransfer
        .connect(accounts.user2)
        .approve(
          addresses.user2,
          1
        )
    ).to.be.revertedWith(
      "Not asset owner"
    );
  });

  it("Mevcut asset sahibine onay verilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetTransfer
        .connect(accounts.user1)
        .approve(
          addresses.user1,
          1
        )
    ).to.be.revertedWith(
      "Cannot approve current owner"
    );
  });

  it("Yetkisiz kullanıcı asset transfer edememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    /*
     * user2 ne owner ne de onaylı kullanıcıdır.
     */
    await expect(
      contracts.assetTransfer
        .connect(accounts.user2)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          1
        )
    ).to.be.revertedWith(
      "Not owner or approved"
    );
  });

  it("Yanlış from adresiyle transfer yapılamamalı", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    /*
     * Asset'in gerçek sahibi user1'dir.
     * Fakat from olarak user2 gönderiliyor.
     */
    await expect(
      contracts.assetTransfer
        .connect(accounts.user1)
        .transferFrom(
          addresses.user2,
          addresses.user1,
          1
        )
    ).to.be.revertedWith(
      "From is not owner"
    );
  });

  it("Sıfır adresine transfer yapılamamalı", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetTransfer
        .connect(accounts.user1)
        .transferFrom(
          addresses.user1,
          ethers.ZeroAddress,
          1
        )
    ).to.be.revertedWith(
      "Invalid receiver"
    );
  });

  it("Olmayan asset için onay verilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetTransfer
        .connect(accounts.user1)
        .approve(
          addresses.user2,
          999
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });

  it("Olmayan asset transfer edilememeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await createTestAsset();

    await expect(
      contracts.assetTransfer
        .connect(accounts.user1)
        .transferFrom(
          addresses.user1,
          addresses.user2,
          999
        )
    ).to.be.revertedWith(
      "Asset does not exist"
    );
  });
});