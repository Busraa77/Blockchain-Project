import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("AvatarStateFacet", function () {
  /*
   * Her testte önce user1 için bir avatar oluşturuyoruz.
   *
   * Oluşturulan ilk avatarın ID'si 1 olur.
   */
  async function createTestAvatar() {
    const fixture =
      await deployDiamondFixture();

    await (
      await fixture.contracts.avatarCore
        .connect(fixture.accounts.user1)
        .createAvatar(
          fixture.addresses.user1,
          "ipfs://avatar-1"
        )
    ).wait();

    return fixture;
  }

  it("Yeni avatar Idle durumunda olmalı", async function () {
    const { contracts } =
      await createTestAvatar();

    const state =
      await contracts.avatarState
        .avatarStateOf(1);

    /*
     * AvatarState.Idle = 1
     */
    expect(state).to.equal(1n);
  });

  it("Avatar sahibi avatar durumunu değiştirebilmeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    /*
     * AvatarState.Busy = 2
     */
    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .setAvatarState(1, 2)
    ).wait();

    const state =
      await contracts.avatarState
        .avatarStateOf(1);

    expect(state).to.equal(2n);
  });

  it("Avatar sahibi olmayan kullanıcı durumu değiştirememeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await expect(
      contracts.avatarState
        .connect(accounts.user2)
        .setAvatarState(1, 2)
    ).to.be.revertedWith(
      "Not avatar owner"
    );
  });

  it("Avatar durumu None yapılamamalı", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    /*
     * AvatarState.None = 0
     */
    await expect(
      contracts.avatarState
        .connect(accounts.user1)
        .setAvatarState(1, 0)
    ).to.be.revertedWith(
      "Invalid avatar state"
    );
  });

  it("Avatar devre dışı bırakılabilmeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).wait();

    const active =
      await contracts.avatarState
        .isAvatarActive(1);

    const state =
      await contracts.avatarState
        .avatarStateOf(1);

    expect(active).to.equal(false);

    /*
     * AvatarState.Offline = 3
     */
    expect(state).to.equal(3n);
  });

  it("Aktif olmayan avatar tekrar devre dışı bırakılamamalı", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).wait();

    await expect(
      contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).to.be.revertedWith(
      "Avatar already inactive"
    );
  });

  it("Devre dışı avatar yeniden aktifleştirilebilmeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).wait();

    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .reactivateAvatar(1)
    ).wait();

    const active =
      await contracts.avatarState
        .isAvatarActive(1);

    const state =
      await contracts.avatarState
        .avatarStateOf(1);

    expect(active).to.equal(true);

    /*
     * Yeniden aktifleştirilince Idle olur.
     */
    expect(state).to.equal(1n);
  });

  it("Zaten aktif olan avatar tekrar aktifleştirilememeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await expect(
      contracts.avatarState
        .connect(accounts.user1)
        .reactivateAvatar(1)
    ).to.be.revertedWith(
      "Avatar already active"
    );
  });

  it("Aktif olmayan avatarın durumu değiştirilememeli", async function () {
    const { accounts, contracts } =
      await createTestAvatar();

    await (
      await contracts.avatarState
        .connect(accounts.user1)
        .deactivateAvatar(1)
    ).wait();

    await expect(
      contracts.avatarState
        .connect(accounts.user1)
        .setAvatarState(1, 2)
    ).to.be.revertedWith(
      "Avatar is not active"
    );
  });

  it("Olmayan avatarın durumu okunamamalı", async function () {
    const { contracts } =
      await deployDiamondFixture();

    await expect(
      contracts.avatarState.avatarStateOf(999)
    ).to.be.revertedWith(
      "Avatar does not exist"
    );
  });
});