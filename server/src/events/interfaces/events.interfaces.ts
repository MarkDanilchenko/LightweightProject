import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";

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

interface AuthLocalEmailVerificationSentEvent extends BaseEvent {}
interface AuthLocalEmailVerifiedEvent extends BaseEvent {}
interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & { email: string };
}
interface AuthLocalPasswordResetEvent extends BaseEvent {
  username: string;
  email: string;
}
interface AuthLocalPasswordResetSentEvent extends BaseEvent {}
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
