/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailConsumer from "#server/services/rmq/rmq.email.consumer";
import RmqEmailService from "#server/services/rmq/rmq.email.service";
import { RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
  UserDeactivatedEvent,
} from "#server/events/interfaces/events.interfaces";
import UserEntity from "#server/users/users.entity";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import AuthenticationEntity from "#server/auth/auth.entity";
import RmqRetryService from "#server/services/rmq/rmq.retry.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
  }),
}));

// Mock the app configuration to provide complete configuration for tests
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

describe("RmqEmailConsumer", (): void => {
  const mockChannel = { ack: jest.fn(), nack: jest.fn() };
  const mockMessage = { content: Buffer.from("test"), properties: {}, headers: {} };
  const mockRmqContext = {
    getChannelRef: () => mockChannel,
    getMessage: () => mockMessage,
  } as unknown as RmqContext;
  let rmqEmailConsumer: RmqEmailConsumer;
  let rmqEmailService: jest.Mocked<RmqEmailService>;
  let rmqRetryService: jest.Mocked<RmqRetryService>;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({ userId: user.id });

    const mockRmqEmailService = {
      sendWelcomeVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      sendDeactivatedEmail: jest.fn(),
    };

    const mockRmqRetryService = {
      processFailedMessage: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [RmqEmailConsumer],
      providers: [
        { provide: RmqEmailService, useValue: mockRmqEmailService },
        { provide: RmqRetryService, useValue: mockRmqRetryService },
      ],
    }).compile();

    rmqEmailConsumer = testingModule.get<RmqEmailConsumer>(RmqEmailConsumer);
    rmqEmailService = testingModule.get<jest.Mocked<RmqEmailService>>(RmqEmailService);
    rmqRetryService = testingModule.get<jest.Mocked<RmqRetryService>>(RmqRetryService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqEmailConsumer).toBeDefined();
  });

  describe("handleAuthLocalCreated", (): void => {
    let payload: AuthLocalCreatedEvent;

    beforeAll((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_CREATED,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
        },
      };
    });

    it("should send a welcome verification email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(rmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendWelcomeVerificationEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(rmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(
        mockChannel,
        mockRmqContext.getMessage(),
        new Error("Failed to send email"),
      );
    });
  });

  describe("handleAuthLocalPasswordReset", (): void => {
    let payload: AuthLocalPasswordResetEvent;

    beforeAll((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET,
        userId: user.id,
        modelId: authentication.id,
        username: user.username,
        email: user.email,
      };
    });

    it("should send a password reset email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(rmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(rmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(
        mockChannel,
        mockRmqContext.getMessage(),
        new Error("Failed to send email"),
      );
    });
  });

  describe("handleUserDeactivated", (): void => {
    let payload: UserDeactivatedEvent;

    beforeAll((): void => {
      payload = {
        name: EventName.USER_DEACTIVATED,
        userId: user.id,
        modelId: user.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };
    });

    it("should send a deactivation email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleUserDeactivated(payload, mockRmqContext);

      expect(rmqEmailService.sendDeactivatedEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendDeactivatedEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleUserDeactivated(payload, mockRmqContext);

      expect(rmqEmailService.sendDeactivatedEmail).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(
        mockChannel,
        mockRmqContext.getMessage(),
        new Error("Failed to send email"),
      );
    });
  });
});
