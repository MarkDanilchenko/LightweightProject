/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import EventsConsumer from "@server/events/events.consumer";
import EventsService from "@server/events/events.service";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalPasswordResetedEvent,
  AuthLocalPasswordResetSentEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { buildUserFactory, buildAuthenticationFactory } from "../../factories";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import { EntityManager } from "typeorm";

describe("EventsConsumer", (): void => {
  let eventsConsumer: EventsConsumer;
  let eventsService: jest.Mocked<EventsService>;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeAll((): void => {
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({ userId: user.id });
  });

  beforeEach(async (): Promise<void> => {
    const mockEventService = { createEvent: jest.fn() };
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [EventsConsumer, { provide: EventsService, useValue: mockEventService }],
    }).compile();

    eventsConsumer = testingModule.get<EventsConsumer>(EventsConsumer);
    eventsService = testingModule.get<jest.Mocked<EventsService>>(EventsService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(eventsConsumer).toBeDefined();
  });

  describe("handleAuthLocalEvents", (): void => {
    it("should handle AUTH_LOCAL_EMAIL_VERIFICATION_SENT event", async (): Promise<void> => {
      const payload: AuthLocalEmailVerificationSentEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: { email: user.email },
      };

      await eventsConsumer.handleAuthLocalEvents(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_EMAIL_VERIFIED event", async (): Promise<void> => {
      const payload: AuthLocalEmailVerifiedEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFIED,
        userId: user.id,
        modelId: authentication.id,
        metadata: { email: user.email },
      };

      await eventsConsumer.handleAuthLocalEvents(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_PASSWORD_RESET_SENT event", async (): Promise<void> => {
      const payload: AuthLocalPasswordResetSentEvent = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: { email: user.email },
      };

      await eventsConsumer.handleAuthLocalEvents(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_PASSWORD_RESETED event", async (): Promise<void> => {
      const payload: AuthLocalPasswordResetedEvent = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESETED,
        userId: user.id,
        modelId: authentication.id,
      };

      await eventsConsumer.handleAuthLocalEvents(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should pass EntityManager when provided", async (): Promise<void> => {
      const mockManager = {} as EntityManager;

      const payload: AuthLocalEmailVerifiedEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: { email: user.email },
      };

      await eventsConsumer.handleAuthLocalEvents(payload, mockManager);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, mockManager);
    });
  });
});
