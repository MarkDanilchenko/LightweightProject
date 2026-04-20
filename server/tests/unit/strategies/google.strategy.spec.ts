/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import GoogleOAuth2Strategy from "#server/auth/strategies/google.strategy";
import AuthService from "#server/auth/auth.service";
import { Profile } from "passport-google-oauth20";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import { buildUserFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";

describe("GoogleOAuth2Strategy", (): void => {
  const mockDone: jest.MockedFunction<(...args: unknown[]) => void> = jest.fn();
  let googleStrategy: GoogleOAuth2Strategy;
  let configService: jest.Mocked<ConfigService>;
  let authService: jest.Mocked<AuthService>;
  let user: UserEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();

    const mockAuthService = { idPAuthentication: jest.fn() };
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string): string | undefined => {
        switch (key) {
          case "authConfiguration.google.clientID": {
            return "test-google-client-id";
          }

          case "authConfiguration.google.clientSecret": {
            return "test-google-client-secret";
          }

          case "authConfiguration.google.callbackURL": {
            return "https://localhost:3000/api/v1/auth/google/redirect";
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
        GoogleOAuth2Strategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    googleStrategy = testingModule.get<GoogleOAuth2Strategy>(GoogleOAuth2Strategy);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(googleStrategy).toBeDefined();
  });

  it("should be configured with correct options in super constructor", (): void => {
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.google.clientID");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.google.clientSecret");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.google.callbackURL");
  });

  describe("validate", (): void => {
    const mockProfile = {
      id: "test-google-id-GvVfUmeYD",
      displayName: "John Doe",
      name: {
        givenName: "John",
        familyName: "Doe",
      },
      emails: [{ value: "john.doe@example.com", verified: true }],
      photos: [{ value: "https://example.com/avatar.jpg" }],
      provider: "google",
      _json: {
        given_name: "John",
        family_name: "Doe",
        email: "john.doe@example.com",
        picture: "https://example.com/avatar.jpg",
      },
    } as unknown as Profile;
    const mockAccessToken = "test-google-access-token";
    const mockRefreshToken = "test-google-refresh-token";

    it("should call done with UnauthorizedException when email is missing in profile", async (): Promise<void> => {
      const profileWithoutEmail = {
        ...mockProfile,
        _json: {
          given_name: "John",
          family_name: "Doe",
          picture: "https://example.com/avatar.jpg",
        },
      } as unknown as Profile;

      await googleStrategy.validate(mockAccessToken, mockRefreshToken, profileWithoutEmail, mockDone);

      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Email is required"), undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with UnauthorizedException when authService throws error", async (): Promise<void> => {
      const error = new Error("Database connection failed");
      authService.idPAuthentication.mockRejectedValue(error);

      await googleStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GOOGLE, {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException(error.message), undefined);
    });

    it("should call done with user when authentication succeeds", async (): Promise<void> => {
      authService.idPAuthentication.mockResolvedValue(user);

      await googleStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GOOGLE, {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should handle profile with optional fields (no picture, no last name)", async (): Promise<void> => {
      const minimalProfile: Profile = {
        ...mockProfile,
        name: { givenName: "Jane" },
        photos: [],
        _json: {
          given_name: "Jane",
          family_name: undefined,
          email: "jane@example.com",
          picture: undefined,
        },
      } as unknown as Profile;

      authService.idPAuthentication.mockResolvedValue(user);

      await googleStrategy.validate(mockAccessToken, mockRefreshToken, minimalProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GOOGLE, {
        firstName: "Jane",
        lastName: undefined,
        email: "jane@example.com",
        avatarUrl: undefined,
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });
  });
});
