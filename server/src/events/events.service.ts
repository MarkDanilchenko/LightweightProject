import { Injectable } from "@nestjs/common";
import { eventRegistry } from "@server/events/events.factory";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import EventEntity from "@server/events/events.entity";
import { DataSource, EntityManager, Repository } from "typeorm";
import { EventType } from "@server/events/types/events.types";

@Injectable()
export default class EventsService {
  private readonly dataSource: DataSource;
  private readonly eventRegistry = eventRegistry;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {
    this.dataSource = dataSource;
  }

  /**
   * Build a new events instance according to the provided event's name.
   *
   * @template K - The type of the event's name.
   * @param {K} name - The name of the events to be created
   * @param {...ConstructorParameters<(typeof eventRegistry)[K]> extends [any, ...infer Rest] ? Rest : never} payload - The arguments for the events.
   *
   * @returns {InstanceType<(typeof eventRegistry)[K]>} The events instance.
   */
  buildInstance<K extends keyof typeof eventRegistry>(
    name: K,
    ...payload: ConstructorParameters<(typeof eventRegistry)[K]> extends [any, ...infer Rest] ? Rest : never
  ): InstanceType<(typeof eventRegistry)[K]> {
    const EventClass = this.eventRegistry[name];

    // eslint-disable-next-line
    return new (EventClass as new (name: K, ...payload: any[]) => InstanceType<(typeof eventRegistry)[K]>)(
      name,
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
    if (!payload) {
      return;
    }

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
