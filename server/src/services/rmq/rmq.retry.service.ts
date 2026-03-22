import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { Channel } from "amqplib";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

@Injectable()
export default class RmqRetryService {
  private readonly logger: LoggerService;
  private readonly configService: ConfigService;

  private readonly mainQueue: string;
  private readonly retryQueue: string;
  private readonly maxRetriesCount: number;
  private readonly baseDelayMs: number;

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

  private async sendToRetryQueue(channel: Channel) {}

  private async sendToDeadQueue(channel: Channel) {}
}
