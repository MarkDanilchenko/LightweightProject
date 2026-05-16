/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailConsumer from "#server/services/rmq/rmq.email.consumer";
import RmqEmailService from "#server/services/rmq/rmq.email.service";
import { RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalReactivationEvent,
  EventName,
  UserDeactivatedEvent,
  UserDeletedEvent,
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
  let mockChannel: { ack: jest.Mock; nack: jest.Mock };
  let mockMessage: { content: Buffer; properties: object; headers: object };
  let mockRmqContext: { getChannelRef: () => typeof mockChannel; getMessage: () => typeof mockMessage };
  let rmqEmailConsumer: RmqEmailConsumer;
  let rmqEmailService: jest.Mocked<RmqEmailService>;
  let rmqRetryService: jest.Mocked<RmqRetryService>;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    mockChannel = { ack: jest.fn(), nack: jest.fn() };
    mockMessage = { content: Buffer.from("test"), properties: {}, headers: {} };
    mockRmqContext = {
      getChannelRef: () => mockChannel,
      getMessage: () => mockMessage,
    };

    user = buildUserFactory();
    authentication = buildAuthenticationFactory({ userId: user.id });

    const mockRmqEmailService = {
      sendEmailVerification: jest.fn(),
      sendPasswordReset: jest.fn(),
      sendReactivation: jest.fn(),
      sendUserDeactivatedNotification: jest.fn(),
      sendUserDeletedNotification: jest.fn(),
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

    beforeEach((): void => {
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
      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendEmailVerification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should call processFailedMessage if sending email fails", async (): Promise<void> => {
      const testError = new Error("Failed to send email");
      rmqEmailService.sendEmailVerification.mockRejectedValueOnce(testError);

      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendEmailVerification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe("handleAuthLocalPasswordReset", (): void => {
    let payload: AuthLocalPasswordResetEvent;

    beforeEach((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };
    });

    it("should send a password reset email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendPasswordReset).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should call processFailedMessage if sending email fails", async (): Promise<void> => {
      const testError = new Error("Failed to send email");
      rmqEmailService.sendPasswordReset.mockRejectedValueOnce(testError);

      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendPasswordReset).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe("handleUserDeactivated", (): void => {
    let payload: UserDeactivatedEvent;

    beforeEach((): void => {
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
      await rmqEmailConsumer.handleUserDeactivated(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendUserDeactivatedNotification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should call processFailedMessage if sending email fails", async (): Promise<void> => {
      const testError = new Error("Failed to send email");
      rmqEmailService.sendUserDeactivatedNotification.mockRejectedValueOnce(testError);

      await rmqEmailConsumer.handleUserDeactivated(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendUserDeactivatedNotification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe("handleAuthLocalReactivation", (): void => {
    let payload: AuthLocalReactivationEvent;

    beforeEach((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_REACTIVATION,
        userId: user.id,
        modelId: user.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };
    });

    it("should send a reactivation request email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalReactivation(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendReactivation).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should call processFailedMessage if sending email fails", async (): Promise<void> => {
      const testError = new Error("Failed to send email");
      rmqEmailService.sendReactivation.mockRejectedValueOnce(testError);

      await rmqEmailConsumer.handleAuthLocalReactivation(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendReactivation).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe("handleUserDeleted", (): void => {
    let payload: UserDeletedEvent;

    beforeEach((): void => {
      payload = {
        name: EventName.USER_DELETED,
        userId: user.id,
        modelId: user.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };
    });

    it("should send a user deleted email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleUserDeleted(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendUserDeletedNotification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).not.toHaveBeenCalled();
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should call processFailedMessage if sending email fails", async (): Promise<void> => {
      const testError = new Error("Failed to send email");
      rmqEmailService.sendUserDeletedNotification.mockRejectedValueOnce(testError);

      await rmqEmailConsumer.handleUserDeleted(payload, mockRmqContext as unknown as RmqContext);

      expect(rmqEmailService.sendUserDeletedNotification).toHaveBeenCalledWith(payload);
      expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });
  });

  describe("eventsHandler", (): void => {
    describe("for EventName.USER_DELETED", (): void => {
      it("should call sendUserDeletedNotification and ack the message", async (): Promise<void> => {
        const payload: UserDeletedEvent = {
          name: EventName.USER_DELETED,
          userId: user.id,
          modelId: user.id,
          metadata: {
            username: user.username,
            email: user.email,
          },
        };

        await rmqEmailConsumer.handleUserDeleted(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendUserDeletedNotification).toHaveBeenCalledWith(payload);
        expect(mockChannel.ack).toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });

    describe("for EventName.USER_DEACTIVATED", (): void => {
      it("should call sendUserDeactivatedNotification and ack the message", async (): Promise<void> => {
        const payload: UserDeactivatedEvent = {
          name: EventName.USER_DEACTIVATED,
          userId: user.id,
          modelId: user.id,
          metadata: {
            username: user.username,
            email: user.email,
          },
        };

        await rmqEmailConsumer.handleUserDeactivated(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendUserDeactivatedNotification).toHaveBeenCalledWith(payload);
        expect(mockChannel.ack).toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });

    describe("for EventName.AUTH_LOCAL_REACTIVATION", (): void => {
      it("should call sendReactivation and ack the message", async (): Promise<void> => {
        const payload: AuthLocalReactivationEvent = {
          name: EventName.AUTH_LOCAL_REACTIVATION,
          userId: user.id,
          modelId: user.id,
          metadata: {
            username: user.username,
            email: user.email,
          },
        };

        await rmqEmailConsumer.handleAuthLocalReactivation(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendReactivation).toHaveBeenCalledWith(payload);
        expect(mockChannel.ack).toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });

    describe("for EventName.AUTH_LOCAL_PASSWORD_RESET", (): void => {
      it("should call sendPasswordReset and ack the message", async (): Promise<void> => {
        const payload: AuthLocalPasswordResetEvent = {
          name: EventName.AUTH_LOCAL_PASSWORD_RESET,
          userId: user.id,
          modelId: authentication.id,
          metadata: {
            username: user.username,
            email: user.email,
          },
        };

        await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendPasswordReset).toHaveBeenCalledWith(payload);
        expect(mockChannel.ack).toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });

    describe("for EventName.AUTH_LOCAL_CREATED", (): void => {
      it("should call sendEmailVerification and ack the message", async (): Promise<void> => {
        const payload: AuthLocalCreatedEvent = {
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

        await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendEmailVerification).toHaveBeenCalledWith(payload);
        expect(mockChannel.ack).toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });

    describe("when email service throws an error", (): void => {
      it("should call processFailedMessage and not ack the message", async (): Promise<void> => {
        const testError = new Error("Email service error");
        const payload: UserDeletedEvent = {
          name: EventName.USER_DELETED,
          userId: user.id,
          modelId: user.id,
          metadata: {
            username: user.username,
            email: user.email,
          },
        };

        rmqEmailService.sendUserDeletedNotification.mockRejectedValueOnce(testError);

        await rmqEmailConsumer.handleUserDeleted(payload, mockRmqContext as unknown as RmqContext);

        expect(rmqEmailService.sendUserDeletedNotification).toHaveBeenCalledWith(payload);
        expect(rmqRetryService.processFailedMessage).toHaveBeenCalledWith(mockChannel, mockMessage, testError);
        expect(mockChannel.ack).not.toHaveBeenCalled();
        expect(mockChannel.nack).not.toHaveBeenCalled();
      });
    });
  });
});
