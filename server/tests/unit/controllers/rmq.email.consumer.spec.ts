import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailConsumer from "@server/services/rmq/rmq.email.consumer";
import RmqEmailService from "@server/services/rmq/rmq.email.service";
import { RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { Logger } from "@nestjs/common";
import UserEntity from "@server/users/users.entity";
import { buildAuthenticationFakeFactory, buildUserFakeFactory } from "../../factories";
import AuthenticationEntity from "@server/auth/auth.entity";

describe("RmqEmailConsumer", (): void => {
  let consumer: RmqEmailConsumer;
  let logger: jest.SpyInstance;

  const mockRmqEmailService = {
    sendWelcomeVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockRmqContext = {
    getChannelRef: () => mockChannel,
    getMessage: () => jest.fn().mockImplementation((): void => {}),
  } as unknown as RmqContext;

  beforeEach(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [RmqEmailConsumer],
      providers: [
        {
          provide: RmqEmailService,
          useValue: mockRmqEmailService,
        },
      ],
    }).compile();

    consumer = testingModule.get<RmqEmailConsumer>(RmqEmailConsumer);
    logger = jest.spyOn(Logger.prototype, "error").mockImplementation((): void => {});
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(consumer).toBeDefined();
  });

  describe("handleAuthLocalCreated", (): void => {
    let user: UserEntity;
    let authentication: AuthenticationEntity;
    let payload: AuthLocalCreatedEvent;

    beforeAll((): void => {
      user = buildUserFakeFactory();
      authentication = buildAuthenticationFakeFactory({ userId: user.id });

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
      await consumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(mockRmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      mockRmqEmailService.sendWelcomeVerificationEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await consumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(mockRmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });
  });

  describe("handleAuthLocalPasswordReset", (): void => {
    let user: UserEntity;
    let authentication: AuthenticationEntity;
    let payload: AuthLocalPasswordResetEvent;

    beforeAll((): void => {
      user = buildUserFakeFactory();
      authentication = buildAuthenticationFakeFactory({ userId: user.id });

      payload = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET,
        userId: user.id,
        modelId: authentication.id,
        username: user.username,
        email: user.email,
      };
    });

    it("should send a password reset email and ack the message", async (): Promise<void> => {
      await consumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(mockRmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      mockRmqEmailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await consumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(mockRmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });
  });
});
