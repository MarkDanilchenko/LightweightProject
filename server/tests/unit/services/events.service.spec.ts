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
import { buildEventFactory, buildUserFactory } from "../../factories";
import { EventType } from "@server/events/types/events.types";
import UserEntity from "@server/users/users.entity";

describe("EventsService", (): void => {
  const randomUuid: string = "3fd5e553-73a2-486b-8120-90cd007c9843";
  const testEmail = "test@example.com";
  const user: UserEntity = buildUserFactory();
  const event: EventEntity = buildEventFactory({ userId: user.id });
  let eventsService: EventsService;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let entityManager: jest.Mocked<Partial<EntityManager>>;

  beforeEach(async (): Promise<void> => {
    const mockEntityManager = {
      create: jest.fn().mockReturnValue(event),
      save: jest.fn().mockResolvedValue(null),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(EventEntity), useClass: Repository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    eventsService = testingModule.get<EventsService>(EventsService);
    dataSource = testingModule.get<jest.Mocked<Partial<DataSource>>>(DataSource);
    entityManager = mockEntityManager;
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
        { email: testEmail },
      );

      expect(event).toBeDefined();
      expect(event.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(randomUuid);
      expect(event.metadata).toEqual({ email: testEmail });
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
        metadata: { email: testEmail },
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
        metadata: { email: testEmail },
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
