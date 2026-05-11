import { Controller, Logger, LoggerService } from "@nestjs/common";
import RmqEmailService from "#server/services/rmq/rmq.email.service";
import { Ctx, MessagePattern, Payload, RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalReactivationEvent,
  EventName,
  UserDeactivatedEvent,
  UserDeletedEvent,
} from "#server/events/interfaces/events.interfaces";
import RmqRetryService from "#server/services/rmq/rmq.retry.service";
import { Channel, Message } from "amqplib";

/**
 * Controller that handles incoming RabbitMQ messages for email-related events.
 * This consumer is responsible for processing email-related events from the message queue
 * and delegating them to the appropriate email service methods.
 */
@Controller()
export default class RmqEmailConsumer {
  private readonly logger: LoggerService;
  private readonly rmqEmailService: RmqEmailService;
  private readonly rmqRetryService: RmqRetryService;

  constructor(rmqEmailService: RmqEmailService, rmqRetryService: RmqRetryService) {
    this.logger = new Logger(RmqEmailConsumer.name);
    this.rmqEmailService = rmqEmailService;
    this.rmqRetryService = rmqRetryService;
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
    await this.eventsHandler(payload, context);
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
    await this.eventsHandler(payload, context);
  }

  /**
   * Handles the AUTH_LOCAL_REACTIVATION event from the message queue.
   * This method processes reactivation events by sending a reactivation email
   * to the user who has requested to reactivate their account.
   *
   * @param {AuthLocalReactivationEvent} payload - The event payload containing user details and reactivation metadata
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment
   *
   * @returns {Promise<void>} A promise that resolves when the email is processed
   */
  @MessagePattern(EventName.AUTH_LOCAL_REACTIVATION)
  async handleAuthLocalReactivation(
    @Payload() payload: AuthLocalReactivationEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    await this.eventsHandler(payload, context);
  }

  /**
   * Handles the USER_DEACTIVATED event from the message queue.
   * This method processes user deactivation events by sending an email to notify the user
   * about their profile deactivation completion.
   *
   * @param {UserDeactivatedEvent} payload - The event payload containing user details and deactivation metadata
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment
   *
   * @returns {Promise<void>} A promise that resolves when the email is processed
   */
  @MessagePattern(EventName.USER_DEACTIVATED)
  async handleUserDeactivated(@Payload() payload: UserDeactivatedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.eventsHandler(payload, context);
  }

  /**
   * Handles the USER_DELETED event from the message queue.
   * This method processes user deletion events by sending an email to notify the user
   * about their profile deletion completion.
   *
   * @param {UserDeletedEvent} payload - The event payload containing user details and deletion metadata
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment
   *
   * @returns {Promise<void>} A promise that resolves when the email is processed
   */
  @MessagePattern(EventName.USER_DELETED)
  async handleUserDeleted(@Payload() payload: UserDeletedEvent, @Ctx() context: RmqContext): Promise<void> {
    await this.eventsHandler(payload, context);
  }

  /**
   * Handles events based on the event name.
   * This method calls the appropriate email service methods to send notification emails.
   *
   * @param {
   *   UserDeletedEvent |
   *   UserDeactivatedEvent |
   *   AuthLocalReactivationEvent |
   *   AuthLocalPasswordResetEvent |
   *   AuthLocalCreatedEvent
   * } payload - The event payload containing user information.
   * @param {RmqContext} context - The RabbitMQ context for message acknowledgment.
   *
   * @returns {Promise<void>} A promise that resolves when the email is sent or message is rejected.
   */
  private async eventsHandler(
    payload:
      | UserDeletedEvent
      | UserDeactivatedEvent
      | AuthLocalReactivationEvent
      | AuthLocalPasswordResetEvent
      | AuthLocalCreatedEvent,
    context: RmqContext,
  ): Promise<void> {
    const eventName: EventName = payload.name;
    const channel: Channel = context.getChannelRef();
    const originalMsg = context.getMessage() as Message;

    try {
      switch (eventName) {
        case EventName.USER_DELETED: {
          await this.rmqEmailService.sendUserDeletedNotification(payload);

          break;
        }

        case EventName.USER_DEACTIVATED: {
          await this.rmqEmailService.sendUserDeactivatedNotification(payload);

          break;
        }

        case EventName.AUTH_LOCAL_REACTIVATION: {
          await this.rmqEmailService.sendReactivation(payload);

          break;
        }

        case EventName.AUTH_LOCAL_PASSWORD_RESET: {
          await this.rmqEmailService.sendPasswordReset(payload);

          break;
        }

        case EventName.AUTH_LOCAL_CREATED: {
          await this.rmqEmailService.sendEmailVerification(payload);

          break;
        }
      }

      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error("eventsHandler: " + (error as Error).message);

      this.rmqRetryService.processFailedMessage(channel, originalMsg, error as Error);
    }
  }
}
