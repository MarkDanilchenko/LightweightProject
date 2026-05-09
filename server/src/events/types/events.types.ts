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
  | UserReactivatedEvent;

export { EventType };
