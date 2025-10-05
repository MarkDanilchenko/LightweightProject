import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventName } from "@server/event/interfaces/event.interfaces";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";
import EventEntity from "@server/event/event.entity";

@Injectable()
export default class EventConsumer {
  private readonly logger: LoggerService;

  constructor(
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
    };

    if (!manager) {
      return this.dataSource.transaction(callback);
    }

    return callback(manager);
  }
}
