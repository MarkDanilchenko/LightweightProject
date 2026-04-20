import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { Channel } from "amqplib";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";

@Injectable()
export default class RmqRetryService {
  private readonly logger: LoggerService;
  private readonly configService: ConfigService;

  private readonly maxRetriesCount: number;
  private readonly baseDelayMs: number;
  private readonly mainQueue: string;
  private readonly retryQueue: string;
  private readonly deadQueue: string;

  constructor(configService: ConfigService) {
    this.logger = new Logger(RmqRetryService.name);
    this.configService = configService;

    this.maxRetriesCount = this.configService.get<
      AppConfiguration["rabbitmqConfiguration"]["mainQueueOptions"]["maxRetriesCount"]
    >("rabbitmqConfiguration.mainQueueOptions.maxRetriesCount")!;

    this.baseDelayMs = this.configService.get<
      AppConfiguration["rabbitmqConfiguration"]["mainQueueOptions"]["baseDelayMs"]
    >("rabbitmqConfiguration.mainQueueOptions.baseDelayMs")!;

    const { queue } = this.configService.get<AppConfiguration["rabbitmqConfiguration"]["options"]>(
      "rabbitmqConfiguration.options",
    )!;
    this.mainQueue = queue!;
    this.retryQueue = `${this.mainQueue}-retry`;
    this.deadQueue = `${this.mainQueue}-dead`;
  }

  /**
   * Processes a failed message by implementing retry logic with dead letter queue support.
   *
   * @param {Channel} channel - RabbitMQ channel instance for message operations;
   * @param {Record<string, any>} originalMsg - The original message;
   * @param {Error} consumerError - The error that occurred in consumer during message processing;
   *
   * @returns {void}
   */
  processFailedMessage(channel: Channel, originalMsg: Record<string, any>, consumerError: Error): void {
    try {
      const headers: Record<string, any> = originalMsg.headers || {};
      const retriesCount: number =
        typeof headers["x-retry-count"] === "string"
          ? parseInt(headers["x-retry-count"])
          : headers["x-retry-count"] || 0;

      if (retriesCount >= this.maxRetriesCount) {
        this.sendToDeadQueue(channel, originalMsg, consumerError);
      } else {
        this.sendToRetryQueue(channel, originalMsg, retriesCount, consumerError);
      }

      // Acknowledge the original message, otherwise it could be stalled in the main queue forever;
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error("RmqRetryService ~ processFailedMessage", error);

      // If internal error occurred - reject the message totally without both acknowledging and retrying;
      channel.nack(originalMsg, false, false);
    }
  }

  /**
   * Sends a failed message to the retry queue with exponential backoff delay.
   *
   * @param {Channel} channel - RabbitMQ channel instance for message operations;
   * @param {Record<string, any>} originalMsg - The original message that failed processing;
   * @param {number} retriesCount - Current retry count from message headers;
   * @param {Error} consumerError - The error that occurred during message processing;
   *
   * @returns {void}
   */
  private sendToRetryQueue(
    channel: Channel,
    originalMsg: Record<string, any>,
    retriesCount: number,
    consumerError: Error,
  ): void {
    const nextRetriesCount = retriesCount + 1;
    const nextDelayMs = this.baseDelayMs + Math.pow(2, retriesCount);

    const messageProperties: Record<string, any> = {
      ...originalMsg.properties,
      expiration: nextDelayMs.toString(),
      headers: {
        ...originalMsg.properties.headers,
        "x-retry-count": nextRetriesCount,
        "x-retry-error": consumerError.message,
      },
    };

    channel.sendToQueue(this.retryQueue, originalMsg.content, messageProperties);

    this.logger.warn(
      `Message was sent to retry queue: ${this.retryQueue}` +
        `delay: ${10};` +
        ` attempt: ${retriesCount};` +
        ` reason: ${consumerError.message};`,
    );
  }

  /**
   * Sends a failed message to the dead letter queue after all retry attempts are exhausted.
   *
   * @param {Channel} channel - RabbitMQ channel instance for message operations;
   * @param {Record<string, any>} originalMsg - The original message that failed processing;
   * @param {Error} consumerError - The error that occurred during message processing;
   *
   * @returns {void}
   */
  private sendToDeadQueue(channel: Channel, originalMsg: Record<string, any>, consumerError: Error): void {
    const messageProperties: Record<string, any> = {
      ...originalMsg.properties,
      expiration: null,
      headers: {
        ...originalMsg.properties.headers,
        "x-dead-letter-error": consumerError.message,
      },
    };

    channel.sendToQueue(this.deadQueue, originalMsg.content, messageProperties);

    this.logger.warn(`Message was sent to dead letter queue: ${this.deadQueue}` + ` reason: ${consumerError.message};`);
  }
}
