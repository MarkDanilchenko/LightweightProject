/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import JwtStrategy from "@server/auth/strategies/jwt.strategy";
import TokensService from "@server/tokens/tokens.service";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { faker } from "@faker-js/faker";

describe("JwtStrategy", (): void => {
  const jwtSecret = "test-jwt-secret-yvqAYoIT";
  const mockDone: jest.MockedFunction<(...args: unknown[]) => void> = jest.fn();
  let payload: TokenPayload;
  let jwtStrategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;
  let tokensService: jest.Mocked<TokensService>;

  beforeEach(async (): Promise<void> => {
    const mockTokensService = { isBlacklisted: jest.fn() };
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string): string | undefined => {
        switch (key) {
          case "jwtConfiguration.secret": {
            return jwtSecret;
          }

          default: {
            return undefined;
          }
        }
      }),
    };
    payload = {
      provider: AuthenticationProvider.LOCAL,
      userId: faker.string.uuid(),
      jwti: faker.string.uuid(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TokensService, useValue: mockTokensService },
      ],
    }).compile();

    jwtStrategy = testingModule.get<JwtStrategy>(JwtStrategy);
    tokensService = testingModule.get<jest.Mocked<TokensService>>(TokensService);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(jwtStrategy).toBeDefined();
  });

  it("should be configured with redefined options in super constructor", (): void => {
    expect(configService.get).toHaveBeenCalledWith("jwtConfiguration.secret");
    expect(configService.get).toHaveReturnedWith(jwtSecret);
    expect((jwtStrategy as any)._jwtFromRequest).toBeTruthy();
    expect((jwtStrategy as any)._ignoreExpiration).toBeFalsy();
  });

  describe("validate", (): void => {
    it("should throw UnauthorizedException when payload is missing", async (): Promise<void> => {
      await expect(jwtStrategy.validate(null as unknown as TokenPayload, mockDone)).rejects.toThrow(
        new UnauthorizedException("Authentication failed."),
      );
    });

    it("should throw UnauthorizedException when jwti is missing or invalid in payload", async (): Promise<void> => {
      delete payload.jwti;

      await expect(jwtStrategy.validate(payload, mockDone)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Token is invalid."),
      );
    });

    it("should throw UnauthorizedException when jwt(jwti) is blacklisted", async (): Promise<void> => {
      const blacklistedJwti = faker.string.uuid();
      payload.jwti = blacklistedJwti;

      tokensService.isBlacklisted.mockResolvedValue(true);

      await expect(jwtStrategy.validate(payload, mockDone)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Token is invalid."),
      );

      expect(tokensService.isBlacklisted).toHaveBeenCalledWith(blacklistedJwti);
    });

    it("should call done with payload when token is valid and not blacklisted", async (): Promise<void> => {
      tokensService.isBlacklisted.mockResolvedValue(false);

      await jwtStrategy.validate(payload, mockDone);

      expect(tokensService.isBlacklisted).toHaveBeenCalledWith(payload.jwti);
      expect(mockDone).toHaveBeenCalledWith(null, payload);
    });
  });
});
