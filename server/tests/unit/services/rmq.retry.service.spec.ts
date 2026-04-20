/* eslint-disable @typescript-eslint/unbound-method */
import RmqRetryService from "#server/services/rmq/rmq.retry.service";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { Channel } from "amqplib";

describe("RmqRetryService", (): void => {
  let rmqRetryService: RmqRetryService;
  let configService: jest.Mocked<ConfigService>;
  let channel: jest.Mocked<Channel>;

  const mainQueueOptions = {
    maxRetriesCount: 5,
    baseDelayMs: 1000,
    queue: "main-queue",
  };

  const buildMsg = (overrides?: Partial<Record<string, any>>): any => ({
    content: Buffer.from("test"),
    fields: expect.any(Object),
    properties: {
      headers: {},
    },
    ...overrides,
  });

  beforeEach(async (): Promise<void> => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case "rabbitmqConfiguration.mainQueueOptions.maxRetriesCount": {
            return mainQueueOptions.maxRetriesCount;
          }

          case "rabbitmqConfiguration.mainQueueOptions.baseDelayMs": {
            return mainQueueOptions.baseDelayMs;
          }

          case "rabbitmqConfiguration.options": {
            return { queue: mainQueueOptions.queue };
          }

          default:
            return undefined;
        }
      }),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [RmqRetryService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    rmqRetryService = testingModule.get<RmqRetryService>(RmqRetryService);
    configService = testingModule.get<jest.Mocked<ConfigService>>(ConfigService);

    channel = {
      ack: jest.fn(),
      nack: jest.fn(),
      sendToQueue: jest.fn(),
    } as unknown as jest.Mocked<Channel>;
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqRetryService).toBeDefined();
  });

  describe("processFailedMessage", (): void => {
    it("should send message to retry queue and ack original message when retriesCount is less than max", (): void => {
      const originalMsg = buildMsg({ headers: { "x-retry-count": 0 } });
      const error = new Error("Consumer failed");

      // Cast to any to bypass type checking, because these methods are private;
      const spyRetry = jest.spyOn(rmqRetryService as any, "sendToRetryQueue");
      const spyDead = jest.spyOn(rmqRetryService as any, "sendToDeadQueue");

      rmqRetryService.processFailedMessage(channel, originalMsg, error);

      expect(spyRetry).toHaveBeenCalledWith(channel, originalMsg, 0, error);
      expect(spyDead).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(originalMsg);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it("should parse retriesCount from string header and send to retry queue", (): void => {
      const msg = buildMsg({ headers: { "x-retry-count": "3" } });
      const error = new Error("Consumer failed");

      // Cast to any to bypass type checking, because these methods are private;
      const spyRetry = jest.spyOn(rmqRetryService as any, "sendToRetryQueue");

      rmqRetryService.processFailedMessage(channel, msg, error);

      expect(spyRetry).toHaveBeenCalledWith(channel, msg, 3, error);
      expect(channel.ack).toHaveBeenCalledWith(msg);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it("should send message to dead letter queue and ack original message when retriesCount reaches max", (): void => {
      const msg = buildMsg({ headers: { "x-retry-count": 5 } });
      const error = new Error("Consumer failed");

      // Cast to any to bypass type checking, because these methods are private;
      const spyRetry = jest.spyOn(rmqRetryService as any, "sendToRetryQueue");
      const spyDead = jest.spyOn(rmqRetryService as any, "sendToDeadQueue");

      rmqRetryService.processFailedMessage(channel, msg, error);

      expect(spyDead).toHaveBeenCalledWith(channel, msg, error);
      expect(spyRetry).not.toHaveBeenCalled();
      expect(channel.ack).toHaveBeenCalledWith(msg);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it("should nack original message without requeue if internal error occurs", (): void => {
      const msg = buildMsg({ headers: { "x-retry-count": 0 } });
      const error = new Error("Consumer failed");

      jest.spyOn(rmqRetryService as any, "sendToRetryQueue").mockImplementation((): void => {
        throw new Error("Internal error");
      });
      const loggerErrorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(jest.fn());

      rmqRetryService.processFailedMessage(channel, msg, error);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
      expect(channel.ack).not.toHaveBeenCalled();
    });
  });

  describe("sendToRetryQueue", (): void => {
    it("should send message to retry queue with updated headers and expiration", (): void => {
      const originalMsg = buildMsg({
        properties: {
          headers: {},
        },
      });
      const retriesCount = 2;
      const error = new Error("Consumer failed");

      const spyLoggerWarn = jest.spyOn(Logger.prototype, "warn").mockImplementation(jest.fn());

      // Cast to any to bypass type checking, because these methods are private;
      (rmqRetryService as any).sendToRetryQueue(channel, originalMsg, retriesCount, error);

      const expectedExpiration = (mainQueueOptions.baseDelayMs + Math.pow(2, retriesCount)).toString();

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        `${mainQueueOptions.queue}-retry`,
        originalMsg.content,
        expect.objectContaining({
          expiration: expectedExpiration,
          headers: expect.objectContaining({
            "x-retry-count": retriesCount + 1,
            "x-retry-error": error.message,
          }),
        }),
      );

      expect(spyLoggerWarn).toHaveBeenCalled();
    });
  });

  describe("sendToDeadQueue", (): void => {
    it("should send message to dead letter queue with dead-letter header and expiration 0", (): void => {
      const originalMsg = buildMsg({
        properties: {
          headers: {},
        },
      });
      const error = new Error("Consumer failed");

      const spyLoggerWarn = jest.spyOn(Logger.prototype, "warn").mockImplementation(jest.fn());

      // Cast to any to bypass type checking, because these methods are private;
      (rmqRetryService as any).sendToDeadQueue(channel, originalMsg, error);

      expect(channel.sendToQueue).toHaveBeenCalledTimes(1);
      expect(channel.sendToQueue).toHaveBeenCalledWith(
        `${mainQueueOptions.queue}-dead`,
        originalMsg.content,
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-dead-letter-error": error.message,
          }),
        }),
      );

      expect(spyLoggerWarn).toHaveBeenCalled();
    });
  });
});
