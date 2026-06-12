import { eventsRegistry } from "#server/events/events.factory";
import { EventName } from "#server/events/interfaces/events.interfaces";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import UserEntity from "#server/users/users.entity";
import AuthenticationEntity from "#server/auth/auth.entity";

describe("EventsFactory Utility", (): void => {
  const user: UserEntity = buildUserFactory();
  const authentication: AuthenticationEntity = buildAuthenticationFactory({ userId: user.id });

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

  describe("AuthLocalEmailVerificationConfirmedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED];
      const event = new EventClass(
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED,
        user.id,
        authentication.id,
        metadata,
      );

      expect(event.name).toBe(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalPasswordResetEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_PASSWORD_RESET];
      const event = new EventClass(EventName.AUTH_LOCAL_PASSWORD_RESET, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESET);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
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

  describe("AuthLocalPasswordResetConfirmedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED];
      const event = new EventClass(EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED, user.id, authentication.id, {
        email: user.email,
      });

      expect(event.name).toBe(EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual({ email: user.email });
    });
  });

  describe("UserDeactivatedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.USER_DEACTIVATED];
      const event = new EventClass(EventName.USER_DEACTIVATED, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.USER_DEACTIVATED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("UserReactivatedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.USER_REACTIVATED];
      const event = new EventClass(EventName.USER_REACTIVATED, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.USER_REACTIVATED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalReactivationEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_REACTIVATION];
      const event = new EventClass(EventName.AUTH_LOCAL_REACTIVATION, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_REACTIVATION);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalReactivationSentEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_REACTIVATION_SENT];
      const event = new EventClass(EventName.AUTH_LOCAL_REACTIVATION_SENT, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_REACTIVATION_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("UserDeletedEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.USER_DELETED];
      const event = new EventClass(EventName.USER_DELETED, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.USER_DELETED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalRestorationEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = {
        username: user.username,
        email: user.email,
      };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_RESTORATION];
      const event = new EventClass(EventName.AUTH_LOCAL_RESTORATION, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_RESTORATION);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("AuthLocalRestorationSentEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.AUTH_LOCAL_RESTORATION_SENT];
      const event = new EventClass(EventName.AUTH_LOCAL_RESTORATION_SENT, user.id, authentication.id, metadata);

      expect(event.name).toBe(EventName.AUTH_LOCAL_RESTORATION_SENT);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(authentication.id);
      expect(event.metadata).toEqual(metadata);
    });
  });

  describe("UserRestoredEvent", (): void => {
    it("should create an instance with correct properties", (): void => {
      const metadata = { email: user.email };

      const EventClass = eventsRegistry[EventName.USER_RESTORED];
      const event = new EventClass(EventName.USER_RESTORED, user.id, user.id, metadata);

      expect(event.name).toBe(EventName.USER_RESTORED);
      expect(event.userId).toBe(user.id);
      expect(event.modelId).toBe(user.id);
      expect(event.metadata).toEqual(metadata);
    });
  });
});
