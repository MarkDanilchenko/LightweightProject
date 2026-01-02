import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { MetadataEmail } from "@server/events/types/events.types";

enum EventName {
  AUTH_LOCAL_EMAIL_VERIFICATION_SENT = "auth.local.email-verification.sent",
  AUTH_LOCAL_EMAIL_VERIFIED = "auth.local.email.verified",
  AUTH_LOCAL_CREATED = "auth.local.created",
  AUTH_LOCAL_PASSWORD_RESET = "auth.local.password-reset",
  AUTH_LOCAL_PASSWORD_RESET_SENT = "auth.local.password-reset.sent",
  AUTH_LOCAL_PASSWORD_RESETED = "auth.local.password.reseted",
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
}

interface AuthLocalEmailVerificationSentEvent extends BaseEvent {
  metadata: MetadataEmail;
}
interface AuthLocalEmailVerifiedEvent extends BaseEvent {
  metadata: MetadataEmail;
}
interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & MetadataEmail;
}
interface AuthLocalPasswordResetEvent extends BaseEvent {
  username?: string | null;
  email: string;
}
interface AuthLocalPasswordResetSentEvent extends BaseEvent {
  metadata: MetadataEmail;
}
interface AuthLocalPasswordResetedEvent extends BaseEvent {}

export {
  EventName,
  BaseEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
};
