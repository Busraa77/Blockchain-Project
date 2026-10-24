
import { expect } from "chai";
import hre from "hardhat";

describe("Diamond'sız Gas Ölçümü", function () {
  it("Temel işlemlerin gas miktarlarını ölçer", async function () {
    const { ethers } = await hre.network.create(); //geçici bir blockchain ağı oluşturur
    const [owner, user] = await ethers.getSigners(); //İşlem yapabilecek test hesaplarını alır

    // 1. Avatar sözleşmesini dağıt
    const Avatar = await ethers.getContractFactory("Avatar"); //Derlenmiş Avatar sözleşmesinin dağıtım aracını alır.
    const avatar = await Avatar.deploy();//Avatar sözleşmesini blockchain'e dağıtır.
    await avatar.waitForDeployment();//Avatar sözleşmesini blockchain'e dağıtır.

    // 2. Asset sözleşmesini dağıt
    const Asset = await ethers.getContractFactory("Asset");
    const asset = await Asset.deploy(await avatar.getAddress());//asset'in hangi avatara bağlandığını kontrol
    await asset.waitForDeployment();

    // 3. Mesaj sözleşmesini dağıt
    const MessageExtension =
      await ethers.getContractFactory("MessageExtension");

    const message = await MessageExtension.deploy(
      await asset.getAddress()
    );
    await message.waitForDeployment();

    // 4. Avatar oluştur
    const avatarTx = await avatar
      .connect(user)
      .createAvatar(user.address, "ipfs://gas-avatar"); //Avatar oluşturma fonksiyonunu çağırıyoruz

    const avatarReceipt = await avatarTx.wait();

    console.log(
      "createAvatar gas:",
      avatarReceipt!.gasUsed.toString()
    );

    expect(avatarReceipt!.gasUsed).to.be.greaterThan(0n); //Gas miktarının sıfırdan büyük olduğunu kontrol ediyoruz. Buradaki 0n, JavaScript'in bigint türündeki sıfır değeridir.

    // 5. Asset oluştur
    const assetClass = ethers.encodeBytes32String("Sword");
    const slotType = ethers.encodeBytes32String("Hand");

    const fingerprint = ethers.keccak256(
      ethers.toUtf8Bytes("gas-test-sword")
    );

    const createAssetTx = await asset
      .connect(owner)
      .createAsset(
        owner.address,
        assetClass,
        slotType,
        fingerprint,
        "ipfs://gas-test-asset",
        "ipfs://gas-test-compatibility"
      );

    const createAssetReceipt = await createAssetTx.wait();

    console.log(
      "createAsset gas:",
      createAssetReceipt!.gasUsed.toString()
    );

    expect(createAssetReceipt!.gasUsed).to.be.greaterThan(0n);

    // 6. Dünya uyumluluğu kaydet
    const worldId = ethers.encodeBytes32String("Game");

    const worldTx = await asset
      .connect(owner)
      .setWorldProfile(
        1,
        worldId,
        true,
        "ipfs://game-profile"
      );

    const worldReceipt = await worldTx.wait();

    console.log(
      "setWorldProfile gas:",
      worldReceipt!.gasUsed.toString()
    );

    expect(worldReceipt!.gasUsed).to.be.greaterThan(0n);

    // 7. Kullanım hakkı ver
    const latestBlock = await ethers.provider.getBlock("latest");

    if (!latestBlock) {
      throw new Error("Son blok bilgisi alınamadı.");
    }

    const expires = BigInt(latestBlock.timestamp + 3600);

    const setUserTx = await asset
      .connect(owner)
      .setUser(1, user.address, 1, expires);

    const setUserReceipt = await setUserTx.wait();

    console.log(
      "setUser gas:",
      setUserReceipt!.gasUsed.toString()
    );

    expect(setUserReceipt!.gasUsed).to.be.greaterThan(0n);

    // 8. Asset'i avatara tak
    const equipTx = await asset
      .connect(user)
      .equip(1, 1);

    const equipReceipt = await equipTx.wait();

    console.log(
      "equip gas:",
      equipReceipt!.gasUsed.toString()
    );

    expect(equipReceipt!.gasUsed).to.be.greaterThan(0n);

    // 9. Mesaj gönder
    const messageTx = await message
      .connect(user)
      .sendMessage(1, "ipfs://gas-test-message");

    const messageReceipt = await messageTx.wait();

    console.log(
      "sendMessage gas:",
      messageReceipt!.gasUsed.toString()
    );

    expect(messageReceipt!.gasUsed).to.be.greaterThan(0n);

    // 10. Asset'i avatardan çıkar
    const unequipTx = await asset
      .connect(user)
      .unequip(1);

    const unequipReceipt = await unequipTx.wait();

    console.log(
      "unequip gas:",
      unequipReceipt!.gasUsed.toString()
    );

    expect(unequipReceipt!.gasUsed).to.be.greaterThan(0n);

    // 11. Kullanım hakkını kaldır
    const clearUserTx = await asset
      .connect(owner)
      .clearUser(1);

    const clearUserReceipt = await clearUserTx.wait();

    console.log(
      "clearUser gas:",
      clearUserReceipt!.gasUsed.toString()
    );

    expect(clearUserReceipt!.gasUsed).to.be.greaterThan(0n);

    // 12. Aktarım onayı ver
    const approveTx = await asset
      .connect(owner)
      .approve(user.address, 1);

    const approveReceipt = await approveTx.wait();

    console.log(
      "approve gas:",
      approveReceipt!.gasUsed.toString()
    );

    expect(approveReceipt!.gasUsed).to.be.greaterThan(0n);

    // 13. Asset'i yeni sahibine aktar
    const transferTx = await asset
      .connect(user)
      .transferFrom(owner.address, user.address, 1);

    const transferReceipt = await transferTx.wait();

    console.log(
      "transferFrom gas:",
      transferReceipt!.gasUsed.toString()
    );

    expect(transferReceipt!.gasUsed).to.be.greaterThan(0n);
  });
});
