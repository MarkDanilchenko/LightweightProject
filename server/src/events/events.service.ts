import { Injectable } from "@nestjs/common";
import { EventRegistry } from "@server/events/interfaces/events.interfaces";
import { eventRegistry } from "@server/events/events.factory";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import EventEntity from "@server/events/events.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { EventType } from "@server/events/types/events.types";

@Injectable()
export default class EventsService {
  private readonly eventRegistry: EventRegistry = eventRegistry;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  /**
   * Build a new events instance according to the provided event's name.
   *
   * @template K - The type of the event's name.
   * @param {K} eventName - The name of the events to create.
   * @param {...ConstructorParameters<EventRegistry[K]> extends [any, ...infer Rest] ? Rest : never} payload - The payload for the events.
   *
   * @returns {InstanceType<EventRegistry[K]>} The events instance.
   */
  buildInstance<K extends keyof EventRegistry>(
    eventName: K,
    ...payload: ConstructorParameters<EventRegistry[K]> extends [any, ...infer Rest] ? Rest : never
  ): InstanceType<EventRegistry[K]> {
    const EventClass: EventRegistry[K] = this.eventRegistry[eventName];

    // eslint-disable-next-line
    return new (EventClass as new (eventName: K, ...args: any[]) => InstanceType<EventRegistry[K]>)(
      eventName,
      ...payload,
    );
  }

  /**
   * Create a new events in the database.
   *
   * @param {EventType} payload - The payload for the events.
   * @param {EntityManager} [manager] - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<void>} A promise that resolves when the events has been created.
   */
  async createEvent(payload: EventType, manager?: EntityManager): Promise<void> {
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
