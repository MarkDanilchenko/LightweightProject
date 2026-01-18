/* eslint-disable @typescript-eslint/unbound-method */
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import AuthService from "@server/auth/auth.service";
import { Test, TestingModule } from "@nestjs/testing";
import { buildAuthenticationFakeFactory, buildUserFakeFactory } from "../../factories";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { RMQ_MICROSERVICE } from "@server/configs/constants";
import TokensService from "@server/tokens/tokens.service";
import UsersService from "@server/users/users.service";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomValidJwt } from "../../helpers";
import { faker } from "@faker-js/faker";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { BadRequestException } from "@nestjs/common";

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

  describe("updateAuthentication", (): void => {
    let whereCondition: FindOptionsWhere<AuthenticationEntity>;
    let values: Record<string, unknown>;
    let updateResult: UpdateResult;

    beforeEach((): void => {
      whereCondition = { id: authentication.id };
      values = { refreshToken: randomValidJwt() };
      updateResult = { affected: 1, raw: {}, generatedMaps: [] };
      entityManager.update.mockResolvedValue(updateResult);
    });

    it("should update authentication via transaction when no manager provided", async (): Promise<void> => {
      const result: UpdateResult = await authService.updateAuthentication(whereCondition, values);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(entityManager.update).toHaveBeenCalledWith(AuthenticationEntity, whereCondition, values);
      expect(result).toEqual(updateResult);
    });

    it("should use provided manager instead of starting new transaction", async (): Promise<void> => {
      const providedManager = {
        update: jest.fn().mockResolvedValue(updateResult),
      } as unknown as EntityManager;

      const result: UpdateResult = await authService.updateAuthentication(whereCondition, values, providedManager);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(providedManager.update).toHaveBeenCalledWith(AuthenticationEntity, whereCondition, values);
      expect(result).toEqual(updateResult);
    });
  });

  describe("findAuthenticationByPk", (): void => {
    it("should find authentication by primary key", async (): Promise<void> => {
      authenticationRepository.findOneBy.mockResolvedValue(authentication);

      const result: AuthenticationEntity | null = await authService.findAuthenticationByPk(authentication.id);

      expect(authenticationRepository.findOneBy).toHaveBeenCalledWith({ id: authentication.id });
      expect(result).toEqual(authentication);
    });

    it("should return null when authentication not found", async (): Promise<void> => {
      const notExistingUuid = faker.string.uuid();
      authenticationRepository.findOneBy.mockResolvedValue(null);

      const result: AuthenticationEntity | null = await authService.findAuthenticationByPk(notExistingUuid);

      expect(authenticationRepository.findOneBy).toHaveBeenCalledWith({ id: notExistingUuid });
      expect(result).toBeNull();
    });
  });

  describe("findAuthentication", (): void => {
    it("should find authentication with options", async (): Promise<void> => {
      const options: FindOneOptions<AuthenticationEntity> = { where: { userId: user.id } };
      authenticationRepository.findOne.mockResolvedValue(authentication);

      const result: AuthenticationEntity | null = await authService.findAuthentication(options);

      expect(authenticationRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toEqual(authentication);
    });

    it("should return null when authentication not found", async (): Promise<void> => {
      const options: FindOneOptions<AuthenticationEntity> = { where: { userId: faker.string.uuid() } };
      authenticationRepository.findOne.mockResolvedValue(null);

      const result: AuthenticationEntity | null = await authService.findAuthentication(options);

      expect(authenticationRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toBeNull();
    });
  });

  describe("localSignUp", (): void => {
    it("should create user and authentication when user does not exist", async (): Promise<void> => {
      usersService.findUser.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      (entityManager.create as jest.Mock)
        .mockReturnValueOnce({ id: user.id, email: user.email })
        .mockReturnValueOnce(authentication);

      await authService.localSignUp({
        username: user.username!,
        firstName: user.firstName!,
        lastName: user.lastName!,
        email: user.email,
        avatarUrl: user.avatarUrl!,
        password: authentication.metadata.local!.password!,
      });

      expect(usersService.findUser).toHaveBeenCalledTimes(2);
      expect(entityManager.create).toHaveBeenCalledTimes(2);
      expect(entityManager.save).toHaveBeenCalledTimes(2);
      expect(rmqMicroserviceClient.emit).toHaveBeenCalledWith(EventName.AUTH_LOCAL_CREATED, expect.any(Object));
    });

    it("should throw BadRequestException when username already taken", async (): Promise<void> => {
      usersService.findUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: user.id } as UserEntity);

      await expect(
        authService.localSignUp({
          username: user.username!,
          firstName: user.firstName!,
          lastName: user.lastName!,
          email: user.email,
          avatarUrl: user.avatarUrl!,
          password: authentication.metadata.local!.password!,
        }),
      ).rejects.toThrow(new BadRequestException("Username is already taken."));
    });

    it("should throw BadRequestException when local auth already verified", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = true;

      usersService.findUser.mockResolvedValue(user);

      await expect(
        authService.localSignUp({
          username: user.username!,
          firstName: user.firstName!,
          lastName: user.lastName!,
          email: user.email,
          avatarUrl: user.avatarUrl!,
          password: authentication.metadata.local!.password!,
        }),
      ).rejects.toThrow(
        new BadRequestException("Already signed up. Please, sign in with local authentication credentials."),
      );
    });

    it("should throw BadRequestException when local auth exists but not verified", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = false;

      usersService.findUser.mockResolvedValue(user);

      await expect(
        authService.localSignUp({
          username: user.username!,
          firstName: user.firstName!,
          lastName: user.lastName!,
          email: user.email,
          avatarUrl: user.avatarUrl!,
          password: authentication.metadata.local!.password!,
        }),
      ).rejects.toThrow(new BadRequestException("Already signed up. Email verification is required to proceed."));
    });
  });
});
