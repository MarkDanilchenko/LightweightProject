import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationVerifiedEvent,
  AuthLocalCreatedEvent,
  BaseEvent,
} from "@server/events/interfaces/events.interfaces";

type EventConstructor<T extends BaseEvent> = new (...args: any[]) => T;

type EventType = AuthLocalEmailVerificationSentEvent | AuthLocalEmailVerificationVerifiedEvent | AuthLocalCreatedEvent;

export { EventType, EventConstructor };
