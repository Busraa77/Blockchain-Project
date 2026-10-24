import { expect } from "chai";
import { network } from "hardhat";

describe("Diamond'sız sözleşmeler", function () {
  async function setup() {
    const { ethers } = await network.create();
    const [owner, user, other] = await ethers.getSigners();
    const Avatar = await ethers.getContractFactory("Avatar");
    const avatar = await Avatar.deploy();
    await avatar.waitForDeployment();
    const Asset = await ethers.getContractFactory("Asset");
    const asset = await Asset.deploy(await avatar.getAddress());
    await asset.waitForDeployment();
    const Message = await ethers.getContractFactory("MessageExtension");
    const message = await Message.deploy(await asset.getAddress());
    await message.waitForDeployment();
    return { ethers, owner, user, other, avatar, asset, message };
  }

  it("Avatar oluşturur, sahibi ve URI bilgisini döndürür", async function () {
    const { avatar, owner } = await setup();
    await (await avatar.createAvatar(await owner.getAddress(), "ipfs://avatar")).wait();
    expect(await avatar.avatarOwnerOf(1)).to.equal(await owner.getAddress());
    expect(await avatar.avatarURIOf(1)).to.equal("ipfs://avatar");
    expect(await avatar.isAvatarActive(1)).to.equal(true);
  });

  it("Avatar URI güncellemesini ve aktiflik geçişlerini uygular", async function () {
    const { avatar, owner } = await setup();
    await (await avatar.createAvatar(await owner.getAddress(), "ipfs://old")).wait();
    await (await avatar.updateAvatarURI(1, "ipfs://new")).wait();
    expect(await avatar.avatarURIOf(1)).to.equal("ipfs://new");
    await (await avatar.deactivateAvatar(1)).wait();
    expect(await avatar.isAvatarActive(1)).to.equal(false);
    await (await avatar.reactivateAvatar(1)).wait();
    expect(await avatar.isAvatarActive(1)).to.equal(true);
  });

  it("Asset oluşturur ve world profile ayarlayıp okuyabilir", async function () {
    const { asset, owner, ethers } = await setup();
    const world = ethers.encodeBytes32String("Game");
    await (await asset.createAsset(await owner.getAddress(), ethers.encodeBytes32String("Sword"), ethers.encodeBytes32String("Hand"), ethers.encodeBytes32String("fp1"), "ipfs://asset", "ipfs://compat")).wait();
    expect(await asset.ownerOf(1)).to.equal(await owner.getAddress());
    expect(await asset.balanceOf(await owner.getAddress())).to.equal(1n);
    await (await asset.setWorldProfile(1, world, true, "ipfs://world")).wait();
    expect(await asset.supportsWorld(1, world)).to.equal(true);
    expect((await asset.worldProfileOf(1, world)).profileURI).to.equal("ipfs://world");
  });

  it("Asset transfer eder ve eski onayı temizler", async function () {
    const { asset, owner, user, ethers } = await setup();
    await (await asset.createAsset(await owner.getAddress(), ethers.encodeBytes32String("Sword"), ethers.encodeBytes32String("Hand"), ethers.encodeBytes32String("fp1"), "ipfs://asset", "ipfs://compat")).wait();
    await (await asset.approve(await user.getAddress(), 1)).wait();
    await (await asset.connect(user).transferFrom(await owner.getAddress(), await user.getAddress(), 1)).wait();
    expect(await asset.ownerOf(1)).to.equal(await user.getAddress());
    expect(await asset.getApproved(1)).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("Kullanım hakkı verir, okur ve iptal eder", async function () {
    const { asset, avatar, owner, user, ethers } = await setup();
    await (await avatar.createAvatar(await user.getAddress(), "ipfs://user-avatar")).wait();
    await (await asset.createAsset(await owner.getAddress(), ethers.encodeBytes32String("Sword"), ethers.encodeBytes32String("Hand"), ethers.encodeBytes32String("fp1"), "ipfs://asset", "ipfs://compat")).wait();
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("latest block unavailable");
    await (await asset.setUser(1, await user.getAddress(), 1, BigInt(block.timestamp + 3600))).wait();
    expect(await asset.userOf(1)).to.equal(await user.getAddress());
    expect(await asset.userAvatarOf(1)).to.equal(1n);
    await (await asset.clearUser(1)).wait();
    expect(await asset.userOf(1)).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("Avatar sahibi asset'i donatıp çıkarabilir", async function () {
    const { asset, avatar, user, ethers } = await setup();
    await (await avatar.createAvatar(await user.getAddress(), "ipfs://avatar")).wait();
    await (await asset.createAsset(await user.getAddress(), ethers.encodeBytes32String("Sword"), ethers.encodeBytes32String("Hand"), ethers.encodeBytes32String("fp1"), "ipfs://asset", "ipfs://compat")).wait();
    await (await asset.connect(user).equip(1, 1)).wait();
    expect(await asset.isEquipped(1)).to.equal(true);
    await (await asset.connect(user).unequip(1)).wait();
    expect(await asset.isEquipped(1)).to.equal(false);
  });

  it("Asset sahibi mesaj gönderir, sorgular ve devre dışı bırakır", async function () {
    const { asset, message, owner, ethers } = await setup();
    await (await asset.createAsset(await owner.getAddress(), ethers.encodeBytes32String("Sword"), ethers.encodeBytes32String("Hand"), ethers.encodeBytes32String("fp1"), "ipfs://asset", "ipfs://compat")).wait();
    await (await message.sendMessage(1, "ipfs://message")).wait();
    expect((await message.messageOf(1)).contentURI).to.equal("ipfs://message");
    expect(await message.messageIdsOfAsset(1)).to.deep.equal([1n]);
    await (await message.deactivateMessage(1)).wait();
    expect((await message.messageOf(1)).active).to.equal(false);
  });

  it("Yetkisiz kullanıcı avatar URI'sini değiştiremez", async function () {
    const { avatar, owner, other } = await setup();
    await (await avatar.createAvatar(await owner.getAddress(), "ipfs://avatar")).wait();
    await expect(avatar.connect(other).updateAvatarURI(1, "ipfs://hack")).to.be.revertedWith("Not avatar owner");
  });
});
