import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
  UserReactivatedEvent,
  UserDeactivatedEvent,
} from "#server/events/interfaces/events.interfaces";

type EventType =
  | AuthLocalEmailVerificationSentEvent
  | AuthLocalEmailVerifiedEvent
  | AuthLocalCreatedEvent
  | AuthLocalPasswordResetEvent
  | AuthLocalPasswordResetSentEvent
  | AuthLocalPasswordResetedEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent;

export { EventType };
