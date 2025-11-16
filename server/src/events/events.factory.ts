import {
  AuthLocalCreatedEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationVerifiedEvent,
  BaseEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";

// Base Event;
class BaseEventClass implements BaseEvent {
  public readonly name: BaseEvent["name"];
  public readonly userId: BaseEvent["userId"];
  public readonly modelId: BaseEvent["modelId"];

  constructor(name: BaseEvent["name"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
    this.name = name;
    this.userId = userId;
    this.modelId = modelId;
  }
}

// Auth Local Email Verification Sent Event;
class AuthLocalEmailVerificationSentEventClass extends BaseEventClass implements AuthLocalEmailVerificationSentEvent {
  constructor(name: BaseEvent["name"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
    super(name, userId, modelId);
  }
}

// Auth Local Email Verification Verified Event;
class AuthLocalEmailVerificationVerifiedEventClass
  extends BaseEventClass
  implements AuthLocalEmailVerificationVerifiedEvent
{
  constructor(name: BaseEvent["name"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
    super(name, userId, modelId);
  }
}

// Auth Local Created Event;
class AuthLocalCreatedEventClass extends BaseEventClass implements AuthLocalCreatedEvent {
  public readonly metadata: AuthLocalCreatedEvent["metadata"];

  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalCreatedEvent["metadata"],
  ) {
    super(name, userId, modelId);

    this.metadata = metadata;
  }
}

const eventRegistry = {
  [EventName.AUTH_LOCAL_CREATED]: AuthLocalCreatedEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT]: AuthLocalEmailVerificationSentEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED]: AuthLocalEmailVerificationVerifiedEventClass,
};

export { eventRegistry };
