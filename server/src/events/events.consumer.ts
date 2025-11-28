import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalPasswordResetedEvent,
  AuthLocalPasswordResetSentEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import EventsService from "@server/events/events.service";
import { EntityManager } from "typeorm";

@Injectable()
export default class EventsConsumer {
  private readonly eventsService: EventsService;

  constructor(eventsService: EventsService) {
    this.eventsService = eventsService;
  }

  /**
   * Handles an event related to local authentication actions.
   * This method is responsible for processing events from the message queue
   * and delegating them to the appropriate email service methods to create a new event in database for the account history purpose.
   *
   * @param {
   * | AuthLocalEmailVerificationSentEvent
   * | AuthLocalEmailVerifiedEvent
   * | AuthLocalPasswordResetSentEvent
   * | AuthLocalPasswordResetedEvent
   * } payload - The event containing the user's authentication information (email, username, etc).
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been successfully handled.
   */
  @OnEvent([
    EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
    EventName.AUTH_LOCAL_EMAIL_VERIFIED,
    EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
    EventName.AUTH_LOCAL_PASSWORD_RESETED,
  ])
  async handleAuthLocalEvents(
    payload:
      | AuthLocalEmailVerificationSentEvent
      | AuthLocalEmailVerifiedEvent
      | AuthLocalPasswordResetSentEvent
      | AuthLocalPasswordResetedEvent,
    manager?: EntityManager,
  ): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }
}
