import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AuthLocalCreatedEvent, EventName } from "@server/event/interfaces/event.interfaces";
import { EntityManager } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
import EventService from "@server/event/event.service";

@Injectable()
export default class EventConsumer {
  private readonly logger: LoggerService;
  private readonly eventService: EventService;

  constructor(
    @Inject("MICROSERVICE_RMQ")
    private readonly rmqMicroserviceClient: ClientProxy,
    eventService: EventService,
  ) {
    this.logger = new Logger(EventConsumer.name);
    this.eventService = eventService;
  }

  @OnEvent(EventName.AUTH_LOCAL_CREATED)
  async handleAuthCreatedLocal(payload: AuthLocalCreatedEvent, manager?: EntityManager): Promise<void> {
    await this.eventService.createEvent(payload, manager);

    // Use `.emit()` for events that do not require a response (fire-and-forget).
    // If needed a response from a microservice - use `.send()'.
    this.rmqMicroserviceClient.emit(EventName.AUTH_LOCAL_CREATED, payload);
  }
}
