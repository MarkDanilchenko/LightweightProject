/* eslint-disable @typescript-eslint/unbound-method */
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

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
  }),
}));

describe("RmqEmailConsumer", (): void => {
  const mockChannel = { ack: jest.fn(), nack: jest.fn() };
  const mockRmqContext = {
    getChannelRef: () => mockChannel,
    getMessage: () => jest.fn().mockImplementation((): void => {}),
  } as unknown as RmqContext;
  let rmqEmailConsumer: RmqEmailConsumer;
  let rmqEmailService: jest.Mocked<RmqEmailService>;
  let logger: jest.SpyInstance;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFakeFactory();
    authentication = buildAuthenticationFakeFactory({ userId: user.id });

    const mockRmqEmailService = {
      sendWelcomeVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [RmqEmailConsumer],
      providers: [{ provide: RmqEmailService, useValue: mockRmqEmailService }],
    }).compile();

    rmqEmailConsumer = testingModule.get<RmqEmailConsumer>(RmqEmailConsumer);
    rmqEmailService = testingModule.get<jest.Mocked<RmqEmailService>>(RmqEmailService);

    logger = jest.spyOn(Logger.prototype, "error").mockImplementation((): void => {});
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
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendWelcomeVerificationEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(rmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
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
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(rmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });
  });
});
