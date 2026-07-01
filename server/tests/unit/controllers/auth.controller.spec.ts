/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import AuthController from "#server/auth/auth.controller";
import AuthService from "#server/auth/auth.service";
import {
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
  LocalRestorationConfirmDto,
  LocalSignInDto,
  LocalSignUpDto,
  LocalEmailVerificationDto,
} from "#server/auth/dto/auth.dto";
import { buildUserFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";
import { RequestWithSignedCookies, RequestWithTokenPayload, RequestWithUser } from "#server/common/types/common.types";
import { UnauthorizedException } from "@nestjs/common";
import { setCookie, clearCookie } from "#server/utils/cookie";
import { randomValidJwt } from "../../utils";
import { v4 as uuidv4 } from "uuid";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import GoogleOAuth2Guard from "#server/auth/guards/google.guard";
import GitHubOAuth2Guard from "#server/auth/guards/github.guard";
import YandexOAuth2Guard from "#server/auth/guards/yandex.guard";

jest.mock("#server/utils/cookie", () => ({
  setCookie: jest.fn(),
  clearCookie: jest.fn(),
}));

describe("AuthController", (): void => {
  const user: UserEntity = buildUserFactory();
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Response;
  let googleOAuth2Guard: jest.Mocked<GoogleOAuth2Guard>;
  let githubOAuth2Guard: jest.Mocked<GitHubOAuth2Guard>;
  let yandexOAuth2Guard: jest.Mocked<YandexOAuth2Guard>;

  beforeEach(async (): Promise<void> => {
    const mockAuthService = {
      localSignUp: jest.fn(),
      localEmailVerification: jest.fn(),
      localPasswordResetRequest: jest.fn(),
      localPasswordResetConfirm: jest.fn(),
      localReactivationConfirm: jest.fn(),
      localRestorationConfirm: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshAccessToken: jest.fn(),
      retrieveProfile: jest.fn(),
    };

    const mockGoogleOAuth2Guard = jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockReturnValue(true),
    }));

    const mockGitHubOAuth2Guard = jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockReturnValue(true),
    }));

    const mockYandexOAuth2Guard = jest.fn().mockImplementation(() => ({
      canActivate: jest.fn().mockReturnValue(true),
    }));

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response;

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: GoogleOAuth2Guard, useValue: mockGoogleOAuth2Guard },
        { provide: GitHubOAuth2Guard, useValue: mockGitHubOAuth2Guard },
        { provide: YandexOAuth2Guard, useValue: mockYandexOAuth2Guard },
      ],
    }).compile();

    authController = testingModule.get<AuthController>(AuthController);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
    googleOAuth2Guard = testingModule.get<jest.Mocked<GoogleOAuth2Guard>>(GoogleOAuth2Guard);
    githubOAuth2Guard = testingModule.get<jest.Mocked<GitHubOAuth2Guard>>(GitHubOAuth2Guard);
    yandexOAuth2Guard = testingModule.get<jest.Mocked<YandexOAuth2Guard>>(YandexOAuth2Guard);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(authController).toBeDefined();
  });

  describe("localSignUp", (): void => {
    it("should call authService.localSignUp with valid parameters", async (): Promise<void> => {
      const dto: LocalSignUpDto = {
        username: user.username as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        email: user.email,
        avatarUrl: user.avatarUrl as string,
        password: "Test1234!_",
      };

      await authController.localSignUp(dto);

      expect(authService.localSignUp).toHaveBeenCalledWith(dto);
    });

    it("should call authService.localSignUp without optional parameters", async (): Promise<void> => {
      const dto: LocalSignUpDto = {
        username: user.username as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        email: user.email,
        avatarUrl: user.avatarUrl as string,
        password: "Test1234!_",
      };

      const dtoWithoutOptionalFields: LocalSignUpDto = Object.assign({}, dto);
      delete dtoWithoutOptionalFields.avatarUrl;
      delete dtoWithoutOptionalFields.firstName;
      delete dtoWithoutOptionalFields.lastName;

      await authController.localSignUp(dtoWithoutOptionalFields);

      expect(authService.localSignUp).toHaveBeenCalledWith(dtoWithoutOptionalFields);
    });
  });

  describe("localEmailVerification", (): void => {
    it("should set cookie and send 200 on success", async (): Promise<void> => {
      const dto: LocalEmailVerificationDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }),
      };
      const accessToken = randomValidJwt({
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
        jwti: uuidv4(),
      });

      authService.localEmailVerification.mockResolvedValue(accessToken);

      await authController.localEmailVerification(dto, mockResponse as Response);

      expect(authService.localEmailVerification).toHaveBeenCalledWith(dto);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should throw error on failure", async (): Promise<void> => {
      const dto: LocalEmailVerificationDto = { token: "invalid-jwt-token" };
      const error = new UnauthorizedException("Invalid token");

      authService.localEmailVerification.mockRejectedValue(error);

      await expect(authController.localEmailVerification(dto, mockResponse as Response)).rejects.toThrow(error);

      expect(setCookie).not.toHaveBeenCalled();
    });
  });

  describe("localSignIn", (): void => {
    it("should set cookie and send 200 on success", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const dto: LocalSignInDto = { login: user.username as string, password: "Test1234!_" };
      const accessToken = randomValidJwt({
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
        jwti: uuidv4(),
      });

      authService.signIn.mockResolvedValue(accessToken);

      await authController.localSignIn(req, dto, mockResponse as Response);

      expect(authService.signIn).toHaveBeenCalledWith(user, AuthenticationProvider.LOCAL);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("localPasswordResetRequest", (): void => {
    it("should call authService.localPasswordResetRequest and return 200", async (): Promise<void> => {
      const dto: LocalPasswordResetRequestDto = { email: user.email };

      await authController.localPasswordResetRequest(dto, mockResponse as Response);

      expect(authService.localPasswordResetRequest).toHaveBeenCalledWith(dto);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("localPasswordResetConfirm", (): void => {
    it("should call authService.localPasswordResetConfirm and return 200", async (): Promise<void> => {
      const dto: LocalPasswordResetConfirmDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }, { expiresIn: "15m" }),
        password: "Test1234!_new",
      };

      await authController.localPasswordResetConfirm(dto, mockResponse as Response);

      expect(authService.localPasswordResetConfirm).toHaveBeenCalledWith(dto);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("localReactivationConfirm", (): void => {
    it("should call authService.localReactivationConfirm and return 200", async (): Promise<void> => {
      const dto: LocalReactivationConfirmDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }, { expiresIn: "15m" }),
      };

      await authController.localReactivationConfirm(dto, mockResponse as Response);

      expect(authService.localReactivationConfirm).toHaveBeenCalledWith(dto);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("localRestorationConfirm", (): void => {
    it("should call authService.localRestorationConfirm and return 200", async (): Promise<void> => {
      const dto: LocalRestorationConfirmDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }, { expiresIn: "15m" }),
      };

      await authController.localRestorationConfirm(dto, mockResponse as Response);

      expect(authService.localRestorationConfirm).toHaveBeenCalledWith(dto);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("signOut", (): void => {
    it("should call authService, clear cookie, and return 200", async (): Promise<void> => {
      const req = { tokenPayload: { userId: user.id, provider: "local", jwti: uuidv4() } } as RequestWithTokenPayload;

      await authController.signOut(req, mockResponse as Response);

      expect(authService.signOut).toHaveBeenCalledWith(req.tokenPayload);
      expect(clearCookie).toHaveBeenCalledWith(mockResponse, "accessToken");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("refreshAccessToken", (): void => {
    it("should refresh accessToken from cookie", async (): Promise<void> => {
      const req = {
        signedCookies: {
          accessToken: randomValidJwt(
            { userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: uuidv4() },
            {
              notBefore: Math.floor(Date.now() / 1000) + 30, // only after 30 seconds from now this token will be valid;
            },
          ),
        },
        headers: {},
      } as unknown as RequestWithSignedCookies & { headers: { authorization: string | undefined } };
      const tokenData = {
        accessToken: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: uuidv4() }),
      };

      authService.refreshAccessToken.mockResolvedValue(tokenData);

      await authController.refreshAccessToken(req, mockResponse as Response);

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(req.signedCookies.accessToken);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", tokenData.accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if no accessToken is provided", async (): Promise<void> => {
      const req = { signedCookies: {}, headers: {} } as unknown as RequestWithSignedCookies & {
        headers: { authorization: string | undefined };
      };

      await expect(authController.refreshAccessToken(req, mockResponse as Response)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(authService.refreshAccessToken).not.toHaveBeenCalled();
      expect(setCookie).not.toHaveBeenCalled();
    });
  });

  describe("me", (): void => {
    it("should return user profile (test during local authentication)", async (): Promise<void> => {
      const req = { tokenPayload: { userId: user.id, provider: "local", jwti: uuidv4() } } as RequestWithTokenPayload;
      const profile: Partial<UserEntity> = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      authService.retrieveProfile.mockResolvedValue(profile);

      const result: Partial<UserEntity> = await authController.me(req);

      expect(authService.retrieveProfile).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(profile);
    });
  });

  describe("googleSignIn", (): void => {
    it("should return void and let GoogleOAuth2Guard handle the redirect", async (): Promise<void> => {
      const result: void = await authController.googleSignIn();

      expect(result).toBeUndefined();
      expect(googleOAuth2Guard).toBeDefined();
    });
  });

  describe("googleRedirect", (): void => {
    it("should sign in with Google provider, set cookie and send 200 on success", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const accessToken = randomValidJwt({
        userId: user.id,
        provider: AuthenticationProvider.GOOGLE,
        jwti: uuidv4(),
      });

      authService.signIn.mockResolvedValue(accessToken);

      await authController.googleRedirect(req, mockResponse as Response);

      expect(authService.signIn).toHaveBeenCalledWith(user, AuthenticationProvider.GOOGLE);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("githubSignIn", (): void => {
    it("should return void and let GitHubOAuth2Guard handle the redirect", async (): Promise<void> => {
      const result: void = await authController.githubSignIn();

      expect(result).toBeUndefined();
      expect(githubOAuth2Guard).toBeDefined();
    });
  });

  describe("githubRedirect", (): void => {
    it("should sign in with GitHub provider, set cookie and redirect to home on success", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const accessToken = randomValidJwt({
        userId: user.id,
        provider: AuthenticationProvider.GITHUB,
        jwti: uuidv4(),
      });

      authService.signIn.mockResolvedValue(accessToken);

      await authController.githubRedirect(req, mockResponse as Response);

      expect(authService.signIn).toHaveBeenCalledWith(user, AuthenticationProvider.GITHUB);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("yandexSignIn", (): void => {
    it("should return void and let YandexOAuth2Guard handle the redirect", async (): Promise<void> => {
      const result: void = await authController.yandexSignIn();

      expect(result).toBeUndefined();
      expect(yandexOAuth2Guard).toBeDefined();
    });
  });

  describe("yandexRedirect", (): void => {
    it("should sign in with Yandex provider, set cookie and send 200 on success", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const accessToken = randomValidJwt({
        userId: user.id,
        provider: AuthenticationProvider.YANDEX,
        jwti: uuidv4(),
      });

      authService.signIn.mockResolvedValue(accessToken);

      await authController.yandexRedirect(req, mockResponse as Response);

      expect(authService.signIn).toHaveBeenCalledWith(user, AuthenticationProvider.YANDEX);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", accessToken);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });
});
