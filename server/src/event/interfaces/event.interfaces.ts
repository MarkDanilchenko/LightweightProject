import { AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { AuthLocalCreatedEventClass } from "@server/event/event.events";

const enum EventName {
  AUTH_LOCAL_CREATED = "auth.local.created",
}

interface BaseEvent {
  name: EventName;
  userId: string;
  modelId: string;
}

interface AuthLocalCreatedEvent extends BaseEvent {
  metadata: NonNullable<NonNullable<AuthMetadata["local"]>["temporaryInfo"]> & { email: string };
}

interface EventRegistry {
  [EventName.AUTH_LOCAL_CREATED]: typeof AuthLocalCreatedEventClass;
}

export { EventName, EventRegistry, AuthLocalCreatedEvent, BaseEvent };
