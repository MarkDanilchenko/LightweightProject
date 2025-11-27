import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
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
   * Handle the AUTH_LOCAL_EMAIL_VERIFICATION_SENT event.
   * This event is emitted by the local authentication service when a user's email address verification is sent.
   * It contains the user's metadata and is used to create a new event in database for the account history purpose.
   *
   * @param {AuthLocalEmailVerificationSentEvent} payload - The events payload containing the user's metadata.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been handled.
   */
  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT)
  async handleAuthLocalEmailVerificationSent(
    payload: AuthLocalEmailVerificationSentEvent,
    manager?: EntityManager,
  ): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }

  /**
   * Handle the AUTH_LOCAL_EMAIL_VERIFIED event.
   * This event is emitted by the local authentication service when a user's email address is verified.
   * It contains the user's metadata and is used to create a new event in database for the account history purpose.
   *
   * @param {AuthLocalEmailVerifiedEvent} payload - The events payload containing the user's metadata.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been handled.
   */
  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFIED)
  async handleAuthLocalEmailVerified(payload: AuthLocalEmailVerifiedEvent, manager?: EntityManager): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }

  /**
   * Handle the AUTH_LOCAL_PASSWORD_RESET_SENT event.
   * This event is emitted by the local authentication service when a password reset email is sent.
   * It contains the user's metadata and is used to create a new event in database for the account history purpose.
   *
   * @param {AuthLocalPasswordResetSentEvent} payload - The events payload containing the user's metadata.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been handled.
   */
  @OnEvent(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT)
  async handleAuthLocalPasswordResetSent(
    payload: AuthLocalPasswordResetSentEvent,
    manager?: EntityManager,
  ): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }
}
