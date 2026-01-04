import { eventsRegistry } from "@server/events/events.factory";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { buildAuthenticationFakeFactory, buildUserFakeFactory } from "../../factories";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";

describe("EventsFactory", (): void => {
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeAll((): void => {
    user = buildUserFakeFactory();
    authentication = buildAuthenticationFakeFactory({ userId: user.id });
  });

  it("should have entries for all event names", (): void => {
    Object.values(EventName).forEach((eventName: EventName): void => {
      expect(Object.keys(eventsRegistry)).toContain(eventName);
    });
  });

  describe("AuthLocalCreatedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_CREATED];
      const event = new EventClass(EventName.AUTH_LOCAL_CREATED, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_CREATED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalEmailVerificationSentEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT];
      const event = new EventClass(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalEmailVerifiedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_EMAIL_VERIFIED];
      const event = new EventClass(EventName.AUTH_LOCAL_EMAIL_VERIFIED, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFIED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalPasswordResetEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_PASSWORD_RESET];
      const event = new EventClass(
        EventName.AUTH_LOCAL_PASSWORD_RESET,
        user.id,
        authentication.id,
        user.username,
        user.email,
      );

      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESET);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.username).toBe(user.username);
      expect(event.email).toBe(user.email);
    });
  });

  describe("AuthLocalPasswordResetSentEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_PASSWORD_RESET_SENT];
      const event = new EventClass(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalPasswordResetedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_PASSWORD_RESETED];
      const event = new EventClass(EventName.AUTH_LOCAL_PASSWORD_RESETED, user.id, authentication.id);

      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESETED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
    });
  });
});
