/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RedisService from "@server/services/redis/redis.service";
import Redis from "ioredis";
import { BadRequestException, Logger } from "@nestjs/common";
import { REDIS_CLIENT, REDIS_KEY_MAX_BYTE_LEN, REDIS_KEY_TTL_SEC } from "@server/configs/constants";
import { faker } from "@faker-js/faker";

describe("RedisService", (): void => {
  const mockKey = "mocked:key";
  const mockStringValue = "mockedString - nvELw63S";
  const mockValue = { somekey1: "zGfKvWwA", somekey2: "Ln8PAuG", somekey3: "5f1YX4L" };
  let redisService: RedisService;
  let redisClient: jest.Mocked<Redis>;
  let logger: jest.SpyInstance;

  beforeEach(async (): Promise<void> => {
    const mockedRedisClient = {
      get: jest.fn(),
      setex: jest.fn().mockResolvedValue("OK"),
      exists: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [RedisService, { provide: REDIS_CLIENT, useValue: mockedRedisClient }],
    }).compile();

    redisService = testingModule.get<RedisService>(RedisService);
    redisClient = testingModule.get<jest.Mocked<Redis>>(REDIS_CLIENT);
    logger = jest.spyOn(Logger.prototype, "error").mockImplementation((): void => {});
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(redisService).toBeDefined();
  });

  describe("get", (): void => {
    it("should return parsed JSON", async (): Promise<void> => {
      redisClient.get.mockResolvedValueOnce(JSON.stringify(mockValue));

      const result = await redisService.get<typeof mockValue>(mockKey);

      expect(result).toEqual(mockValue);
      expect(redisClient.get).toHaveBeenCalledTimes(1);
      expect(redisClient.get).toHaveBeenCalledWith(mockKey);
    });

    it("should return string value as is", async (): Promise<void> => {
      redisClient.get.mockResolvedValueOnce(JSON.stringify(mockStringValue));

      const result: string | null = await redisService.get<string>(mockKey);

      expect(result).toBe(mockStringValue);
    });

    it("should return null for non-existent key", async (): Promise<void> => {
      redisClient.get.mockResolvedValueOnce(null);

      const result = await redisService.get("nonexistent:key");

      expect(result).toBeNull();
    });
  });

  describe("exists", (): void => {
    it("should return true if key exists", async (): Promise<void> => {
      const result: boolean = await redisService.exists(mockKey);

      expect(result).toBeTruthy();
      expect(redisClient.exists).toHaveBeenCalledTimes(1);
      expect(redisClient.exists).toHaveBeenCalledWith([mockKey]);
    });

    it("should return false if key exists", async (): Promise<void> => {
      redisClient.exists.mockResolvedValueOnce(0);

      const result: boolean = await redisService.exists("nonexistent:mocked:key");

      expect(redisClient.exists).toHaveBeenCalledWith(["nonexistent:mocked:key"]);
      expect(result).toBeFalsy();
    });

    it("should check multiple keys", async (): Promise<void> => {
      const multipleKeys: string[] = Array.from({ length: 5 }, (_, i) => `${i} - ${faker.string.alphanumeric(10)}`);

      await redisService.exists(...multipleKeys);

      expect(redisClient.exists).toHaveBeenCalledWith(multipleKeys);
    });
  });

  describe("delete", (): void => {
    it("should delete key", async (): Promise<void> => {
      await redisService.del(mockKey);

      expect(redisClient.del).toHaveBeenCalledTimes(1);
      expect(redisClient.del).toHaveBeenCalledWith(mockKey);
    });

    it("should not throw for non-existing key", async (): Promise<void> => {
      redisClient.del.mockResolvedValueOnce(0);

      await expect(redisService.del("nonexistent:key")).resolves.not.toThrow();
    });
  });

  describe("validate", (): void => {
    it("should not throw for valid string key", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(mockKey)).not.toThrow();
    });

    it("should not throw for valid Buffer key", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(Buffer.from(mockKey, "utf-8"))).not.toThrow();
    });

    it("should throw BadRequestException for empty key", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey("")).toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid key type", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(123)).toThrow(BadRequestException);
    });

    it("should throw BadRequestException for key with newline", (): void => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey("invalid\nkey")).toThrow(BadRequestException);
    });

    it("should throw BadRequestException for key more than 1 kB", (): void => {
      const largeKey = Buffer.alloc(REDIS_KEY_MAX_BYTE_LEN * 2).fill(0);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(largeKey)).toThrow(BadRequestException);
    });
  });

  describe("set", (): void => {
    it("should set value with default TTL", async (): Promise<void> => {
      await redisService.set(mockKey, mockValue);

      expect(redisClient.setex).toHaveBeenCalledWith(mockKey, REDIS_KEY_TTL_SEC, JSON.stringify(mockValue));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(mockKey)).not.toThrow();
    });

    it("should set value with custom TTL", async (): Promise<void> => {
      const customTtl = 60; // 1 minute;

      await redisService.set(mockKey, mockValue, customTtl);

      expect(redisClient.setex).toHaveBeenCalledWith(mockKey, customTtl, JSON.stringify(mockValue));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(mockKey)).not.toThrow();
    });

    it("should set string value without JSON stringify", async (): Promise<void> => {
      await redisService.set(mockKey, mockStringValue);

      expect(redisClient.setex).toHaveBeenCalledWith(mockKey, REDIS_KEY_TTL_SEC, mockStringValue);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      expect(() => (redisService as any).validateKey(mockKey)).not.toThrow();
    });

    it("should throw BadRequestException for invalid key", async (): Promise<void> => {
      const invalidKey = "invalid\nkey";

      await expect(redisService.set(invalidKey, mockValue)).rejects.toThrow(BadRequestException);
    });
  });
});
