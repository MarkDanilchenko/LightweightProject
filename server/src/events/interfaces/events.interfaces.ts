import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { EventConstructor } from "@server/events/types/events.types";

const enum EventName {
  AUTH_LOCAL_EMAIL_VERIFICATION_SENT = "auth.local.email-verification.sent",
  AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED = "auth.local.email-verification.verified",
  AUTH_LOCAL_CREATED = "auth.local.created",
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
}

interface AuthLocalEmailVerificationSentEvent extends BaseEvent {}
interface AuthLocalEmailVerificationVerifiedEvent extends BaseEvent {}
interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & { email: string };
}

interface EventRegistry {
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT]: EventConstructor<AuthLocalEmailVerificationSentEvent>;
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED]: EventConstructor<AuthLocalEmailVerificationVerifiedEvent>;
  [EventName.AUTH_LOCAL_CREATED]: EventConstructor<AuthLocalCreatedEvent>;
}

export {
  EventName,
  BaseEvent,
  EventRegistry,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationVerifiedEvent,
  AuthLocalCreatedEvent,
};
