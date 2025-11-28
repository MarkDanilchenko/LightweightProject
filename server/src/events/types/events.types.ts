import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
} from "@server/events/interfaces/events.interfaces";

type MetadataEmail = {
  email: string;
};

type EventType =
  | AuthLocalEmailVerificationSentEvent
  | AuthLocalEmailVerifiedEvent
  | AuthLocalCreatedEvent
  | AuthLocalPasswordResetEvent
  | AuthLocalPasswordResetSentEvent
  | AuthLocalPasswordResetedEvent;

export { EventType, MetadataEmail };
