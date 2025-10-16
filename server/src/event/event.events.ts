import { AuthLocalCreatedEvent, BaseEvent, EventRegistry, EventName } from "@server/event/interfaces/event.interfaces";

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

const eventRegistry: EventRegistry = {
  [EventName.AUTH_LOCAL_CREATED]: AuthLocalCreatedEventClass,
};

export { AuthLocalCreatedEventClass, eventRegistry };
