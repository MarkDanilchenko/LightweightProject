import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationVerifiedEvent,
  AuthLocalCreatedEvent,
} from "@server/events/interfaces/events.interfaces";

type EventType = AuthLocalEmailVerificationSentEvent | AuthLocalEmailVerificationVerifiedEvent | AuthLocalCreatedEvent;

export { EventType };
