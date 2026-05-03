import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
  AuthLocalReactivationRequestEvent,
  AuthLocalReactivationRequestSentEvent,
  AuthLocalReactivationConfirmedEvent,
  UserDeactivatedEvent,
  UserReactivatedEvent,
} from "#server/events/interfaces/events.interfaces";

type EventType =
  | AuthLocalEmailVerificationSentEvent
  | AuthLocalEmailVerifiedEvent
  | AuthLocalCreatedEvent
  | AuthLocalPasswordResetEvent
  | AuthLocalPasswordResetSentEvent
  | AuthLocalPasswordResetedEvent
  | AuthLocalReactivationRequestEvent
  | AuthLocalReactivationRequestSentEvent
  | AuthLocalReactivationConfirmedEvent
  | UserDeactivatedEvent
  | UserReactivatedEvent;

export { EventType };
