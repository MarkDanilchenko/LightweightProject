import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, JwtSignOptions, JwtVerifyOptions } from "@nestjs/jwt";
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
   * @param {JwtSignOptions} [options] The options to use for generating the jwt. Defaults to { expiresIn: "1d" }.
   *
   * @returns {Promise<string>} A promise that resolves with the generated jwt.
   */
  async generate(payload: TokenPayload, options: JwtSignOptions = { expiresIn: "1d" }): Promise<string> {
    return this.jwtService.signAsync(payload, options);
  }

  /**
   * Verifies the given jwt.
   *
   * @param {string} token The token to verify.
   * @param {JwtVerifyOptions} [options] The options to use for verifying the jwt. Defaults to { ignoreExpiration: false }.
   *
   * @returns {Promise<TokenPayload>} A promise that resolves with the verified token payload
   * or rejects with an UnauthorizedException if the token is invalid or expired.
   */
  async verify(token: string, options: JwtVerifyOptions = { ignoreExpiration: false }): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token, options);
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
   * @param {number} exp The expiration time of the jwt.
   *
   * @returns {Promise<void>} A promise that resolves when the jwt is added to the blacklist.
   */
  async addToBlacklist(jwti: string, exp: number): Promise<void> {
    const key: string = `blacklist:jwti:${jwti}`;

    // Calculate time to live (TTL) in milliseconds for the token in Redis;
    const ttl: number = Math.floor((new Date(exp * 1_000).getTime() - new Date().getTime()) / 1_000);

    await this.redisService.set(key, jwti, ttl);
  }
}
