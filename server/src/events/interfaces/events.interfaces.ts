import { AuthenticationInstanceMetadata } from "#server/auth/interfaces/auth.interfaces";

enum EventName {
  AUTH_LOCAL_EMAIL_VERIFICATION_SENT = "auth.local.email-verification.sent",
  AUTH_LOCAL_EMAIL_VERIFIED = "auth.local.email.verified",
  AUTH_LOCAL_CREATED = "auth.local.created",
  AUTH_LOCAL_PASSWORD_RESET = "auth.local.password-reset",
  AUTH_LOCAL_PASSWORD_RESET_SENT = "auth.local.password-reset.sent",
  AUTH_LOCAL_PASSWORD_RESETED = "auth.local.password.reseted",
  USER_DEACTIVATED = "user.deactivated",
  USER_REACTIVATED = "user.reactivated",
}

interface EventMetadata {
  email: string;
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
}

interface AuthLocalEmailVerificationSentEvent extends BaseEvent {
  metadata: EventMetadata;
}

interface AuthLocalEmailVerifiedEvent extends BaseEvent {
  metadata: EventMetadata;
}

interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthenticationInstanceMetadata["local"]>["temporaryInfo"]> & EventMetadata;
}

// TODO: pass all two fields into one event metadata like in the UserDeactivatedEvent below;
interface AuthLocalPasswordResetEvent extends BaseEvent {
  username?: string | null;
  email: string;
}

interface AuthLocalPasswordResetSentEvent extends BaseEvent {
  metadata: EventMetadata;
}

interface AuthLocalPasswordResetedEvent extends BaseEvent {
  metadata: EventMetadata;
}

interface UserDeactivatedEvent extends BaseEvent {
  metadata: EventMetadata & { username?: string | null };
}

interface UserReactivatedEvent extends BaseEvent {}

export {
  EventMetadata,
  EventName,
  BaseEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalPasswordResetedEvent,
  UserDeactivatedEvent,
  UserReactivatedEvent,
};
