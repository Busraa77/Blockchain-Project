import { expect } from "chai";
import { deployDiamondFixture } from "./helpers/deployDiamond.js";

describe("Gas ölçüm testleri", function () {
  it("Temel işlemlerin gas kullanımlarını ölçmeli", async function () {
    const {
      ethers,
      accounts,
      addresses,
      contracts,
    } = await deployDiamondFixture();

    /*
     * Bir işlemin gas miktarını yazdırmak için
     * işlem sonucundaki receipt.gasUsed değerini kullanıyoruz.
     */

    /*
     * 1. Avatar oluşturma gas ölçümü
     */
    const createAvatarTx =
      await contracts.avatarCore
        .connect(accounts.user2)
        .createAvatar(
          addresses.user2,
          "ipfs://gas-test-avatar"
        );

    const createAvatarReceipt =
      await createAvatarTx.wait();

    if (!createAvatarReceipt) {
      throw new Error(
        "Avatar oluşturma işlem sonucu alınamadı."
      );
    }

    console.log(
      "createAvatar gas:",
      createAvatarReceipt.gasUsed.toString()
    );

    expect(
      createAvatarReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 2. Asset oluşturma gas ölçümü
     */
    const assetClass =
      ethers.encodeBytes32String("Sword");

    const slotType =
      ethers.encodeBytes32String("Hand");

    const fingerprint =
      ethers.keccak256(
        ethers.toUtf8Bytes("gas-test-sword")
      );

    const createAssetTx =
      await contracts.assetCore
        .connect(accounts.user1)
        .createAsset(
          addresses.user1,
          assetClass,
          slotType,
          fingerprint,
          "ipfs://gas-test-asset",
          "ipfs://gas-test-compatibility"
        );

    const createAssetReceipt =
      await createAssetTx.wait();

    if (!createAssetReceipt) {
      throw new Error(
        "Asset oluşturma işlem sonucu alınamadı."
      );
    }

    console.log(
      "createAsset gas:",
      createAssetReceipt.gasUsed.toString()
    );

    expect(
      createAssetReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 3. Kullanım hakkı verme gas ölçümü
     */
    const latestBlock =
      await ethers.provider.getBlock("latest");

    if (!latestBlock) {
      throw new Error(
        "Son blok bilgisi alınamadı."
      );
    }

    const expires =
      BigInt(latestBlock.timestamp + 3600);

    const setUserTx =
      await contracts.assetUsage
        .connect(accounts.user1)
        .setUser(
          1,
          addresses.user2,
          1,
          expires
        );

    const setUserReceipt =
      await setUserTx.wait();

    if (!setUserReceipt) {
      throw new Error(
        "Kullanım hakkı verme işlem sonucu alınamadı."
      );
    }

    console.log(
      "setUser gas:",
      setUserReceipt.gasUsed.toString()
    );

    expect(
      setUserReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 4. Asset'i avatara takma gas ölçümü
     */
    const equipTx =
      await contracts.assetEquip
        .connect(accounts.user2)
        .equip(1, 1);

    const equipReceipt =
      await equipTx.wait();

    if (!equipReceipt) {
      throw new Error(
        "Equip işlem sonucu alınamadı."
      );
    }

    console.log(
      "equip gas:",
      equipReceipt.gasUsed.toString()
    );

    expect(
      equipReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 5. Mesaj gönderme gas ölçümü
     */
    const sendMessageTx =
      await contracts.message
        .connect(accounts.user2)
        .sendMessage(
          1,
          "ipfs://gas-test-message"
        );

    const sendMessageReceipt =
      await sendMessageTx.wait();

    if (!sendMessageReceipt) {
      throw new Error(
        "Mesaj gönderme işlem sonucu alınamadı."
      );
    }

    console.log(
      "sendMessage gas:",
      sendMessageReceipt.gasUsed.toString()
    );

    expect(
      sendMessageReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 6. Asset'i avatardan çıkarma gas ölçümü
     */
    const unequipTx =
      await contracts.assetEquip
        .connect(accounts.user2)
        .unequip(1);

    const unequipReceipt =
      await unequipTx.wait();

    if (!unequipReceipt) {
      throw new Error(
        "Unequip işlem sonucu alınamadı."
      );
    }

    console.log(
      "unequip gas:",
      unequipReceipt.gasUsed.toString()
    );

    expect(
      unequipReceipt.gasUsed
    ).to.be.greaterThan(0n);

    /*
     * 7. Kullanım hakkını kaldırma gas ölçümü
     */
    const clearUserTx =
      await contracts.assetUsage
        .connect(accounts.user1)
        .clearUser(1);

    const clearUserReceipt =
      await clearUserTx.wait();

    if (!clearUserReceipt) {
      throw new Error(
        "Kullanım hakkını kaldırma işlem sonucu alınamadı."
      );
    }

    console.log(
      "clearUser gas:",
      clearUserReceipt.gasUsed.toString()
    );

    expect(
      clearUserReceipt.gasUsed
    ).to.be.greaterThan(0n);
  });
});