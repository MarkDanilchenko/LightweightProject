import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventName } from "@server/event/interfaces/event.interfaces";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import EventEntity from "@server/event/event.entity";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export default class EventConsumer {
  private readonly logger: LoggerService;

  constructor(
    @Inject("MICROSERVICE_RMQ")
    private readonly rmqMicroserviceClient: ClientProxy,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    this.logger = new Logger(EventConsumer.name);
  }

  @OnEvent(EventName.AUTH_CREATED_LOCAL)
  async handleAuthCreatedLocal(payload: AuthCreatedLocalEventClass, manager?: EntityManager): Promise<void> {
    const callback = async (manager: EntityManager): Promise<void> => {
      const event: EventEntity = manager.create(EventEntity, {
        ...payload,
      });
      await manager.save(event);

      // Use `.emit()` for events that do not require a response (fire-and-forget).
      // If needed a response from a microservice - use `.send()'.
      this.rmqMicroserviceClient.emit(EventName.AUTH_CREATED_LOCAL, payload);
    };

    if (!manager) {
      return this.dataSource.transaction(callback);
    }

    return callback(manager);
  }
}
