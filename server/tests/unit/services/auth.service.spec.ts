/* eslint-disable @typescript-eslint/unbound-method */
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import AuthService from "@server/auth/auth.service";
import { Test, TestingModule } from "@nestjs/testing";
import { buildAuthenticationFakeFactory, buildUserFakeFactory } from "../../factories";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { DataSource, EntityManager, Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { RMQ_MICROSERVICE } from "@server/configs/constants";
import TokensService from "@server/tokens/tokens.service";
import UsersService from "@server/users/users.service";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

jest.mock("@server/utils/hasher", () => ({
  hash: jest.fn().mockImplementation((password: string): Promise<string> => Promise.resolve("hashed-password")),
}));

describe("AuthService", (): void => {
  let authService: AuthService;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: jest.Mocked<EntityManager>;
  let authenticationRepository: jest.Mocked<Repository<AuthenticationEntity>>;
  let rmqMicroserviceClient: jest.Mocked<ClientProxy>;
  let tokensService: jest.Mocked<TokensService>;
  let usersService: jest.Mocked<UsersService>;
  let eventsService: jest.Mocked<EventsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFakeFactory();
    authentication = buildAuthenticationFakeFactory({
      userId: user.id,
      provider: AuthenticationProvider.LOCAL,
    });
    user.authentications = [authentication];

    entityManager = {
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(entityManager)),
    } as unknown as jest.Mocked<DataSource>;

    authenticationRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<AuthenticationEntity>>;

    rmqMicroserviceClient = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    tokensService = {
      verify: jest.fn(),
      decode: jest.fn(),
      generate: jest.fn(),
      addToBlacklist: jest.fn(),
      isBlacklisted: jest.fn(),
      jwtAccessTokenExpiresIn: "24h",
      jwtRefreshTokenExpiresIn: "7d",
    } as unknown as jest.Mocked<TokensService>;

    usersService = {
      findUser: jest.fn(),
      updateUser: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    eventsService = {
      buildInstance: jest.fn().mockReturnValue({}),
      createEvent: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(AuthenticationEntity), useValue: authenticationRepository },
        { provide: RMQ_MICROSERVICE, useValue: rmqMicroserviceClient },
        { provide: TokensService, useValue: tokensService },
        { provide: UsersService, useValue: usersService },
        { provide: EventsService, useValue: eventsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    authService = testingModule.get<AuthService>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(authService).toBeDefined();
  });
});
