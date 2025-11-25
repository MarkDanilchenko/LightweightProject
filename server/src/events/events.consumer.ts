import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  AuthLocalCreatedEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationVerifiedEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { ClientProxy } from "@nestjs/microservices";
import EventsService from "@server/events/events.service";
import { EntityManager } from "typeorm";
import { RMQ_MICROSERVICE } from "@server/constants";

@Injectable()
export default class EventsConsumer {
  private readonly eventsService: EventsService;

  constructor(
    @Inject(RMQ_MICROSERVICE)
    private readonly rmqMicroserviceClient: ClientProxy,
    eventsService: EventsService,
  ) {
    this.eventsService = eventsService;
  }

  // Use `.emit()` for events that do not require a response (fire-and-forget).
  // If needed a response from a microservice - use `.send()'.

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

  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED)
  /**
   * Handle the AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED event.
   * This event is emitted by the local authentication service when a user's email address is verified.
   * It contains the user's metadata and is used to create a new event in database for the account history purpose.
   *
   * @param {AuthLocalEmailVerificationVerifiedEvent} payload - The events payload containing the user's metadata.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been handled.
   */
  async handleAuthLocalEmailVerificationVerified(
    payload: AuthLocalEmailVerificationVerifiedEvent,
    manager?: EntityManager,
  ): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }

  @OnEvent(EventName.AUTH_LOCAL_CREATED)
  /**
   * Handle the AUTH_LOCAL_CREATED event.
   * This event is emitted by the local authentication service when a user is created.
   * It contains the user's metadata and is used to notify other services that a user has been created.
   *
   * @param {AuthLocalCreatedEvent} payload - The events payload containing the user's metadata.
   */
  handleAuthLocalCreated(payload: AuthLocalCreatedEvent): void {
    this.rmqMicroserviceClient.emit(EventName.AUTH_LOCAL_CREATED, payload);
  }
}
