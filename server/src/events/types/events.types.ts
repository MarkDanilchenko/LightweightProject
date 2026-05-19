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
  UserRestoredEvent,
  AuthLocalRestorationEvent,
  AuthLocalRestorationSentEvent,
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
  | UserDeletedEvent
  | AuthLocalRestorationEvent
  | AuthLocalRestorationSentEvent
  | UserRestoredEvent;

export { EventType };
