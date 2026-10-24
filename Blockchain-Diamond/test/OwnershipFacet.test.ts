import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("OwnershipFacet", function () {
  it("Başlangıç owner'ı doğru olmalı", async function () {
    const { addresses, contracts } =
      await deployDiamondFixture();

    const currentOwner =
      await contracts.ownership.owner();

    expect(currentOwner).to.equal(
      addresses.owner
    );
  });

  it("Mevcut owner sahipliği başka kullanıcıya devredebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    await (
      await contracts.ownership
        .connect(accounts.owner)
        .transferOwnership(
          addresses.user1
        )
    ).wait();

    const newOwner =
      await contracts.ownership.owner();

    expect(newOwner).to.equal(
      addresses.user1
    );
  });

  it("Owner olmayan kullanıcı sahipliği devredememeli", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.ownership
        .connect(accounts.user1)
        .transferOwnership(
          addresses.user2
        )
    ).to.be.revert(ethers);
  });

  it("Sıfır adrese sahiplik devredilememeli", async function () {
    const {
      ethers,
      accounts,
      contracts,
    } = await deployDiamondFixture();

    await expect(
      contracts.ownership
        .connect(accounts.owner)
        .transferOwnership(
          ethers.ZeroAddress
        )
    ).to.be.revertedWith(
      "OwnershipFacet: New owner is zero address"
    );
  });

  it("Sahiplik devredildikten sonra eski owner tekrar devredememeli", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    await (
      await contracts.ownership
        .connect(accounts.owner)
        .transferOwnership(
          addresses.user1
        )
    ).wait();

    await expect(
      contracts.ownership
        .connect(accounts.owner)
        .transferOwnership(
          addresses.user2
        )
    ).to.be.revert(ethers);
  });

  it("Yeni owner sahipliği başka kullanıcıya devredebilmeli", async function () {
    const {
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    await (
      await contracts.ownership
        .connect(accounts.owner)
        .transferOwnership(
          addresses.user1
        )
    ).wait();

    await (
      await contracts.ownership
        .connect(accounts.user1)
        .transferOwnership(
          addresses.user2
        )
    ).wait();

    const currentOwner =
      await contracts.ownership.owner();

    expect(currentOwner).to.equal(
      addresses.user2
    );
  });
});