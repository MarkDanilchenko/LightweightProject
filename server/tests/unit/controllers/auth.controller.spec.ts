/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import AuthController from "@server/auth/auth.controller";
import AuthService from "@server/auth/auth.service";
import {
  LocalPasswordForgotDto,
  LocalPasswordResetDto,
  LocalSignInDto,
  LocalSignUpDto,
  LocalVerificationEmailDto,
} from "@server/auth/dto/auth.dto";
import { buildUserFactory } from "../../factories";
import UserEntity from "@server/users/users.entity";
import { RequestWithSignedCookies, RequestWithTokenPayload, RequestWithUser } from "@server/common/types/common.types";
import { UnauthorizedException } from "@nestjs/common";
import { setCookie, clearCookie } from "@server/utils/cookie";
import { randomValidJwt } from "../../utils";
import { v4 as uuidv4 } from "uuid";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

jest.mock("@server/utils/cookie", () => ({
  setCookie: jest.fn(),
  clearCookie: jest.fn(),
}));

describe("AuthController", (): void => {
  const user: UserEntity = buildUserFactory();
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Partial<Response>;

  beforeEach(async (): Promise<void> => {
    const mockAuthService = {
      localSignUp: jest.fn(),
      localVerificationEmail: jest.fn(),
      localSignIn: jest.fn(),
      localPasswordForgot: jest.fn(),
      localPasswordReset: jest.fn(),
      signOut: jest.fn(),
      refreshAccessToken: jest.fn(),
      retrieveProfile: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case "serverConfiguration.https": {
            return true;
          }

          case "clientConfiguration.baseUrl": {
            return "https://127.0.0.1:3001";
          }

          default: {
            return null;
          }
        }
      }),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      redirect: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    authController = testingModule.get<AuthController>(AuthController);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
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

  describe("localVerificationEmail", (): void => {
    it("should set cookie and redirect on success", async (): Promise<void> => {
      const dto: LocalVerificationEmailDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }),
      };
      const tokenData = {
        accessToken: randomValidJwt({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          jwti: uuidv4(),
        }),
      };

      authService.localVerificationEmail.mockResolvedValue(tokenData);

      await authController.localVerificationEmail(dto, mockResponse as Response);

      expect(authService.localVerificationEmail).toHaveBeenCalledWith(dto);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", tokenData.accessToken, true);
      expect(mockResponse.redirect).toHaveBeenCalledWith(302, "https://127.0.0.1:3001/home");
    });

    it("should redirect with error on failure", async (): Promise<void> => {
      const dto: LocalVerificationEmailDto = { token: "invalid-jwt-token" };
      const error = new Error("Invalid token");

      authService.localVerificationEmail.mockRejectedValue(error);

      await authController.localVerificationEmail(dto, mockResponse as Response);

      expect(setCookie).not.toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        `https://127.0.0.1:3001/signin?errorMsg=${error.message}`,
      );
    });
  });

  describe("localSignIn", (): void => {
    it("should set cookie and send 200 on success", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const dto: LocalSignInDto = { login: user.username as string, password: "Test1234!_" };
      const tokenData = {
        accessToken: randomValidJwt({
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          jwti: uuidv4(),
        }),
      };

      authService.localSignIn.mockResolvedValue(tokenData);

      await authController.localSignIn(req, dto, mockResponse as Response);

      expect(authService.localSignIn).toHaveBeenCalledWith(user);
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", tokenData.accessToken, true);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should throw an 401 error when accessToken is not retrieved", async (): Promise<void> => {
      const req = { user } as RequestWithUser;
      const dto: LocalSignInDto = { login: user.username as string, password: "Test1234!_" };

      authService.localSignIn.mockResolvedValue({ accessToken: undefined as unknown as string });

      await expect(authController.localSignIn(req, dto, mockResponse as Response)).rejects.toThrow(
        new UnauthorizedException(
          "Authentication failed. " + "Invalid credentials or " + "users not found or " + "email is not verified.",
        ),
      );

      expect(authService.localSignIn).toHaveBeenCalledWith(user);
      expect(setCookie).not.toHaveBeenCalled();
    });
  });

  describe("localPasswordForgot", (): void => {
    it("should call authService.localPasswordForgot and return 200", async (): Promise<void> => {
      const dto: LocalPasswordForgotDto = { email: user.email };

      await authController.localPasswordForgot(dto, mockResponse as Response);

      expect(authService.localPasswordForgot).toHaveBeenCalledWith(dto);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("localPasswordReset", (): void => {
    it("should call authService.localPasswordReset and return 200", async (): Promise<void> => {
      const dto: LocalPasswordResetDto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }, { expiresIn: "15m" }),
        password: "Test1234!_new",
      };

      await authController.localPasswordReset(dto, mockResponse as Response);

      expect(authService.localPasswordReset).toHaveBeenCalledWith(dto);
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
      expect(setCookie).toHaveBeenCalledWith(mockResponse, "accessToken", tokenData.accessToken, true);
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
});
