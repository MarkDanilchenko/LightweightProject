/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import GitHubOAuth2Strategy from "#server/auth/strategies/github.strategy";
import AuthService from "#server/auth/auth.service";
import { Profile } from "passport-github2";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import { buildUserFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";

describe("GitHubOAuth2Strategy", (): void => {
  const mockDone: jest.MockedFunction<(...args: unknown[]) => void> = jest.fn();
  let githubStrategy: GitHubOAuth2Strategy;
  let configService: jest.Mocked<ConfigService>;
  let authService: jest.Mocked<AuthService>;
  let user: UserEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();

    const mockAuthService = { idPAuthentication: jest.fn() };
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string): string | undefined => {
        switch (key) {
          case "authConfiguration.github.clientID": {
            return "test-github-client-id";
          }

          case "authConfiguration.github.clientSecret": {
            return "test-github-client-secret";
          }

          case "authConfiguration.github.callbackURL": {
            return "https://localhost:3000/api/v1/auth/github/redirect";
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
        GitHubOAuth2Strategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    githubStrategy = testingModule.get<GitHubOAuth2Strategy>(GitHubOAuth2Strategy);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(githubStrategy).toBeDefined();
  });

  it("should be configured with correct options in super constructor", (): void => {
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.github.clientID");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.github.clientSecret");
    expect(configService.get).toHaveBeenCalledWith("authConfiguration.github.callbackURL");
  });

  describe("validate", (): void => {
    const mockProfile = {
      id: "test-github-id-GvVfUmeYD",
      displayName: "John Doe",
      username: "johndoe",
      name: {
        givenName: "John",
        familyName: "Doe",
      },
      emails: [{ value: "john.doe@example.com", verified: true }],
      photos: [{ value: "https://example.com/avatar.jpg" }],
      provider: "github",
      _json: {
        login: "johndoe",
        name: "John Doe",
        email: "john.doe@example.com",
        avatar_url: "https://example.com/avatar.jpg",
      },
    } as unknown as Profile;
    const mockAccessToken = "test-github-access-token";
    const mockRefreshToken = "test-github-refresh-token";

    it("should call done with UnauthorizedException when email is missing in profile", async (): Promise<void> => {
      const profileWithoutEmail = {
        ...mockProfile,
        emails: [],
      } as unknown as Profile;

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, profileWithoutEmail, mockDone);

      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Email is required"), undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with UnauthorizedException when emails is null", async (): Promise<void> => {
      const profileWithoutEmails = {
        ...mockProfile,
        emails: null,
      } as unknown as Profile;

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, profileWithoutEmails, mockDone);

      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Email is required"), undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with UnauthorizedException when authService throws error", async (): Promise<void> => {
      const error = new Error("Database connection failed");
      authService.idPAuthentication.mockRejectedValue(error);

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GITHUB, {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
        username: "johndoe",
      });
      expect(mockDone).toHaveBeenCalledWith("Database connection failed", undefined);
    });

    it("should call done with user when authentication succeeds", async (): Promise<void> => {
      authService.idPAuthentication.mockResolvedValue(user);

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GITHUB, {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
        username: "johndoe",
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

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, minimalProfile, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GITHUB, {
        firstName: undefined,
        lastName: undefined,
        email: "jane@example.com",
        avatarUrl: undefined,
        username: undefined,
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should handle profile with username but no name fields", async (): Promise<void> => {
      const profileWithUsernameOnly: Profile = {
        ...mockProfile,
        username: "janedoe",
        name: undefined,
        photos: undefined,
        emails: [{ value: "jane.doe@example.com", verified: true }],
      } as unknown as Profile;

      authService.idPAuthentication.mockResolvedValue(user);

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, profileWithUsernameOnly, mockDone);

      expect(authService.idPAuthentication).toHaveBeenCalledWith(AuthenticationProvider.GITHUB, {
        firstName: undefined,
        lastName: undefined,
        email: "jane.doe@example.com",
        avatarUrl: undefined,
        username: "janedoe",
      });
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should handle profile with email from non-array emails field", async (): Promise<void> => {
      const profileWithNonArrayEmails = {
        ...mockProfile,
        emails: { value: "object@example.com", verified: true },
      } as unknown as Profile;

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, profileWithNonArrayEmails, mockDone);

      // When emails is an object (not array), Array.isArray returns false,
      // so email becomes undefined and done is called with UnauthorizedException
      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Email is required"), undefined);
      expect(authService.idPAuthentication).not.toHaveBeenCalled();
    });

    it("should call done with error message when authService throws UnauthorizedException", async (): Promise<void> => {
      const error = new UnauthorizedException("GitHub API rate limit exceeded");
      authService.idPAuthentication.mockRejectedValue(error);

      await githubStrategy.validate(mockAccessToken, mockRefreshToken, mockProfile, mockDone);

      expect(mockDone).toHaveBeenCalledWith("GitHub API rate limit exceeded", undefined);
    });
  });
});
