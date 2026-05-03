/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from "node:fs";
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailService from "#server/services/rmq/rmq.email.service";
import { ConfigService } from "@nestjs/config";
import { DataSource, QueryRunner } from "typeorm";
import EventsService from "#server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import TokensService from "#server/tokens/tokens.service";
import AuthService from "#server/auth/auth.service";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalReactivationRequestEvent,
  EventName,
  UserDeactivatedEvent,
} from "#server/events/interfaces/events.interfaces";
import UserEntity from "#server/users/users.entity";
import AuthenticationEntity from "#server/auth/auth.entity";
import transporter from "#server/utils/nodemailer";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import UsersService from "#server/users/users.service";

// Mock the nodemailer createTransport before import both RmqEmailConsumer and RmqEmailService;
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
    sendMail: jest.fn(),
  }),
}));

const mockEjsRenderFile = jest.fn();
jest.mock("ejs", () => ({
  renderFile: (...args: any[]) => mockEjsRenderFile(...args),
}));

jest.mock("#server/configs/app.configuration", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    smtpConfiguration: {
      host: "smtp.example.com",
      port: 587,
      username: "tests@example.com",
      password: "tests-password",
      from: "noreply@example.com",
    },
    jwtConfiguration: {
      secret: "c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      accessTokenExpiresIn: "24h",
      refreshTokenExpiresIn: "7d",
    },
    serverConfiguration: {
      host: "127.0.0.1",
      port: 3000,
      swaggerEnabled: false,
      cookieSecret: "c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      commonSecret: "c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      https: false,
      protocol: "http",
      baseUrl: "http://127.0.0.1:3000",
    },
  })),
}));

