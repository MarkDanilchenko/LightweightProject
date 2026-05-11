import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationConfirmedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetConfirmedEvent,
  AuthLocalReactivationEvent,
  AuthLocalReactivationSentEvent,
  UserDeactivatedEvent,
  UserReactivatedEvent,
  UserDeletedEvent,
} from "#server/events/interfaces/events.interfaces";

type EventType =
  | AuthLocalEmailVerificationSentEvent
  | AuthLocalEmailVerificationConfirmedEvent
  | AuthLocalCreatedEvent
  | AuthLocalPasswordResetEvent
  | AuthLocalPasswordResetSentEvent
  | AuthLocalPasswordResetConfirmedEvent
  | AuthLocalReactivationEvent
  | AuthLocalReactivationSentEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent
  | UserDeletedEvent;

export { EventType };
