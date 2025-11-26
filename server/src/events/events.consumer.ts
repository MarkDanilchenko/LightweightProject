import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
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

  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT)
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
  async handleAuthLocalEmailVerificationSent(
    payload: AuthLocalEmailVerificationSentEvent,
    manager?: EntityManager,
  ): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }

  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFIED)
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
  async handleAuthLocalEmailVerified(payload: AuthLocalEmailVerifiedEvent, manager?: EntityManager): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }
}
