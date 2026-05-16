/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import EventsConsumer from "#server/events/events.consumer";
import EventsService from "#server/events/events.service";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerificationConfirmedEvent,
  AuthLocalPasswordResetConfirmedEvent,
  AuthLocalPasswordResetSentEvent,
  UserDeactivatedEvent,
  EventName,
  UserReactivatedEvent,
  AuthLocalReactivationSentEvent,
  UserDeletedEvent,
} from "#server/events/interfaces/events.interfaces";
import { buildUserFactory, buildAuthenticationFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";
import AuthenticationEntity from "#server/auth/auth.entity";
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

  describe("handleEvent", (): void => {
    it("should handle AUTH_LOCAL_EMAIL_VERIFICATION_SENT event", async (): Promise<void> => {
      const payload: AuthLocalEmailVerificationSentEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED event", async (): Promise<void> => {
      const payload: AuthLocalEmailVerificationConfirmedEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_PASSWORD_RESET_SENT event", async (): Promise<void> => {
      const payload: AuthLocalPasswordResetSentEvent = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_REACTIVATION_SENT event", async (): Promise<void> => {
      const payload: AuthLocalReactivationSentEvent = {
        name: EventName.AUTH_LOCAL_REACTIVATION_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
          username: user.username,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle AUTH_LOCAL_PASSWORD_RESET_CONFIRMED event", async (): Promise<void> => {
      const payload: AuthLocalPasswordResetConfirmedEvent = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle USER_DEACTIVATED event", async (): Promise<void> => {
      const payload: UserDeactivatedEvent = {
        name: EventName.USER_DEACTIVATED,
        userId: user.id,
        modelId: user.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle USER_REACTIVATED event", async (): Promise<void> => {
      const payload: UserReactivatedEvent = {
        name: EventName.USER_REACTIVATED,
        userId: user.id,
        modelId: user.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should handle USER_DELETED event", async (): Promise<void> => {
      const payload: UserDeletedEvent = {
        name: EventName.USER_DELETED,
        userId: user.id,
        modelId: user.id,
        metadata: {
          username: user.username,
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, undefined);
    });

    it("should pass EntityManager when provided", async (): Promise<void> => {
      const mockManager = {} as EntityManager;

      const payload: AuthLocalEmailVerificationSentEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
        },
      };

      await eventsConsumer.handleEvent(payload, mockManager);

      expect(eventsService.createEvent).toHaveBeenCalledTimes(1);
      expect(eventsService.createEvent).toHaveBeenCalledWith(payload, mockManager);
    });
  });
});
