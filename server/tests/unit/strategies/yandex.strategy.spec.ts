/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import YandexOAuth2Strategy from "#server/auth/strategies/yandex.strategy";
import AuthService from "#server/auth/auth.service";
import { Profile } from "passport-yandex";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import { buildUserFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";

describe("YandexOAuth2Strategy", (): void => {
  const mockDone: jest.MockedFunction<(...args: unknown[]) => void> = jest.fn();
  let yandexStrategy: YandexOAuth2Strategy;
  let configService: jest.Mocked<ConfigService>;
  let authService: jest.Mocked<AuthService>;
  let user: UserEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();

    const mockAuthService = { idPAuthentication: jest.fn() };
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string): string | undefined => {
        switch (key) {
          case "authConfiguration.yandex.clientID": {
            return "test-yandex-client-id";
          }

          case "authConfiguration.yandex.clientSecret": {
            return "test-yandex-client-secret";
          }

          case "authConfiguration.yandex.callbackURL": {
            return "https://localhost:3000/api/v1/auth/yandex/redirect";
          }

          default: {
            return undefined;
          }
        }
      }),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [
        YandexOAuth2Strategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    yandexStrategy = testingModule.get<YandexOAuth2Strategy>(YandexOAuth2Strategy);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(yandexStrategy).toBeDefined();
  });

  it("should be configured with correct options in super constructor", (): void => {
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.yandex.clientID");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.yandex.clientSecret");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.yandex.callbackURL");
  });

  describe("validate", (): void => {
    const mockProfile = {
      id: "test-yandex-id-123456789",
      displayName: "Ivan Petrov",
      username: "ivan_petrov",
      name: {
        givenName: "Ivan",
        familyName: "Petrov",
      },
      emails: [{ value: "ivan.petrov@yandex.ru", verified: true }],
      photos: [{ value: "https://yandex.ru/userpic/ivan.jpg" }],
      provider: "yandex",
      _json: {
        login: "ivan_petrov",
        display_name: "ivan_petrov",
        first_name: "Ivan",
        last_name: "Petrov",
        email: "ivan.petrov@yandex.ru",
        avatar_id: "12345",
      },
    } as unknown as Profile;
    const mockAccessToken = "test-yandex-access-token";
    const mockRefreshToken = "test-yandex-refresh-token";

    it("should call done with error when email is missing in profile", async (): Promise<void> => {
      const profileWithoutEmail = {
        ...mockProfile,
        emails: [],
      } as unknown as Profile;

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, profileWithoutEmail, mockDone);

      expect(mockDone).toHaveBeenCalledWith("No email found", undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with error when emails is null", async (): Promise<void> => {
      const profileWithoutEmails = {
        ...mockProfile,
        emails: null,
      } as unknown as Profile;

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, profileWithoutEmails, mockDone);

      expect(mockDone).toHaveBeenCalledWith("No email found", undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with error when authService throws error", async (): Promise<void> => {
      const error = new Error("Database connection failed");
      authService.idPAuthentication.mockRejectedValue(error);

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.YANDEX, {
        firstName: "Ivan",
        lastName: "Petrov",
        email: "ivan.petrov@yandex.ru",
        avatarUrl: "https://yandex.ru/userpic/ivan.jpg",
        username: "ivan_petrov",
      });
      expect(mockDone).toHaveBeenCalledWith("Database connection failed", undefined);
    });

    it("should call done with user when authentication succeeds", async (): Promise<void> => {
      authService.idPAuthentication.mockResolvedValue(user);

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.YANDEX, {
        firstName: "Ivan",
        lastName: "Petrov",
        email: "ivan.petrov@yandex.ru",
        avatarUrl: "https://yandex.ru/userpic/ivan.jpg",
        username: "ivan_petrov",
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should handle profile with optional fields (no picture, no name)", async (): Promise<void> => {
      const minimalProfile: Profile = {
        ...mockProfile,
        username: undefined,
        name: undefined,
        photos: [],
        emails: [{ value: "jane@example.com", verified: true }],
      } as unknown as Profile;

      authService.idPAuthentication.mockResolvedValue(user);

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, minimalProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.YANDEX, {
        firstName: undefined,
        lastName: undefined,
        email: "jane@example.com",
        avatarUrl: undefined,
        username: undefined,
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should call done with error message when authService throws UnauthorizedException", async (): Promise<void> => {
      const error = new Error("Yandex API rate limit exceeded");
      authService.idPAuthentication.mockRejectedValue(error);

      await yandexStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith("Yandex API rate limit exceeded", undefined);
    });
  });
});
