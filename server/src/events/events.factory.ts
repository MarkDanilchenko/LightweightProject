import {
  AuthLocalCreatedEvent,
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationConfirmedEvent,
  AuthLocalPasswordResetConfirmedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalPasswordResetSentEvent,
  AuthLocalReactivationEvent,
  AuthLocalReactivationSentEvent,
  BaseEvent,
  EventName,
  UserDeactivatedEvent,
  UserReactivatedEvent,
  UserDeletedEvent,
} from "#server/events/interfaces/events.interfaces";

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

class AuthLocalEmailVerifiedEventClass extends BaseEventClass implements AuthLocalEmailVerificationConfirmedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalEmailVerificationConfirmedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

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

class AuthLocalPasswordResetedEventClass extends BaseEventClass implements AuthLocalPasswordResetConfirmedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalPasswordResetConfirmedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class AuthLocalReactivationEventClass extends BaseEventClass implements AuthLocalReactivationEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalReactivationEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class AuthLocalReactivationSentEventClass extends BaseEventClass implements AuthLocalReactivationSentEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthLocalReactivationSentEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class UserDeactivatedEventClass extends BaseEventClass implements UserDeactivatedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: UserDeactivatedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class UserReactivatedEventClass extends BaseEventClass implements UserReactivatedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: UserReactivatedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

class UserDeletedEventClass extends BaseEventClass implements UserDeletedEvent {
  constructor(
    name: BaseEvent["name"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: UserDeletedEvent["metadata"],
  ) {
    super(name, userId, modelId, metadata);
  }
}

const eventsRegistry = {
  [EventName.AUTH_LOCAL_CREATED]: AuthLocalCreatedEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT]: AuthLocalEmailVerificationSentEventClass,
  [EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED]: AuthLocalEmailVerifiedEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET]: AuthLocalPasswordResetEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET_SENT]: AuthLocalPasswordResetSentEventClass,
  [EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED]: AuthLocalPasswordResetedEventClass,
  [EventName.AUTH_LOCAL_REACTIVATION]: AuthLocalReactivationEventClass,
  [EventName.AUTH_LOCAL_REACTIVATION_SENT]: AuthLocalReactivationSentEventClass,
  [EventName.USER_DEACTIVATED]: UserDeactivatedEventClass,
  [EventName.USER_REACTIVATED]: UserReactivatedEventClass,
  [EventName.USER_DELETED]: UserDeletedEventClass,
};

export { eventsRegistry };
