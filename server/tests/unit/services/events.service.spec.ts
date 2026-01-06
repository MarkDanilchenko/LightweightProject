/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import EventsService from "@server/events/events.service";
import EventEntity from "@server/events/events.entity";
import {
  AuthLocalEmailVerificationSentEvent,
  AuthLocalEmailVerifiedEvent,
  AuthLocalPasswordResetedEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { buildEventFakeFactory, buildUserFakeFactory } from "../../factories";
import { EventType } from "@server/events/types/events.types";
import UserEntity from "@server/users/users.entity";

describe("EventsService", (): void => {
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let eventsService: EventsService;
  let entityManager: jest.Mocked<Partial<EntityManager>>;
  let randomUuid: string;
  let user: UserEntity;
  let event: EventEntity;

  beforeAll((): void => {
    user = buildUserFakeFactory();
    event = buildEventFakeFactory({ userId: user.id });
    randomUuid = "3fd5e553-73a2-486b-8120-90cd007c9843";
  });

  beforeEach(async (): Promise<void> => {
    entityManager = {
      create: jest.fn().mockReturnValue(event),
      save: jest.fn().mockResolvedValue(null),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(entityManager)),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(EventEntity),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    eventsService = testingModule.get<EventsService>(EventsService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(eventsService).toBeDefined();
  });

  describe("buildInstance", (): void => {
    it("should create an instance of AuthLocalEmailVerificationSentEvent", (): void => {
      const event: AuthLocalEmailVerificationSentEvent = eventsService.buildInstance(
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        user.id,
        randomUuid,
        { email: "test@example.com" },
      );

      expect(event).toBeDefined();
      expect(event.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(randomUuid);
      expect(event.metadata).toEqual({ email: "test@example.com" });
    });

    it("should create an instance of AuthLocalPasswordResetedEvent", (): void => {
      const event: AuthLocalPasswordResetedEvent = eventsService.buildInstance(
        EventName.AUTH_LOCAL_PASSWORD_RESETED,
        user.id,
        randomUuid,
      );

      expect(event).toBeDefined();
      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESETED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(randomUuid);
    });
  });

  describe("createEvent", (): void => {
    it("should create an event without a transaction manager", async (): Promise<void> => {
      const payload: AuthLocalEmailVerificationSentEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        userId: user.id,
        modelId: randomUuid,
        metadata: { email: "test@example.com" },
      };

      await eventsService.createEvent(payload);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(entityManager.create).toHaveBeenCalledWith(EventEntity, payload);
      expect(entityManager.save).toHaveBeenCalledWith(event);
    });

    it("should create an event with a transaction manager", async (): Promise<void> => {
      const payload: AuthLocalEmailVerifiedEvent = {
        name: EventName.AUTH_LOCAL_EMAIL_VERIFIED,
        userId: user.id,
        modelId: randomUuid,
        metadata: { email: "test@example.com" },
      };

      await eventsService.createEvent(payload, entityManager as EntityManager);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(entityManager.create).toHaveBeenCalledWith(EventEntity, payload);
      expect(entityManager.save).toHaveBeenCalledWith(event);
    });

    it("should not create an event if payload is not provided", async (): Promise<void> => {
      await eventsService.createEvent(undefined as unknown as EventType);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(entityManager.create).not.toHaveBeenCalled();
      expect(entityManager.save).not.toHaveBeenCalled();
    });
  });
});
