import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { Channel } from "amqplib";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

@Injectable()
export default class RmqRetryService {
  private readonly logger: LoggerService;
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.logger = new Logger(RmqRetryService.name);
    this.configService = configService;
  }

  /**
   * Processes a failed message by implementing retry logic with dead letter queue support.
   *
   * @param {Channel} channel - RabbitMQ channel instance for message operations;
   * @param {Record<string, any>} originalMsg - The original message;
   * @param {Error} consumerError - The error that occurred in consumer during message processing;
   *
   * @returns {Promise<void>} Resolves when the message is processed;
   */
  async processFailedMessage(channel: Channel, originalMsg: Record<string, any>, consumerError: Error): Promise<void> {
    try {
      const maxRetriesCount = this.configService.get<
        AppConfiguration["rabbitmqConfiguration"]["mainQueueOptions"]["maxRetriesCount"]
      >("rabbitmqConfiguration.mainQueueOptions.maxRetriesCount")!;

      const headers: Record<string, any> = originalMsg.headers || {};
      const retryCount: number =
        typeof headers["x-retry-count"] === "string"
          ? parseInt(headers["x-retry-count"])
          : headers["x-retry-count"] || 0;

      if (retryCount >= maxRetriesCount) {
        await this.sendToDeadQueue(channel);
      } else {
        await this.sendToRetryQueue(channel);
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
