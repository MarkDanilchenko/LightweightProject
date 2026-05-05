import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventType } from "#server/events/types/events.types";
import EventsService from "#server/events/events.service";
import { EntityManager } from "typeorm";
import { EventName } from "#server/events/interfaces/events.interfaces";

@Injectable()
export default class EventsConsumer {
  private readonly eventsService: EventsService;

  constructor(eventsService: EventsService) {
    this.eventsService = eventsService;
  }

  /**
   * Handles all events from the event emitter.
   * This method is responsible for processing events and creating
   * corresponding event records in the database for account history tracking.
   *
   * @param {EventType} payload - The event containing the user's information.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the event has been successfully handled.
   */
  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT)
  @OnEvent(EventName.AUTH_LOCAL_EMAIL_VERIFIED)
  @OnEvent(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT)
  @OnEvent(EventName.AUTH_LOCAL_PASSWORD_RESETED)
  @OnEvent(EventName.AUTH_LOCAL_REACTIVATION_REQUEST_SENT)
  @OnEvent(EventName.USER_DEACTIVATED)
  @OnEvent(EventName.USER_REACTIVATED)
  async handleEvent(payload: EventType, manager?: EntityManager): Promise<void> {
    await this.eventsService.createEvent(payload, manager);
  }
}
