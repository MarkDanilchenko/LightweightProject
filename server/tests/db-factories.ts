import { faker } from "@faker-js/faker";
import { DataSource, Repository } from "typeorm";
import appConfiguration from "@server/configs/app.configuration";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventEntity from "@server/events/events.entity";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { randomValidJwt } from "./utils";

/**
 * Database factory class for creating and persisting fake data instances for testing purposes.
 * These methods generate realistic mock entities and save them to the database using TypeORM repositories.
 *
 * All methods accept optional overrides to customize specific properties and return database-persisted entities.
 */

class DbFactories {
  private readonly dataSource: DataSource;
  private readonly userRepository: Repository<UserEntity>;
  private readonly authenticationRepository: Repository<AuthenticationEntity>;
  private readonly eventRepository: Repository<EventEntity>;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    if (!this.dataSource) {
      throw new Error("DataSource is not initialized for DbFactories");
    }

    this.userRepository = this.dataSource.getRepository(UserEntity);
    this.authenticationRepository = this.dataSource.getRepository(AuthenticationEntity);
    this.eventRepository = this.dataSource.getRepository(EventEntity);
  }

  async buildUser(overrides: Partial<UserEntity> = {}): Promise<UserEntity> {
    const defaultInfo = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.string.alphanumeric(10),
      avatarUrl: faker.image.avatar(),
    };

    const user: UserEntity = this.userRepository.create({ ...defaultInfo, ...overrides });

    return this.userRepository.save(user);
  }

  async buildAuthentication(overrides: Partial<AuthenticationEntity> = {}): Promise<AuthenticationEntity> {
    let { provider, userId, metadata } = overrides;
    let user: UserEntity | null;

    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }
    } else {
      user = await this.buildUser();
      userId = user.id;
    }

    if (provider && !Object.values(AuthenticationProvider).includes(provider)) {
      throw new Error("Invalid provider");
    } else if (!provider) {
      provider = faker.helpers.arrayElement(Object.values(AuthenticationProvider));
    }

    if (!metadata || !Object.keys(metadata).length) {
      switch (provider) {
        case AuthenticationProvider.LOCAL: {
          metadata = {
            local: {
              isEmailVerified: true,
              password: faker.string.alphanumeric(64),
              callbackUrl:
                `${appConfiguration().serverConfiguration.baseUrl}` +
                `/api/v1/auth/local/verification/email?token=` +
                `${randomValidJwt({ userId, provider }, undefined, appConfiguration().jwtConfiguration.secret)}`,
              temporaryInfo: {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
              },
            },
          };

          break;
        }

        case AuthenticationProvider.GITHUB: {
          metadata = {
            github: {},
          };

          break;
        }

        case AuthenticationProvider.GOOGLE: {
          metadata = {
            google: {},
          };

          break;
        }

        case AuthenticationProvider.KEYCLOAK: {
          metadata = {
            keycloak: {},
          };

          break;
        }

        default: {
          throw new Error("Invalid provider");
        }
      }
    }

    const defaultInfo = {
      refreshToken: randomValidJwt(
        { userId, provider },
        { expiresIn: appConfiguration().jwtConfiguration.refreshTokenExpiresIn },
        appConfiguration().jwtConfiguration.secret,
      ),
    };

    const authentication: AuthenticationEntity = this.authenticationRepository.create({
      ...defaultInfo,
      ...overrides,
      userId,
      provider,
      metadata,
    });

    return this.authenticationRepository.save(authentication);
  }

  async buildEvent(overrides: Partial<EventEntity> = {}): Promise<EventEntity> {
    let { name, userId } = overrides;

    if (!name || !Object.keys(EventName).includes(name)) {
      name = faker.helpers.arrayElement([
        EventName.AUTH_LOCAL_CREATED,
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        EventName.AUTH_LOCAL_EMAIL_VERIFIED,
        EventName.AUTH_LOCAL_PASSWORD_RESET,
        EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
        EventName.AUTH_LOCAL_PASSWORD_RESETED,
      ]);
    }

    if (userId) {
      const user: UserEntity | null = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }
    } else {
      const user: UserEntity = await this.buildUser();
      userId = user.id;
    }

    const defaultInfo = {
      metadata: {},
      modelId: faker.string.uuid(),
    };

    const event: EventEntity = this.eventRepository.create({ ...defaultInfo, ...overrides, name, userId });

    return this.eventRepository.save(event);
  }
}

export default DbFactories;
