import { Repository } from "typeorm";
import EventEntity from "@server/events/events.entity";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { buildEventFakeFactory } from "../factories";
import { EventName } from "@server/events/interfaces/events.interfaces";

describe("EventsEntity", (): void => {
  let eventRepository: Repository<EventEntity>;

  beforeAll(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(EventEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    eventRepository = testingModule.get<Repository<EventEntity>>(getRepositoryToken(EventEntity));
  });

  it("Event repository should be defined", (): void => {
    expect(eventRepository).toBeDefined();
  });

  describe("EventsEntity structure", (): void => {
    let event: EventEntity;

    beforeAll((): void => {
      event = buildEventFakeFactory();
    });

    it("should have an id in uuid v4 format", (): void => {
      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe("string");
      expect(event.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have a valid event name", (): void => {
      expect(event.name).toBeDefined();
      expect(typeof event.name).toBe("string");
      expect(Object.values(EventName)).toContain(event.name);
    });

    it("should have a userId in uuid v4 format", (): void => {
      expect(event.userId).toBeDefined();
      expect(typeof event.userId).toBe("string");
      expect(event.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have a modelId in uuid v4 format", (): void => {
      expect(event.modelId).toBeDefined();
      expect(typeof event.modelId).toBe("string");
      expect(event.modelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have a metadata object", (): void => {
      expect(event.metadata).toBeDefined();
      expect(typeof event.metadata).toBe("object");
      expect(event.metadata).toEqual(expect.any(Object));
    });

    it("should have a valid createdAt date", (): void => {
      expect(event.createdAt).toBeDefined();
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("EventsEntity validation", (): void => {
    let event: EventEntity;

    beforeAll((): void => {
      event = buildEventFakeFactory();
    });

    it("should successfully validate when all properties are valid", async (): Promise<void> => {
      expect(event).toBeInstanceOf(EventEntity);

      await expect(event.validate()).resolves.not.toThrow();
    });

    it("should throw an error when some property is invalid", async (): Promise<void> => {
      expect(event).toBeInstanceOf(EventEntity);
      // @ts-expect-error - invalid name value initialization only for test purpose;
      event.name = "invalid name";

      await expect(event.validate()).rejects.toThrow();
    });
  });
});
