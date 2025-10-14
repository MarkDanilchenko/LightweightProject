import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { AuthCreatedLocalEventClass } from "@server/event/event.events";

const enum EventName {
  AUTH_CREATED_LOCAL = "auth.created.local",
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
}

interface AuthCreatedLocalEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & { email: string };
}

interface EventRegistry {
  [EventName.AUTH_CREATED_LOCAL]: typeof AuthCreatedLocalEventClass;
}

export { EventName, EventRegistry, AuthCreatedLocalEvent, BaseEvent };
