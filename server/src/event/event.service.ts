import { BadRequestException, Injectable } from "@nestjs/common";
import { EventRegistry } from "@server/event/interfaces/event.interfaces";
import { eventRegistry } from "@server/event/event.events";

@Injectable()
export default class EventService {
  private readonly eventRegistry: EventRegistry = eventRegistry;

  /**
   * Creates a new event instance according to the provided event name.
   *
   * @template K - The type of the event name.
   * @param {K} eventName - The name of the event to create.
   * @param {...ConstructorParameters<EventRegistry[K]> extends [any, ...infer Rest] ? Rest : never} payload - The payload for the event.
   *
   * @returns {InstanceType<EventRegistry[K]>} The created event instance.
   */
  create<K extends keyof EventRegistry>(
    eventName: K,
    ...payload: ConstructorParameters<EventRegistry[K]> extends [any, ...infer Rest] ? Rest : never
  ): InstanceType<EventRegistry[K]> {
    const EventClass: EventRegistry[K] = this.eventRegistry[eventName];

    if (!EventClass) {
      throw new BadRequestException(`Event "${eventName}" is not supported`);
    }

    // eslint-disable-next-line
    return new (EventClass as new (eventName: K, ...args: any[]) => InstanceType<EventRegistry[K]>)(
      eventName,
      ...payload,
    );
  }
}
