import { faker } from "@faker-js/faker";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventEntity from "@server/events/events.entity";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import appConfiguration from "@server/configs/app.configuration";
import { randomValidJwt } from "./utils";

/**
 * Factory functions for creating fake data instances for testing purposes.
 * These functions generate realistic mock entities in memory without database connection & operations.
 *
 * All functions accept optional overrides to customize specific properties.
 */

function buildUserFactory(overrides: Partial<UserEntity> = {}): UserEntity {
  const user = new UserEntity();

  user.id = faker.string.uuid();
  user.email = faker.internet.email();
  user.firstName = faker.person.firstName();
  user.lastName = faker.person.lastName();
  user.username = faker.string.alphanumeric(10);
  user.avatarUrl = faker.image.avatar();
  user.createdAt = faker.date.past();
  user.updatedAt = faker.date.recent();
  user.deletedAt = null;

  Object.assign(user, overrides);

  return user;
}

function buildAuthenticationFactory(overrides: Partial<AuthenticationEntity> = {}): AuthenticationEntity {
  const authentication: AuthenticationEntity = new AuthenticationEntity();

  authentication.id = faker.string.uuid();
  authentication.provider = faker.helpers.arrayElement([
    AuthenticationProvider.GITHUB,
    AuthenticationProvider.GOOGLE,
    AuthenticationProvider.KEYCLOAK,
    AuthenticationProvider.LOCAL,
  ]);
  authentication.createdAt = faker.date.past();
  authentication.lastAccessedAt = faker.date.recent();
  authentication.userId = faker.string.uuid();

  Object.assign(authentication, overrides);

  authentication.refreshToken = randomValidJwt(
    { userId: authentication.userId, provider: authentication.provider },
    { expiresIn: appConfiguration().jwtConfiguration.refreshTokenExpiresIn },
  );

  if (!overrides.metadata || !Object.keys(overrides.metadata).length) {
    switch (authentication.provider) {
      case AuthenticationProvider.LOCAL: {
        authentication.metadata = {
          local: {
            isEmailVerified: true,
            password: faker.internet.password(),
            verificationSendAt: faker.date.past(),
            verificationConfirmedAt: faker.date.recent(),
            callbackUrl: `${appConfiguration().serverConfiguration.baseUrl}/api/v1/auth/local/verification/email?token=${randomValidJwt({ userId: authentication.userId, provider: authentication.provider })}`,
            temporaryInfo: {
              username: faker.internet.username(),
              firstName: faker.person.firstName(),
              lastName: faker.person.lastName(),
              avatarUrl: faker.image.avatar(),
            },
          },
        };

        break;
      }

      case AuthenticationProvider.GITHUB: {
        authentication.metadata = {
          github: {},
        };

        break;
      }

      case AuthenticationProvider.GOOGLE: {
        authentication.metadata = {
          google: {},
        };

        break;
      }

      case AuthenticationProvider.KEYCLOAK: {
        authentication.metadata = {
          keycloak: {},
        };

        break;
      }

      default: {
        throw new Error("Invalid provider");
      }
    }
  }

  return authentication;
}

function buildEventFactory(overrides: Partial<EventEntity> = {}): EventEntity {
  const event = new EventEntity();

  event.id = faker.string.uuid();
  event.name = faker.helpers.arrayElement([
    EventName.AUTH_LOCAL_CREATED,
    EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
    EventName.AUTH_LOCAL_EMAIL_VERIFIED,
    EventName.AUTH_LOCAL_PASSWORD_RESET,
    EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
    EventName.AUTH_LOCAL_PASSWORD_RESETED,
  ]);
  event.metadata = {};
  event.createdAt = faker.date.past();
  event.userId = faker.string.uuid();
  event.modelId = faker.string.uuid();

  Object.assign(event, overrides);

  return event;
}

export { buildUserFactory, buildAuthenticationFactory, buildEventFactory };
