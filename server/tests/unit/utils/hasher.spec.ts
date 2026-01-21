/* eslint-disable @typescript-eslint/no-require-imports */
import crypto from "crypto";
import { hash, verifyHash } from "@server/utils/hasher";

// Mock the crypto module;
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  scrypt: jest.fn(),
  timingSafeEqual: jest.fn(),
}));

describe("Hasher Utility", (): void => {
  const keylen = 64;

  describe("hash function", (): void => {
    const toHash = "ghDkHXrKI";
    const mockScrypt = require("crypto").scrypt as jest.MockedFunction<typeof crypto.scrypt>;

    beforeEach((): void => {
      mockScrypt.mockImplementation((...args: any[]): void => {
        const callback = args[args.length - 1];

        callback(null, Buffer.from("xRewhBtmbIpMsJ3vdn724aIKnlcMOAsi"));
      });
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should call scrypt with correct parameters", async (): Promise<void> => {
      await hash(toHash);

      expect(mockScrypt).toHaveBeenCalledWith(
        toHash,
        expect.any(Buffer), // scrypt salt buffer;
        keylen,
        expect.any(Function), // scrypt callback function;
      );
    });

    it("should return a hashed string", async (): Promise<void> => {
      const hashed: string = await hash(toHash);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe("string");
      expect(hashed.length).toBeGreaterThan(0);
      expect(hashed).not.toEqual(toHash);
    });

    it("should throw an error if scrypt fails", async (): Promise<void> => {
      const error = new Error("Scrypt failed");

      mockScrypt.mockImplementationOnce((...args: any[]): void => {
        const callback = args[args.length - 1];

        callback(error, undefined);
      });

      await expect(hash(toHash)).rejects.toThrow(error);
    });
  });

  describe("verifyHash function", () => {
    const toHash = "VCmEC7q0CS";
    const mockScrypt = require("crypto").scrypt as jest.MockedFunction<typeof crypto.scrypt>;
    const mockTimingSafeEqual = require("crypto").timingSafeEqual as jest.MockedFunction<typeof crypto.timingSafeEqual>;

    beforeEach((): void => {
      mockScrypt.mockImplementation((...args: any[]): void => {
        const callback = args[args.length - 1];

        callback(null, Buffer.from("xRewhBtmbIpMsJ3vdn724aIKnlcMOAsi"));
      });
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should return true for matching hash", async (): Promise<void> => {
      mockTimingSafeEqual.mockReturnValueOnce(true);

      const storedHash: string = await hash(toHash);
      const result: boolean = await verifyHash(toHash, storedHash);

      expect(mockTimingSafeEqual).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should return false for non-matching hash", async (): Promise<void> => {
      mockTimingSafeEqual.mockReturnValueOnce(false);

      const storedHash: string = await hash(toHash);
      const result: boolean = await verifyHash(toHash, storedHash.slice(0, -1) + "A");

      expect(mockTimingSafeEqual).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should return false for different length hashes", async (): Promise<void> => {
      const storedHash: string = await hash(toHash);
      const result: boolean = await verifyHash(toHash, storedHash.slice(0, -1));

      expect(mockTimingSafeEqual).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("should throw an error if scrypt fails during verification", async (): Promise<void> => {
      const storedHash: string = await hash(toHash);
      const error = new Error("Hashing failed");

      mockScrypt.mockImplementationOnce((...args: any[]): void => {
        const callback = args[args.length - 1];

        callback(error);
      });

      await expect(verifyHash(toHash, storedHash)).rejects.toThrow(error);
    });

    it("should use the common secret from app configuration", async (): Promise<void> => {
      await hash(toHash);

      // Check that the salt is created from the common secret
      const saltArg = mockScrypt.mock.calls[0][1];

      expect(saltArg).toBeInstanceOf(Buffer);
      expect(saltArg).toHaveLength(32);
    });
  });
});
