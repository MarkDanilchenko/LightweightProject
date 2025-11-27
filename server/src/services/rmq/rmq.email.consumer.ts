import { Controller, Logger, LoggerService } from "@nestjs/common";
import { RmqEmailService } from "@server/services/rmq/rmq.email.service";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";

/**
 * Controller that handles incoming RabbitMQ messages for email-related events.
 * This consumer is responsible for processing email-related events from the message queue
 * and delegating them to the appropriate email service methods.
 */
@Controller()
export class RmqEmailConsumer {
  private readonly logger: LoggerService;
  private readonly rmqEmailService: RmqEmailService;

  constructor(rmqEmailService: RmqEmailService) {
    this.logger = new Logger(RmqEmailConsumer.name);
    this.rmqEmailService = rmqEmailService;
  }

  /**
   * Handles the AUTH_LOCAL_CREATED event from the message queue.
   * This method processes new local authentication events by sending a welcome verification email
   * to the newly registered user with a verification link.
   *
   * @param {AuthLocalCreatedEvent} payload - The event payload containing user details and metadata
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment
   *
   * @returns {Promise<void>} A promise that resolves when the email is processed
   */
  @MessagePattern(EventName.AUTH_LOCAL_CREATED)
  async handleAuthLocalCreated(@Payload() payload: AuthLocalCreatedEvent, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.rmqEmailService.sendWelcomeVerificationEmail(payload);

      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg);

      this.logger.error("🚀 ~ RmqEmailController ~ handleAuthCreatedLocal ~ error:", error);
    }
  }

  /**
   * Handles the AUTH_LOCAL_PASSWORD_RESET event from the message queue.
   * This method processes password reset events by sending a password reset email
   * to the user with a password reset link.
   *
   * @param {AuthLocalPasswordResetEvent} payload - The event payload containing user details and metadata
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment
   *
   * @returns {Promise<void>} A promise that resolves when the email is processed
   */
  @MessagePattern(EventName.AUTH_LOCAL_PASSWORD_RESET)
  async handleAuthLocalPasswordReset(
    @Payload() payload: AuthLocalPasswordResetEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.rmqEmailService.sendPasswordResetEmail(payload);

      channel.ack(originalMsg);
    } catch (error) {
      channel.nack(originalMsg);

      this.logger.error("🚀 ~ RmqEmailController ~ handleAuthLocalPasswordReset ~ error:", error);
    }
  }
}
