import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";

enum EventName {
  AUTH_LOCAL_EMAIL_VERIFICATION_SENT = "auth.local.email-verification.sent",
  AUTH_LOCAL_EMAIL_VERIFIED = "auth.local.email.verified",
  AUTH_LOCAL_CREATED = "auth.local.created",
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

export {
  EventName,
  BaseEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalCreatedEvent,
};
