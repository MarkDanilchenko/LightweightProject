/* eslint-disable @typescript-eslint/no-require-imports */
import { createCipheriv, createDecipheriv } from "crypto";
import { encrypt, decrypt } from "#server/utils/encrypter";
import { MockedFunction } from "vitest";
import { Cipheriv } from "node:crypto";

// Mock the crypto module;
vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");

  return {
    ...actual,
    createCipheriv: vi.fn(),
    createDecipheriv: vi.fn(),
  };
});

// Mock the app configuration to provide complete configuration for tests;
vi.mock("#server/configs/app.configuration", () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
    serverConfiguration: {
      host: "127.0.0.1",
      port: 3000,
      swaggerEnabled: false,
      cookieSecret: "c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      commonSecret: "c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      https: false,
      protocol: "http",
      baseUrl: "http://127.0.0.1:3000",
    },
  })),
}));

describe("Encrypter Utility", (): void => {
  const algorithm = "aes-256-cbc";
  let mockCreateCipheriv = createCipheriv as MockedFunction<typeof createCipheriv>;
  let mockCreateDecipheriv = createDecipheriv as MockedFunction<typeof createDecipheriv>;

  describe("encrypt function", (): void => {
    const strToEncrypt = "XZdVBFiOqfB";
    const mockCipher = {
      update: vi.fn().mockReturnValue("encrypted"),
      final: vi.fn().mockReturnValue("-string"),
    };

    beforeEach((): void => {
      mockCreateCipheriv.mockReturnValue(mockCipher as unknown as Cipheriv);
    });

    afterEach((): void => {
      vi.clearAllMocks();
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
      update: vi.fn().mockReturnValue("decrypted"),
      final: vi.fn().mockReturnValue("-string"),
    };

    beforeEach((): void => {
      mockCreateDecipheriv.mockReturnValue(mockDecipher as unknown as Cipheriv);
    });

    afterEach((): void => {
      vi.clearAllMocks();
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
