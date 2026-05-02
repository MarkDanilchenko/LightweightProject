import {
  AuthLocalCreatedEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalPasswordResetedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalReactivationRequestEvent,
  AuthLocalReactivationRequestSentEvent,
  AuthLocalReactivationConfirmedEvent,
  BaseEvent,
  EventName,
  UserDeactivatedEvent,
  // UserReactivatedEvent,
} from "#server/events/interfaces/events.interfaces";

// Base Event;
class BaseEventClass implements BaseEvent {
  public readonly name: BaseEvent["name"];
  public readonly userId: BaseEvent["userId"];
  public readonly modelId: BaseEvent["modelId"];
  public readonly metadata: BaseEvent["metadata"];

  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: BaseEvent["metadata"],
  ) {
    this.name = name;
    this.userId = userId;
    this.modelId = modelId;
    this.metadata = metadata;
  }
}

// Auth Local Email Verification Sent Event;
class AuthLocalEmailVerificationSentEventClass extends BaseEventClass implements AuthLocalEmailVerificationSentEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalEmailVerificationSentEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Email Verified Event;
class AuthLocalEmailVerifiedEventClass extends BaseEventClass implements AuthLocalEmailVerifiedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalEmailVerifiedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Created Event;
class AuthLocalCreatedEventClass extends BaseEventClass implements AuthLocalCreatedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalCreatedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Password Reset Event;
class AuthLocalPasswordResetEventClass extends BaseEventClass implements AuthLocalPasswordResetEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalPasswordResetEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Password Reset Sent Event;
class AuthLocalPasswordResetSentEventClass extends BaseEventClass implements AuthLocalPasswordResetSentEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalPasswordResetSentEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Password Reseted Event;
class AuthLocalPasswordResetedEventClass extends BaseEventClass implements AuthLocalPasswordResetedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalPasswordResetedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// Auth Local Reactivation Request Event;
class AuthLocalReactivationRequestEventClass extends BaseEventClass implements AuthLocalReactivationRequestEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalReactivationRequestEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class AuthLocalReactivationRequestSentEventClass
  extends BaseEventClass
  implements AuthLocalReactivationRequestSentEvent
{
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalReactivationRequestSentEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class AuthLocalReactivationConfirmedEventClass extends BaseEventClass implements AuthLocalReactivationConfirmedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalReactivationConfirmedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// User Deactivated Event;
class UserDeactivateEventClass extends BaseEventClass implements UserDeactivatedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: UserDeactivatedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

// User Reactivated Event;
// class UserReactivateEventClass extends BaseEventClass implements UserReactivatedEvent {
//   constructor(name: BaseEvent["name"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
//     super(name, userId, modelId);
//   }
// }

const eventsRegistry = {
  [EventName.AUTH_LOCAL_CREATED]: AuthLocalCreatedEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT]: AuthLocalEmailVerificationSentEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFIED]: AuthLocalEmailVerifiedEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET]: AuthLocalPasswordResetEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET_SENT]: AuthLocalPasswordResetSentEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESETED]: AuthLocalPasswordResetedEventClass,
  [EventName.AUTH_LOCAL_REACTIVATION_REQUEST]: AuthLocalReactivationRequestEventClass,
  [EventName.AUTH_LOCAL_REACTIVATION_REQUEST_SENT]: AuthLocalReactivationRequestSentEventClass,
  [EventName.AUTH_LOCAL_REACTIVATION_CONFIRMED]: AuthLocalReactivationConfirmedEventClass,
  [EventName.USER_DEACTIVATED]: UserDeactivateEventClass,
  // [EventName.USER_REACTIVATED]: UserReactivateEventClass,
};

export { eventsRegistry };
