import { AuthenticationInstanceMetadata } from "#server/auth/interfaces/auth.interfaces";

enum EventName {
  AUTH_LOCAL_EMAIL_VERIFICATION_SENT = "auth.local.email-verification.sent",
  AUTH_LOCAL_EMAIL_VERIFIED = "auth.local.email.verified",
  AUTH_LOCAL_CREATED = "auth.local.created",
  AUTH_LOCAL_PASSWORD_RESET = "auth.local.password-reset",
  AUTH_LOCAL_PASSWORD_RESET_SENT = "auth.local.password-reset.sent",
  AUTH_LOCAL_PASSWORD_RESETED = "auth.local.password.reseted",
  USER_DEACTIVATED = "user.deactivated",
  // USER_REACTIVATED = "user.reactivated",
}

interface EventMetadata {
  email: string;
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
  metadata: EventMetadata;
}

interface AuthLocalEmailVerificationSentEvent extends BaseEvent {}

interface AuthLocalEmailVerifiedEvent extends BaseEvent {}

interface AuthLocalPasswordResetSentEvent extends BaseEvent {}

interface AuthLocalPasswordResetedEvent extends BaseEvent {}

interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: EventMetadata & NonNullable<NonNullable<AuthenticationInstanceMetadata["local"]>["temporaryInfo"]>;
}

interface AuthLocalPasswordResetEvent extends BaseEvent {
  metadata: EventMetadata & { username?: string | null };
}

interface UserDeactivatedEvent extends BaseEvent {
  metadata: EventMetadata & { username?: string | null };
}

// interface UserReactivatedEvent extends BaseEvent {}

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
  // UserReactivatedEvent,
};
