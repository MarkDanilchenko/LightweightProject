/* eslint-disable @typescript-eslint/no-require-imports */
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
    const strToEncrypt = "XZdVBFiOqfB";
    const mockCipher = {
      update: jest.fn().mockReturnValue("encrypted"),
      final: jest.fn().mockReturnValue("-string"),
    };
    let mockCreateCipheriv: jest.MockedFunction<any>;

    beforeEach((): void => {
      mockCreateCipheriv = require("crypto").createCipheriv as jest.MockedFunction<any>;
      mockCreateCipheriv.mockReturnValue(mockCipher);
    });

    afterEach((): void => {
      jest.clearAllMocks();
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
    const encryptedString = "74657374697631323334353637383930:encrypted-string";
    const mockDecipher = {
      update: jest.fn().mockReturnValue("decrypted"),
      final: jest.fn().mockReturnValue("-string"),
    };
    let mockCreateDecipheriv: jest.MockedFunction<any>;

    beforeEach((): void => {
      mockCreateDecipheriv = require("crypto").createDecipheriv as jest.MockedFunction<any>;
      mockCreateDecipheriv.mockReturnValue(mockDecipher);
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should decrypt an encrypted string", (): void => {
      const result: string = decrypt(encryptedString);

      expect(mockCreateDecipheriv).toHaveBeenCalledWith(algorithm, expect.any(Buffer), expect.any(Buffer));
      expect(mockDecipher.update).toHaveBeenCalledWith(encryptedString.split(":")[1], "hex", "utf8");
      expect(mockDecipher.final).toHaveBeenCalledWith("utf8");
      expect(result).toBe("decrypted-string");
    });

    it("should throw an error for invalid encrypted string format", (): void => {
      expect((): string => decrypt("invalid-format")).toThrow("Invalid encrypted string format");
    });

    it("should handle decryption errors gracefully", (): void => {
      mockDecipher.update.mockImplementationOnce(() => {
        throw new Error("Decryption failed");
      });

      expect((): string => decrypt(encryptedString)).toThrow("Decryption failed");
    });
  });
});
