import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AvatarCoreFacet", function () {
  /*
   * ÖRNEK:
   * user1 için yeni bir avatar oluşturuyoruz.
   *
   * Sonra:
   * - avatar sahibi doğru mu,
   * - URI doğru mu,
   * - avatar aktif mi
   *
   * diye kontrol ediyoruz.
   */
  it("Yeni avatar oluşturulabilmeli", async function () {
    const { accounts, addresses, contracts } =
      await deployDiamondFixture();

    const avatarURI = "ipfs://avatar-1";

    const transaction =
      await contracts.avatarCore
        .connect(accounts.user1)
        .createAvatar(
          addresses.user1,
          avatarURI
        );

    await transaction.wait();

    const avatar =
      await contracts.avatarCore
        .avatarProfileOf(1);

    expect(avatar.owner).to.equal(
      addresses.user1
    );

    expect(avatar.avatarURI).to.equal(
      avatarURI
    );

    expect(avatar.active).to.equal(true);
  });

  /*
   * avatarOwnerOf fonksiyonunun doğru adresi
   * döndürdüğünü kontrol ediyoruz.
   */
  it("Avatar sahibinin adresi okunabilmeli", async function () {
    const { accounts, addresses, contracts } =
      await deployDiamondFixture();

    await (
      await contracts.avatarCore
        .connect(accounts.user1)
        .createAvatar(
          addresses.user1,
          "ipfs://avatar-1"
        )
    ).wait();

    const avatarOwner =
      await contracts.avatarCore
        .avatarOwnerOf(1);

    expect(avatarOwner).to.equal(
      addresses.user1
    );
  });

  /*
   * Avatar sahibi kendi avatarının URI bilgisini
   * değiştirebilmeli.
   */
  it("Avatar sahibi URI bilgisini güncelleyebilmeli", async function () {
    const { accounts, addresses, contracts } =
      await deployDiamondFixture();

    await (
      await contracts.avatarCore
        .connect(accounts.user1)
        .createAvatar(
          addresses.user1,
          "ipfs://eski-avatar"
        )
    ).wait();

    await (
      await contracts.avatarCore
        .connect(accounts.user1)
        .updateAvatarURI(
          1,
          "ipfs://yeni-avatar"
        )
    ).wait();

    const currentURI =
      await contracts.avatarCore
        .avatarURIOf(1);

    expect(currentURI).to.equal(
      "ipfs://yeni-avatar"
    );
  });

  /*
   * user2, user1'e ait avatarı değiştirmeye
   * çalışırsa işlem reddedilmeli.
   */
  it("Avatar sahibi olmayan kullanıcı URI değiştirememeli", async function () {
    const { accounts, addresses, contracts } =
      await deployDiamondFixture();

    await (
      await contracts.avatarCore
        .connect(accounts.user1)
        .createAvatar(
          addresses.user1,
          "ipfs://avatar-1"
        )
    ).wait();

    await expect(
      contracts.avatarCore
        .connect(accounts.user2)
        .updateAvatarURI(
          1,
          "ipfs://izinsiz-degisiklik"
        )
    ).to.be.revertedWith(
      "Not avatar owner"
    );
  });

  /*
   * Sıfır adresi avatar sahibi olarak verilirse
   * createAvatar işlemi reddedilmeli.
   */
  it("Sıfır adresi için avatar oluşturulamamalı", async function () {
    const { ethers, contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.avatarCore.createAvatar(
        ethers.ZeroAddress,
        "ipfs://avatar-1"
      )
    ).to.be.revertedWith(
      "Invalid owner"
    );
  });

  /*
   * Boş URI ile avatar oluşturulmaya çalışılırsa
   * işlem reddedilmeli.
   */
  it("Boş URI ile avatar oluşturulamamalı", async function () {
    const { addresses, contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.avatarCore.createAvatar(
        addresses.user1,
        ""
      )
    ).to.be.revertedWith(
      "Empty avatar URI"
    );
  });
});