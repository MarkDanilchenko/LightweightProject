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

describe("TokensService", (): void => {
  let tokensService: TokensService;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;
  let redisService: jest.Mocked<RedisService>;

  const mockTokenPayload: TokenPayload = {
    jwti: faker.string.uuid(),
    userId: faker.string.uuid(),
    provider: faker.helpers.arrayElement(Object.values(AuthenticationProvider)),
    iat: Math.floor(faker.date.recent().getTime() / 1000), // Random recent timestamp in seconds;
    exp: Math.floor(faker.date.soon({ days: 7 }).getTime() / 1000), // Random future timestamp within 7 days;
  };

  const mockToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30"; // random jwt from https://www.jwt.io/

  beforeEach(async (): Promise<void> => {
    const mockJwtService = {
      signAsync: jest.fn().mockResolvedValue(mockToken),
      verifyAsync: jest.fn().mockResolvedValue(mockTokenPayload),
      decode: jest.fn().mockReturnValue(mockTokenPayload),
    };

    const mockRedisService = {
      exists: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue("OK"),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((value: string): string | null => {
        switch (value) {
          case "jwtConfiguration.refreshTokenExpiresIn":
            return "7d";
          case "jwtConfiguration.accessTokenExpiresIn":
            return "15m";

          default:
            return null;
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
      expect(result).toBe(mockToken);
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
      const result: TokenPayload = await tokensService.verify(mockToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(1);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, { ignoreExpiration: false });
      expect(result).toEqual(mockTokenPayload);
    });

    it("should throw UnauthorizedException for expired token", async (): Promise<void> => {
      const error = new Error("Token expired");
      error.name = "TokenExpiredError";
      jwtService.verifyAsync.mockRejectedValueOnce(error);

      await expect(tokensService.verify(mockToken)).rejects.toThrow(new UnauthorizedException("Token expired"));
    });

    it("should throw UnauthorizedException for invalid token", async (): Promise<void> => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error("Invalid token"));

      await expect(tokensService.verify("invalid.token")).rejects.toThrow(new UnauthorizedException("Invalid token"));
    });
  });

  describe("decode", (): void => {
    it("should decode a token without verification", (): void => {
      const result: TokenPayload = tokensService.decode(mockToken);

      expect(jwtService.decode).toHaveBeenCalledTimes(1);
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockTokenPayload);
    });
  });

  describe("isBlacklisted", (): void => {
    it("should check if token is blacklisted", async (): Promise<void> => {
      const jwti = "dc90a1ca-b82c-434e-8783-bd95e2ab4f66";
      const exists = true;
      redisService.exists.mockResolvedValueOnce(exists);

      const result: boolean = await tokensService.isBlacklisted(jwti);

      expect(redisService.exists).toHaveBeenCalledTimes(1);
      expect(redisService.exists).toHaveBeenCalledWith(jwti);
      expect(result).toBe(exists);
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
