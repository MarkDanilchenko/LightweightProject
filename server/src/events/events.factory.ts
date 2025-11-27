import {
  AuthLocalCreatedEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
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

// Auth Local Email Verified Event;
class AuthLocalEmailVerifiedEventClass extends BaseEventClass implements AuthLocalEmailVerifiedEvent {
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

// Auth Local Password Reset Event;
class AuthLocalPasswordResetEventClass extends BaseEventClass implements AuthLocalPasswordResetEvent {
  public readonly username: AuthLocalPasswordResetEvent["username"];
  public readonly email: AuthLocalPasswordResetEvent["email"];

  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    username: AuthLocalPasswordResetEvent["username"],
    email: AuthLocalPasswordResetEvent["email"],
  ) {
    super(name, userId, modelId);

    this.username = username;
    this.email = email;
  }
}

// Auth Local Password Reset Sent Event;
class AuthLocalPasswordResetSentEventClass extends BaseEventClass implements AuthLocalPasswordResetSentEvent {
  constructor(name: BaseEvent["name"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
    super(name, userId, modelId);
  }
}

const eventsRegistry = {
  [EventName.AUTH_LOCAL_CREATED]: AuthLocalCreatedEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT]: AuthLocalEmailVerificationSentEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFIED]: AuthLocalEmailVerifiedEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET]: AuthLocalPasswordResetEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET_SENT]: AuthLocalPasswordResetSentEventClass,
};

export { eventsRegistry };
