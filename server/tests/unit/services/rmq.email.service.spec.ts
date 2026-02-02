/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from "node:fs";
import * as ejs from "ejs";
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailService from "@server/services/rmq/rmq.email.service";
import { ConfigService } from "@nestjs/config";
import { DataSource, QueryRunner } from "typeorm";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import TokensService from "@server/tokens/tokens.service";
import AuthService from "@server/auth/auth.service";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import transporter from "@server/utils/nodemailer";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

// Mock the nodemailer createTransport before import both RmqEmailConsumer and RmqEmailService;
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
    sendMail: jest.fn(),
  }),
}));

describe("RmqEmailService", (): void => {
  let rmqEmailService: RmqEmailService;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;
  let eventsService: jest.Mocked<EventsService>;
  let eventEmitter2: jest.Mocked<EventEmitter2>;
  let tokensService: jest.Mocked<TokensService>;
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

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        RmqEmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: { createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner) } },
        { provide: EventsService, useValue: mockEventsService },
        { provide: EventEmitter2, useValue: mockEventEmitter2 },
        { provide: TokensService, useValue: mockTokensService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    rmqEmailService = testingModule.get<RmqEmailService>(RmqEmailService);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
    eventsService = testingModule.get<jest.Mocked<EventsService>>(EventsService);
    eventEmitter2 = testingModule.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
    tokensService = testingModule.get<jest.Mocked<TokensService>>(TokensService);
    authService = testingModule.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqEmailService).toBeDefined();
  });

  describe("sendWelcomeVerificationEmail", (): void => {
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
      jest.spyOn(ejs, "renderFile").mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      authService.findAuthenticationByPk.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValue("test_token:QEexS0H");
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a welcome verification email successfully", async (): Promise<void> => {
      await rmqEmailService.sendWelcomeVerificationEmail(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      expect(tokensService.generate).toHaveBeenCalled();
      expect(ejs.renderFile).toHaveBeenCalled();
      expect(authService.updateAuthentication).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      authService.findAuthenticationByPk.mockResolvedValue(null);

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow(
        `Email verification: Authentication not found`,
      );
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("sendPasswordResetEmail", (): void => {
    const user: UserEntity = buildUserFactory();
    const authentication: AuthenticationEntity = buildAuthenticationFactory({ userId: user.id });
    const payload: AuthLocalPasswordResetEvent = {
      name: EventName.AUTH_LOCAL_PASSWORD_RESET,
      userId: user.id,
      modelId: authentication.id,
      username: user.username,
      email: user.email,
    };

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      jest.spyOn(ejs, "renderFile").mockResolvedValue(testHtml);
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);

      authService.findAuthenticationByPk.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValue("test_token:feU9xe3JxW");
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should send a password reset email successfully", async (): Promise<void> => {
      await rmqEmailService.sendPasswordResetEmail(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      expect(tokensService.generate).toHaveBeenCalled();
      expect(tokensService.generate).toHaveBeenCalledWith(
        { userId: user.id, provider: AuthenticationProvider.LOCAL },
        { expiresIn: "15m", secret: authentication.metadata.local?.password },
      );
      expect(ejs.renderFile).toHaveBeenCalled();
      expect(eventEmitter2.emit).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      authService.findAuthenticationByPk.mockResolvedValue(null);

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("Authentication not found");
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("Send mail failed");

      expect(dataSource.createQueryRunner().rollbackTransaction).toHaveBeenCalled();
      expect(dataSource.createQueryRunner().commitTransaction).not.toHaveBeenCalled();
    });
  });
});
