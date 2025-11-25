import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import RedisService from "@server/services/redis/redis.service";

@Injectable()
export default class TokensService {
  private readonly configService: ConfigService;
  private readonly jwtService: JwtService;
  private readonly redisService: RedisService;
  public readonly jwtRefreshTokenExpiresIn: string;
  public readonly jwtAccessTokenExpiresIn: string;

  constructor(configService: ConfigService, jwtService: JwtService, redisService: RedisService) {
    this.configService = configService;
    this.jwtService = jwtService;
    this.redisService = redisService;
    this.jwtRefreshTokenExpiresIn = configService.get<AppConfiguration["jwtConfiguration"]["refreshTokenExpiresIn"]>(
      "jwtConfiguration.refreshTokenExpiresIn",
    )!;
    this.jwtAccessTokenExpiresIn = configService.get<AppConfiguration["jwtConfiguration"]["accessTokenExpiresIn"]>(
      "jwtConfiguration.accessTokenExpiresIn",
    )!;
  }

  /**
   * Generates a jwt with the given payload and expiresIn.
   *
   * @param {TokenPayload} payload The payload to sign.
   * @param {string} [expiresIn] The time until the token expires. Defaults to 1 day.
   *
   * @returns {Promise<string>} A promise that resolves with the generated jwt.
   */
  async generate(payload: TokenPayload, expiresIn?: string): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: expiresIn || "1d" });
  }

  /**
   * Verifies the given jwt.
   *
   * @param {string} token The token to verify.
   * @param {boolean} [ignoreExpiration] Whether to ignore the expiration time of the token. Defaults to false.
   *
   * @returns {Promise<TokenPayload>} A promise that resolves with the verified token payload
   * or rejects with an UnauthorizedException if the token is invalid or expired.
   */
  async verify(token: string, ignoreExpiration = false): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token, { ignoreExpiration });
  }

  /**
   * Checks if a jwt is blacklisted in the Redis store.
   *
   * @param {string} jwti The jwt to check if it is blacklisted.
   *
   * @returns {Promise<boolean>} A promise that resolves to true if the jwt is blacklisted, otherwise false.
   */
  async isBlacklisted(jwti: string): Promise<boolean> {
    return this.redisService.exists(jwti);
  }

  /**
   * Adds a jwt to the blacklist in the Redis store.
   *
   * @param {string} jwti The jwt to add to the blacklist.
   * @param {number} ext The expiration time of the jwt.
   *
   * @returns {Promise<void>} A promise that resolves when the jwt is added to the blacklist.
   */
  async addToBlacklist(jwti: string, ext: number): Promise<void> {
    const key: string = `blacklist:jwti:${jwti}`;

    // Calculate time to live (TTL) in milliseconds for the token in Redis;
    const ttl: number = new Date(ext).getTime() - new Date().getTime();

    await this.redisService.set(key, jwti, ttl);
  }
}
