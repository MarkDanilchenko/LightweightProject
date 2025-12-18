import { encrypt, decrypt } from "@server/utils/encrypter";

// Mock the crypto module;
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn(),
}));

describe("Encrypter Utility", (): void => {
  const algorithm = "aes-256-cbc";

  describe("encrypt function", (): void => {
    let mockCreateCipheriv: jest.Mock;
    const strToEncrypt = "testString";
    const mockCipher = {
      update: jest.fn().mockReturnValue("encrypted"),
      final: jest.fn().mockReturnValue("-string"),
    };

    beforeAll((): void => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mockCreateCipheriv = require("crypto").createCipheriv as jest.Mock;
    });

    beforeEach((): void => {
      jest.clearAllMocks();

      mockCreateCipheriv.mockReturnValue(mockCipher);
    });

    it("should encrypt a string and return it in the correct format", (): void => {
      const result: string = encrypt(strToEncrypt);

      expect(mockCreateCipheriv).toHaveBeenCalledWith(algorithm, expect.any(Buffer), expect.any(Buffer));
      expect(mockCipher.update).toHaveBeenCalledWith(strToEncrypt, "utf8", "hex");
      expect(mockCipher.final).toHaveBeenCalledWith("hex");
      expect(result).toContain(":");
      expect(result.split(":")[0]).toHaveLength(32);
    });

    it("should use the common secret from app configuration", (): void => {
      encrypt(strToEncrypt);

      const secretKeyArg = mockCreateCipheriv.mock.calls[0][1];
      expect(secretKeyArg).toBeInstanceOf(Buffer);
    });
  });

  describe("decrypt function", (): void => {
    let mockCreateDecipheriv: jest.Mock;
    const encryptedString = "74657374697631323334353637383930:encrypted-string";
    const mockDecipher = {
      update: jest.fn().mockReturnValue("decrypted"),
      final: jest.fn().mockReturnValue("-string"),
    };

    beforeAll((): void => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mockCreateDecipheriv = require("crypto").createDecipheriv as jest.Mock;
    });

    beforeEach((): void => {
      jest.clearAllMocks();

      mockCreateDecipheriv.mockReturnValue(mockDecipher);
    });

    it("should decrypt a string that was previously encrypted", (): void => {
      const result: string = decrypt(encryptedString);

      expect(mockCreateDecipheriv).toHaveBeenCalledWith(algorithm, expect.any(Buffer), expect.any(Buffer));
      expect(mockDecipher.update).toHaveBeenCalledWith(encryptedString.split(":")[1], "hex", "utf8");
      expect(mockDecipher.final).toHaveBeenCalledWith("utf8");
      expect(result).toBe("decrypted-string");
    });

    it("should throw an error for invalid encrypted string format", (): void => {
      expect(() => decrypt("invalid-format")).toThrow("Invalid encrypted string format");
    });

    it("should handle decryption errors gracefully", (): void => {
      const error = new Error("Decryption failed");
      mockDecipher.update.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => decrypt(encryptedString)).toThrow("Decryption failed");
    });
  });
});
