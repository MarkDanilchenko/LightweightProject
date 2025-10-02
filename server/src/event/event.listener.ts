import { Injectable, Logger, LoggerService } from "@nestjs/common";
import EventService from "@server/event/event.service";
import { OnEvent } from "@nestjs/event-emitter";
import { EventName } from "@server/event/interfaces/event.interfaces";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";

@Injectable()
export default class EventListener {
  private readonly logger: LoggerService;
  private readonly eventService: EventService;

  constructor(eventService: EventService) {
    this.logger = new Logger(EventListener.name);
    this.eventService = eventService;
  }

  @OnEvent(EventName.AUTH_CREATED_LOCAL)
  async handleAuthCreatedLocal(event: AuthCreatedLocalEventClass): Promise<void> {
    this.logger.log(
      "Auth local created event: ",
      JSON.stringify({ eventName: event.eventName, userId: event.userId, modelId: event.modelId }),
    );
  }
}
