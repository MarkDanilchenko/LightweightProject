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
    let mockScrypt: jest.Mock;
    let toHash: string;

    beforeAll((): void => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mockScrypt = require("crypto").scrypt as jest.Mock;
      toHash = "Test-password_12345";
    });

    beforeEach((): void => {
      jest.clearAllMocks();

      mockScrypt.mockImplementation((...args: any[]): void => {
        const callback = args[args.length - 1];
        callback(null, Buffer.from("xRewhBtmbIpMsJ3vdn724aIKnlcMOAsi"));
      });
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
    let mockScrypt: jest.Mock;
    let mockTimingSafeEqual: jest.Mock;
    let toHash: string;

    beforeAll((): void => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mockScrypt = require("crypto").scrypt as jest.Mock;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mockTimingSafeEqual = require("crypto").timingSafeEqual as jest.Mock;
      toHash = "Test-password_12345";
    });

    beforeEach((): void => {
      jest.clearAllMocks();

      mockScrypt.mockImplementation((...args: any[]): void => {
        const callback = args[args.length - 1];
        callback(null, Buffer.from("xRewhBtmbIpMsJ3vdn724aIKnlcMOAsi"));
      });
    });

    it("should return true for matching hash", async (): Promise<void> => {
      mockTimingSafeEqual.mockReturnValueOnce(true);
      const storedHash: string = await hash(toHash);

      const result: boolean = await verifyHash(toHash, storedHash);

      expect(result).toBe(true);
      expect(mockTimingSafeEqual).toHaveBeenCalled();
    });

    it("should return false for non-matching hash", async (): Promise<void> => {
      mockTimingSafeEqual.mockReturnValueOnce(false);
      const storedHash: string = await hash(toHash);

      const result: boolean = await verifyHash(toHash, storedHash.slice(0, -1) + "A");

      expect(result).toBe(false);
      expect(mockTimingSafeEqual).toHaveBeenCalled();
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
      mockScrypt.mockImplementationOnce((...args: any[]) => {
        const callback = args[args.length - 1];
        callback(error);
      });

      await expect(verifyHash(toHash, storedHash)).rejects.toThrow("Hashing failed");
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
