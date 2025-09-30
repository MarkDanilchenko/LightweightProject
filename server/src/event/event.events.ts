import { AuthCreatedLocalEvent, BaseEvent, EventRegistry, EventName } from "@server/event/interfaces/event.interfaces";

class BaseEventClass implements BaseEvent {
  public readonly eventName: BaseEvent["eventName"];
  public readonly userId: BaseEvent["userId"];
  public readonly modelId: BaseEvent["modelId"];

  constructor(eventName: BaseEvent["eventName"], userId: BaseEvent["userId"], modelId: BaseEvent["modelId"]) {
    this.eventName = eventName;
    this.userId = userId;
    this.modelId = modelId;
  }
}

class AuthCreatedLocalEventClass extends BaseEventClass implements AuthCreatedLocalEvent {
  public readonly metadata: AuthCreatedLocalEvent["metadata"];

  constructor(
    eventName: BaseEvent["eventName"],
    userId: BaseEvent["userId"],
    modelId: BaseEvent["modelId"],
    metadata: AuthCreatedLocalEvent["metadata"],
  ) {
    super(eventName, userId, modelId);

    this.metadata = metadata;
  }
}

const eventRegistry: EventRegistry = {
  [EventName.AUTH_CREATED_LOCAL]: AuthCreatedLocalEventClass,
};

export { AuthCreatedLocalEventClass, eventRegistry };
