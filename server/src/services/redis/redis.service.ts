import { BadRequestException, Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { REDIS_CLIENT, REDIS_KEY_MAX_BYTE_LEN, REDIS_KEY_TTL_SEC } from "@server/constants";
import Redis from "ioredis";

@Injectable()
export default class RedisService {
  private readonly logger: LoggerService;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
    this.logger = new Logger(RedisService.name);
  }

  private validateKey(key: string | Buffer): void {
    try {
      if (typeof key !== "string" && !Buffer.isBuffer(key)) {
        throw new Error("Redis: Invalid key type");
      }

      const keyStr: string = Buffer.isBuffer(key) ? key.toString("utf-8") : key;

      if (!keyStr.length) {
        throw new Error("Redis: Invalid key length");
      }

      if (Buffer.byteLength(keyStr, "utf-8") > REDIS_KEY_MAX_BYTE_LEN) {
        throw new Error(`Redis: Invalid key byte length ( >${REDIS_KEY_MAX_BYTE_LEN} bytes is not supported)`);
      }

      const dangerousChars: string[] = ["\x00", "\n", "\r", "\x1a", " "];
      if (dangerousChars.some((char: string): boolean => keyStr.includes(char))) {
        throw new Error(`Redis: Key contains invalid characters: ${dangerousChars.join(", ")}`);
      }
    } catch (error) {
      this.logger.error(error.message);

      throw new BadRequestException("Redis: Invalid key");
    }
  }

  /**
   * Retrieves a value from the Redis store by its key.
   *
   * @template T The type of the value to be retrieved.
   * @param {string | Buffer} key The key of the value to be retrieved.
   *
   * @returns {Promise<T | null>} A promise that resolves with the retrieved value if found, otherwise null.
   */
  async get<T>(key: string | Buffer): Promise<T | null> {
    const value: string | null = await this.redisClient.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  /**
   * Checks if a key exists in the Redis store.
   *
   * @param {string | Buffer} keys The keys to check if they exist in the Redis store.
   *
   * @returns {Promise<boolean>} A promise that resolves to true if the key exists in the Redis store, otherwise false.
   */
  async exists(...keys: (string | Buffer)[]): Promise<boolean> {
    const exists: number = await this.redisClient.exists(keys);

    return exists === 1;
  }

  /**
   * Sets a value in the Redis store by its key with an optional TTL.
   *
   * @param {string | Buffer} key The key of the value to be set.
   * @param {any} value The value to be set.
   * @param {number} [ttl=REDIS_KEY_TTL_SEC] The TTL of the key-value pair in seconds. Defaults to 1 hour.
   *
   * @returns {Promise<void>} A promise that resolves when the value is set in the Redis store.
   */
  async set(key: string | Buffer, value: any, ttl: number = REDIS_KEY_TTL_SEC): Promise<void> {
    this.validateKey(key);

    value = typeof value === "string" ? value : JSON.stringify(value);

    await this.redisClient.setex(key, ttl, value);
  }

  /**
   * Deletes a key-value pair from the Redis store.
   *
   * @param {string | Buffer} key The key of the key-value pair to be deleted.
   *
   * @returns {Promise<void>} A promise that resolves when the key-value pair is deleted from the Redis store.
   */
  async del(key: string | Buffer): Promise<void> {
    await this.redisClient.del(key);
  }
}
