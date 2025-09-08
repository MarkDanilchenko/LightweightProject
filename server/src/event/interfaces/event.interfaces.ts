import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";

enum EventName {
  AUTH_CREATED_LOCAL = "auth.created.local",
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
  metadata: unknown;
}

interface AuthCreatedLocalEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & { email: string };
}

export { EventName, AuthCreatedLocalEvent };
