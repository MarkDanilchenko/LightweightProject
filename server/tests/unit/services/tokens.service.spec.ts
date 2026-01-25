/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException } from "@nestjs/common";
import TokensService from "@server/tokens/tokens.service";
import RedisService from "@server/services/redis/redis.service";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { faker } from "@faker-js/faker";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { randomValidJwt } from "../../utils";

describe("TokensService", (): void => {
  let tokensService: TokensService;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;
  let mockTokenPayload: TokenPayload;
  let mockJwtToken: string;

  beforeEach(async (): Promise<void> => {
    mockTokenPayload = {
      jwti: faker.string.uuid(),
      userId: faker.string.uuid(),
      provider: faker.helpers.arrayElement(Object.values(AuthenticationProvider)),
      iat: Math.floor(faker.date.recent().getTime() / 1000), // Random recent timestamp in seconds;
      exp: Math.floor(faker.date.soon({ days: 7 }).getTime() / 1000), // Random future timestamp within 7 days;
    };

    mockJwtToken = randomValidJwt({
      jwti: mockTokenPayload.jwti,
      userId: mockTokenPayload.userId,
      provider: mockTokenPayload.provider,
    });

    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue(mockJwtToken),
      verifyAsync: jest.fn().mockResolvedValue(mockTokenPayload),
      decode: jest.fn().mockReturnValue(mockTokenPayload),
    };

    const mockRedisService = {
      exists: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue("OK"),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((value: string): string | undefined => {
        switch (value) {
          case "jwtConfiguration.refreshTokenExpiresIn":
            return "7d";
          case "jwtConfiguration.accessTokenExpiresIn":
            return "15m";

          default:
            return undefined;
        }
      }),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    tokensService = testingModule.get<TokensService>(TokensService);
    jwtService = testingModule.get<JwtService>(JwtService) as jest.Mocked<JwtService>;
    configService = testingModule.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
    redisService = testingModule.get<RedisService>(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(tokensService).toBeDefined();
  });

  describe("generate", (): void => {
    it("should generate a JWT token with default options", async (): Promise<void> => {
      delete mockTokenPayload.exp;
      delete mockTokenPayload.iat;

      const result: string = await tokensService.generate(mockTokenPayload);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.signAsync).toHaveBeenCalledWith(mockTokenPayload, { expiresIn: "1d" });
      expect(result).toBe(mockJwtToken);
    });

    it("should generate a JWT token with custom options", async (): Promise<void> => {
      const customOptions = { expiresIn: "2h" };

      delete mockTokenPayload.exp;
      delete mockTokenPayload.iat;

      await tokensService.generate(mockTokenPayload, customOptions);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.signAsync).toHaveBeenCalledWith(mockTokenPayload, customOptions);
    });
  });

  describe("verify", (): void => {
    it("should verify a valid token", async (): Promise<void> => {
      const result: TokenPayload = await tokensService.verify(mockJwtToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockJwtToken, { ignoreExpiration: false });
      expect(result).toEqual(mockTokenPayload);
    });

    it("should throw UnauthorizedException for expired token", async (): Promise<void> => {
      const error: Error = new Error("Token expired");
      error.name = "TokenExpiredError";

      jwtService.verifyAsync.mockRejectedValueOnce(error);

      await expect(tokensService.verify(mockJwtToken)).rejects.toThrow(new UnauthorizedException("Token expired"));
    });

    it("should throw UnauthorizedException for invalid token", async (): Promise<void> => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error("Invalid token"));

      await expect(tokensService.verify("invalid-jwt-token")).rejects.toThrow(
        new UnauthorizedException("Invalid token"),
      );
    });
  });

  describe("decode", (): void => {
    it("should decode a token without verification", (): void => {
      const result: TokenPayload = tokensService.decode(mockJwtToken);

      expect(jwtService.decode).toHaveBeenCalledTimes(1);
      expect(jwtService.decode).toHaveBeenCalledWith(mockJwtToken);
      expect(result).toEqual(mockTokenPayload);
    });
  });

  describe("isBlacklisted", (): void => {
    it("should check if token is blacklisted", async (): Promise<void> => {
      const jwtToken: string = randomValidJwt({
        userId: faker.string.uuid(),
        provider: faker.helpers.arrayElement(Object.values(AuthenticationProvider)),
        jwti: faker.string.uuid(),
      });

      redisService.exists.mockResolvedValueOnce(true);

      const result: boolean = await tokensService.isBlacklisted(jwtToken);

      expect(redisService.exists).toHaveBeenCalledTimes(1);
      expect(redisService.exists).toHaveBeenCalledWith(jwtToken);
      expect(result).toBeTruthy();
    });
  });

  describe("addToBlacklist", (): void => {
    it("should add token to blacklist", async (): Promise<void> => {
      const jwti = "2e4a91b1-54d6-4ace-9692-2a8c96443024";
      const exp = Math.floor(Date.now() / 1_000) + 3_600; // 1 hour from now;

      await tokensService.addToBlacklist(jwti, exp);

      expect(redisService.set).toHaveBeenCalledTimes(1);
      expect(redisService.set).toHaveBeenCalledWith(
        `blacklist:jwti:${jwti}`,
        jwti,
        expect.any(Number), // assume, that TTL should be close to 3600 (1 hour in seconds);
      );
    });
  });
});
