import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
} from "@server/events/interfaces/events.interfaces";

type EventType = AuthLocalEmailVerificationSentEvent | AuthLocalEmailVerifiedEvent | AuthLocalCreatedEvent;

export { EventType };