describe("RmqEmailService", (): void => {
  let rmqEmailService: RmqEmailService;
  let dataSource: jest.Mocked<DataSource>;
  let eventEmitter2: jest.Mocked<EventEmitter2>;
  let tokensService: jest.Mocked<TokensService>;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  const testHtml = "<html><body><h1>Test</h1></body></html>";

  beforeEach(async (): Promise<void> => {
    const mockEventsService = { buildInstance: jest.fn() };
    const mockEventEmitter2 = { emit: jest.fn() };
    const mockTokensService = { generate: jest.fn() };
    const mockAuthService = { findAuthenticationByPk: jest.fn(), updateAuthentication: jest.fn() };
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case "smtpConfiguration":
            return { from: "no-reply@LightweightProject" };

          case "serverConfiguration":
            return { baseUrl: "https://127.0.0.1:3000" };

          case "clientConfiguration":
            return { baseUrl: "https://127.0.0.1:3001" };

          default:
            return undefined;
        }
      }),
    };
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {},
    } as unknown as QueryRunner;
    const mockUsersService = { findUserByPk: jest.fn(), findUser: jest.fn(), updateUser: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        RmqEmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
        { provide: EventsService, useValue: mockEventsService },
        { provide: EventEmitter2, useValue: mockEventEmitter2 },
        { provide: TokensService, useValue: mockTokensService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    rmqEmailService = testingModule.get<RmqEmailService>(RmqEmailService);
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
    eventEmitter2 = testingModule.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
    tokensService = testingModule.get<jest.Mocked<TokensService>>(TokensService);
    usersService = testingModule.get<jest.Mocked<UsersService>>(UsersService);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqEmailService).toBeDefined();
  });

  describe("sendEmailVerification", (): void => {
    const user: UserEntity = buildUserFactory();
    const authentication: AuthenticationEntity = buildAuthenticationFactory({ userId: user.id });
    const payload: AuthLocalCreatedEvent = {
      name: EventName.AUTH_LOCAL_CREATED,
      userId: user.id,
      modelId: authentication.id,
      metadata: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        email: user.email,
      },
    };

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      mockEjsRenderFile.mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      authService.findAuthenticationByPk.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValue("test_token:QEexS0H");
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a welcome verification email successfully", async (): Promise<void> => {
      await rmqEmailService.sendEmailVerification(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      expect(tokensService.generate).toHaveBeenCalled();
      expect(mockEjsRenderFile).toHaveBeenCalled();
      expect(authService.updateAuthentication).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendEmailVerification(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      authService.findAuthenticationByPk.mockResolvedValue(null);

      await expect(rmqEmailService.sendEmailVerification(payload)).rejects.toThrow(
        `Email verification: Authentication not found`,
      );
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendEmailVerification(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("sendPasswordReset", (): void => {
    const user: UserEntity = buildUserFactory();
    const authentication: AuthenticationEntity = buildAuthenticationFactory({ userId: user.id });
    const payload: AuthLocalPasswordResetEvent = {
      name: EventName.AUTH_LOCAL_PASSWORD_RESET,
      userId: user.id,
      modelId: authentication.id,
      metadata: {
        username: user.username,
        email: user.email,
      },
    };

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      mockEjsRenderFile.mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      authService.findAuthenticationByPk.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValue("test_token:feU9xe3JxW");
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a password reset email successfully", async (): Promise<void> => {
      await rmqEmailService.sendPasswordReset(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      expect(tokensService.generate).toHaveBeenCalled();
      expect(tokensService.generate).toHaveBeenCalledWith(
        { userId: user.id, provider: AuthenticationProvider.LOCAL },
        { expiresIn: "15m", secret: authentication.metadata.local?.password },
      );
      expect(mockEjsRenderFile).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendPasswordReset(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      authService.findAuthenticationByPk.mockResolvedValue(null);

      await expect(rmqEmailService.sendPasswordReset(payload)).rejects.toThrow("Authentication not found");
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendPasswordReset(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("sendUserDeactivatedNotification", (): void => {
    const user: UserEntity = buildUserFactory();
    const payload: UserDeactivatedEvent = {
      name: EventName.USER_DEACTIVATED,
      userId: user.id,
      modelId: user.id,
      metadata: {
        username: user.username,
        email: user.email,
      },
    };

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      mockEjsRenderFile.mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      usersService.findUser.mockResolvedValue(user);
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a deactivation email successfully", async (): Promise<void> => {
      await rmqEmailService.sendUserDeactivatedNotification(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(usersService.findUser).toHaveBeenCalledWith({
        where: [{ id: user.id }, { id: user.id }],
      });
      expect(mockEjsRenderFile).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendUserDeactivatedNotification(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if user not found", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(null);

      await expect(rmqEmailService.sendUserDeactivatedNotification(payload)).rejects.toThrow(
        "Deactivation email: User not found",
      );
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendUserDeactivatedNotification(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("sendReactivationRequest", (): void => {
    const user: UserEntity = buildUserFactory();
    const payload: AuthLocalReactivationRequestEvent = {
      name: EventName.AUTH_LOCAL_REACTIVATION_REQUEST,
      userId: user.id,
      modelId: user.id,
      metadata: {
        username: user.username,
        email: user.email,
      },
    };

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      mockEjsRenderFile.mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      usersService.findUser.mockResolvedValue(user);
      tokensService.generate.mockResolvedValue("test_token:reactivation");
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a reactivation request email successfully", async (): Promise<void> => {
      await rmqEmailService.sendReactivationRequest(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(usersService.findUser).toHaveBeenCalledWith({
        where: [{ id: user.id }, { id: user.id }],
      });
      expect(tokensService.generate).toHaveBeenCalledWith(
        { userId: user.id, provider: AuthenticationProvider.LOCAL },
        { expiresIn: "15m" },
      );
      expect(mockEjsRenderFile).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendReactivationRequest(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if user not found", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(null);

      await expect(rmqEmailService.sendReactivationRequest(payload)).rejects.toThrow(
        "Reactivation request email: User not found",
      );
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendReactivationRequest(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });
});
