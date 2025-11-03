import { Inject, Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AuthLocalCreatedEvent, EventName } from "@server/event/interfaces/event.interfaces";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export default class EventConsumer {
  constructor(
    @Inject("MICROSERVICE_RMQ")
    private readonly rmqMicroserviceClient: ClientProxy,
  ) {}

  @OnEvent(EventName.AUTH_LOCAL_CREATED)
  handleAuthLocalCreated(payload: AuthLocalCreatedEvent): void {
    // Use `.emit()` for events that do not require a response (fire-and-forget).
    // If needed a response from a microservice - use `.send()'.
    this.rmqMicroserviceClient.emit(EventName.AUTH_LOCAL_CREATED, payload);
  }
}
