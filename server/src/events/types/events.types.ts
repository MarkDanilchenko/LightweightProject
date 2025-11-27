import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
} from "@server/events/interfaces/events.interfaces";

type EventType =
  | AuthLocalEmailVerificationSentEvent
  | AuthLocalEmailVerifiedEvent
  | AuthLocalCreatedEvent
  | AuthLocalPasswordResetEvent
  | AuthLocalPasswordResetSentEvent
  | AuthLocalPasswordResetedEvent;

export { EventType };
