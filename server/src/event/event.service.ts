import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { EventRegistry } from "@server/event/interfaces/event.interfaces";
import { eventRegistry } from "@server/event/event.events";
import { InjectRepository } from "@nestjs/typeorm";
import EventEntity from "@server/event/event.entity";
import { Repository } from "typeorm";

@Injectable()
export default class EventService {
  private readonly logger: LoggerService;
  private readonly eventRegistry: EventRegistry = eventRegistry;

  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {
    this.logger = new Logger(EventService.name);
  }

  /**
   * Build a new event instance according to the provided event name.
   *
   * @template K - The type of the event name.
   * @param {K} eventName - The name of the event to create.
   * @param {...ConstructorParameters<EventRegistry[K]> extends [any, ...infer Rest] ? Rest : never} payload - The payload for the event.
   *
   * @returns {InstanceType<EventRegistry[K]>} The event instance.
   */
  build<K extends keyof EventRegistry>(
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
}
