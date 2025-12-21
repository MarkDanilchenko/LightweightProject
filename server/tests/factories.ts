import { faker } from "@faker-js/faker";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventEntity from "@server/events/events.entity";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import appConfiguration from "@server/configs/app.configuration";

// FakeFactory functions: used to create fake data for testing in memory
// without creating an instance of the entity and so without using real database connection and queries;

function buildUserFakeFactory(): UserEntity {
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

  return user;
}

function buildAuthenticationFakeFactory(relations?: { userId?: string }): AuthenticationEntity {
  const authentication: AuthenticationEntity = new AuthenticationEntity();

  authentication.id = faker.string.uuid();
  authentication.provider = faker.helpers.arrayElement([
    AuthenticationProvider.GITHUB,
    AuthenticationProvider.GOOGLE,
    AuthenticationProvider.KEYCLOAK,
    AuthenticationProvider.LOCAL,
  ]);
  authentication.refreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30"; // random jwt from https://www.jwt.io/
  authentication.createdAt = faker.date.past();
  authentication.lastAccessedAt = faker.date.recent();
  authentication.userId = relations?.userId ?? faker.string.uuid();

  switch (authentication.provider) {
    case AuthenticationProvider.LOCAL: {
      authentication.metadata = {
        local: {
          isEmailVerified: true,
          password: faker.internet.password(),
          verificationSendAt: faker.date.past(),
          verificationConfirmedAt: faker.date.recent(),
          callbackUrl: `${appConfiguration().serverConfiguration.baseUrl}/api/v1/auth/local/verification/email?token=${faker.string.uuid()}`,
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
      authentication.metadata = {};

      break;
    }
  }

  return authentication;
}

function buildEventFakeFactory(relations?: { userId?: string; modelId?: string }): EventEntity {
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
  event.userId = relations?.userId ?? faker.string.uuid();
  event.modelId = relations?.modelId ?? faker.string.uuid();

  return event;
}

// Factory functions: used to create fake data for testing with real database connection and queries;

// function buildUserFactory(userProps?: Partial<UserEntity>): UserEntity {}

// function buildAuthenticationFactory(authProps?: Partial<AuthenticationEntity>): AuthenticationEntity {}

// function buildEventFactory(eventProps?: Partial<EventEntity>): EventEntity {}

export { buildUserFakeFactory, buildAuthenticationFakeFactory, buildEventFakeFactory };
