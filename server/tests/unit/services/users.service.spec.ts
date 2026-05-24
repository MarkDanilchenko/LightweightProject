/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { faker } from "@faker-js/faker";
import UsersService from "#server/users/users.service";
import UserEntity from "#server/users/users.entity";
import AuthenticationEntity from "#server/auth/auth.entity";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import TokensService from "#server/tokens/tokens.service";
import EventsService from "#server/events/events.service";
import { RMQ_MICROSERVICE } from "#server/configs/constants";
import { UserDeactivateDto, UserDeleteDto } from "#server/auth/dto/auth.dto";
import { TokenPayload } from "#server/tokens/interfaces/token.interfaces";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import { EventName } from "#server/events/interfaces/events.interfaces";

describe("UsersService", (): void => {
  const mockEntityManager = {
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;
  let usersService: UsersService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let tokensService: jest.Mocked<TokensService>;
  let eventsService: jest.Mocked<EventsService>;
  let rmqMicroserviceClient: jest.Mocked<ClientProxy>;
  let authentication: AuthenticationEntity;
  let user: UserEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({
      userId: user.id,
      provider: AuthenticationProvider.LOCAL,
    });
    user.authentications = [authentication];

    const mockUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    } as unknown as jest.Mocked<DataSource>;

    const mockTokensService = {
      addToBlacklist: jest.fn(),
    } as unknown as jest.Mocked<TokensService>;

    const mockEventsService = {
      buildInstance: jest.fn(),
    } as unknown as jest.Mocked<EventsService>;

    const mockRmqMicroserviceClient = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: TokensService, useValue: mockTokensService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: RMQ_MICROSERVICE, useValue: mockRmqMicroserviceClient },
      ],
    }).compile();

    usersService = testingModule.get<UsersService>(UsersService);
    userRepository = testingModule.get<jest.Mocked<Repository<UserEntity>>>(getRepositoryToken(UserEntity));
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
    tokensService = testingModule.get<jest.Mocked<TokensService>>(TokensService);
    eventsService = testingModule.get<jest.Mocked<EventsService>>(EventsService);
    rmqMicroserviceClient = testingModule.get<jest.Mocked<ClientProxy>>(RMQ_MICROSERVICE);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(usersService).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(dataSource).toBeDefined();
    expect(tokensService).toBeDefined();
    expect(eventsService).toBeDefined();
    expect(rmqMicroserviceClient).toBeDefined();
  });

  describe("findUserByPk", (): void => {
    it("should find a user by a primary key", async (): Promise<void> => {
      userRepository.findOneBy.mockResolvedValue(user);

      const result: UserEntity | null = await usersService.findUserByPk(user.id);

      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: user.id });
      expect(result).toEqual(user);
    });

    it("should find a user by a primary key with provided entity manager", async (): Promise<void> => {
      const providedManager = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as EntityManager;

      const result: UserEntity | null = await usersService.findUserByPk(user.id, providedManager);

      expect(userRepository.findOneBy).not.toHaveBeenCalled();
      expect(providedManager.findOne).toHaveBeenCalledTimes(1);
      expect(providedManager.findOne).toHaveBeenCalledWith(UserEntity, { where: { id: user.id } });
      expect(result).toEqual(user);
    });

    it("should return null when user not found", async (): Promise<void> => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result: UserEntity | null = await usersService.findUserByPk("7e59edc8-65cf-4817-a70e-2460d6198485");

      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: "7e59edc8-65cf-4817-a70e-2460d6198485" });
      expect(result).toBeNull();
    });
  });

  describe("findUser", (): void => {
    it("should find a user with custom options", async (): Promise<void> => {
      const options: FindOneOptions<UserEntity> = { where: { email: user.email } };

      userRepository.findOne.mockResolvedValue(user);

      const result: UserEntity | null = await usersService.findUser(options);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toEqual(user);
    });

    it("should find a user with custom options and provided entity manager", async (): Promise<void> => {
      const options: FindOneOptions<UserEntity> = { where: { email: user.email } };
      const providedManager = {
        findOne: jest.fn().mockResolvedValue(user),
      } as unknown as EntityManager;

      const result: UserEntity | null = await usersService.findUser(options, providedManager);

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(providedManager.findOne).toHaveBeenCalledTimes(1);
      expect(providedManager.findOne).toHaveBeenCalledWith(UserEntity, options);
      expect(result).toEqual(user);
    });

    it("should return null when user not found with custom options", async (): Promise<void> => {
      const options: FindOneOptions<UserEntity> = { where: { email: "XpEKTUd@example.com" } };

      userRepository.findOne.mockResolvedValue(null);

      const result: UserEntity | null = await usersService.findUser(options);

      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      expect(userRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toBeNull();
    });
  });

  describe("updateUser", (): void => {
    let whereCondition: FindOptionsWhere<UserEntity>;
    let values: Record<string, any>;
    let updateResult: UpdateResult;

    beforeEach((): void => {
      whereCondition = { id: user.id };
      values = { firstName: "Abdullahi Campos" };
      updateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
    });

    it("should update a user with provided values", async (): Promise<void> => {
      userRepository.update.mockResolvedValue(updateResult);

      const result: UpdateResult = await usersService.updateUser(whereCondition, values);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(userRepository.update).toHaveBeenCalledWith(whereCondition, values);
      expect(result).toEqual(updateResult);
    });

    it("should use provided entity manager when available", async (): Promise<void> => {
      const providedManager = {
        update: jest.fn().mockResolvedValue(updateResult),
      } as unknown as EntityManager;

      const result: UpdateResult = await usersService.updateUser(whereCondition, values, providedManager);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(providedManager.update).toHaveBeenCalledWith(UserEntity, whereCondition, values);
      expect(result).toEqual(updateResult);
    });

    it("should handle update errors", async (): Promise<void> => {
      const error = new Error("Update failed");

      userRepository.update.mockRejectedValueOnce(error);

      await expect(usersService.updateUser(whereCondition, values)).rejects.toThrow(error);
    });
  });

  describe("deleteUserSoft", (): void => {
    let whereCondition: FindOptionsWhere<UserEntity>;
    let updateResult: UpdateResult;

    beforeEach((): void => {
      whereCondition = { id: user.id };
      updateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
    });

    it("should soft delete a user", async (): Promise<void> => {
      userRepository.softDelete.mockResolvedValue(updateResult);

      const result: UpdateResult = await usersService.deleteUserSoft(whereCondition);

      expect(userRepository.softDelete).toHaveBeenCalledWith(whereCondition);
      expect(result).toEqual(updateResult);
    });

    it("should soft delete a user with provided entity manager", async (): Promise<void> => {
      const providedManager = {
        softDelete: jest.fn().mockResolvedValue(updateResult),
      } as unknown as EntityManager;

      const result: UpdateResult = await usersService.deleteUserSoft(whereCondition, providedManager);

      expect(userRepository.softDelete).not.toHaveBeenCalled();
      expect(providedManager.softDelete).toHaveBeenCalledWith(UserEntity, whereCondition);
      expect(result).toEqual(updateResult);
    });
  });

  describe("restoreUser", (): void => {
    let whereCondition: FindOptionsWhere<UserEntity>;
    let updateResult: UpdateResult;

    beforeEach((): void => {
      whereCondition = { id: user.id };
      updateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
    });

    it("should restore a soft-deleted user", async (): Promise<void> => {
      const mockRestore = jest.fn().mockResolvedValue(updateResult);
      userRepository.restore = mockRestore;

      const result: UpdateResult = await usersService.restoreUser(whereCondition);

      expect(mockRestore).toHaveBeenCalledWith(whereCondition);
      expect(result).toEqual(updateResult);
    });

    it("should restore a soft-deleted user with provided entity manager", async (): Promise<void> => {
      const providedManager = {
        restore: jest.fn().mockResolvedValue(updateResult),
      } as unknown as EntityManager;

      const result: UpdateResult = await usersService.restoreUser(whereCondition, providedManager);

      expect(providedManager.restore).toHaveBeenCalledWith(UserEntity, whereCondition);
      expect(result).toEqual(updateResult);
    });
  });

  describe("deactivateUserProfile", (): void => {
    let payload: TokenPayload;
    let userDeactivateDto: UserDeactivateDto;

    beforeEach((): void => {
      payload = {
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
        jwti: faker.string.uuid(),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      userDeactivateDto = { confirmationWord: "deactivate" };
    });

    it("should deactivate profile successfully", async (): Promise<void> => {
      userRepository.findOne.mockResolvedValue(user);

      await usersService.deactivateUserProfile(payload, userDeactivateDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        relations: { authentications: true },
        select: {
          id: true,
          username: true,
          isDeactivated: true,
          email: true,
          authentications: {
            id: true,
            metadata: true,
          },
        },
        where: { id: user.id },
      });
      expect(mockEntityManager.update).toHaveBeenCalledWith(UserEntity, { id: user.id }, { isDeactivated: true });
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        AuthenticationEntity,
        { userId: user.id },
        {
          refreshToken: null,
          lastAccessedAt: expect.any(Function),
        },
      );
      expect(tokensService.addToBlacklist).toHaveBeenCalledWith(payload.jwti, payload.exp);
      expect(rmqMicroserviceClient.emit).toHaveBeenCalled();
      expect(eventsService.buildInstance).toHaveBeenCalledWith(EventName.USER_DEACTIVATED, user.id, user.id, {
        email: user.email,
        username: user.username,
      });
    });

    it("should throw BadRequestException for invalid confirmation word", async (): Promise<void> => {
      userDeactivateDto.confirmationWord = "invalid";

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new BadRequestException("Deactivation failed. Invalid confirmation word."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid token (missing jwti)", async (): Promise<void> => {
      delete payload.jwti;

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new UnauthorizedException("Token is invalid."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid token (missing exp)", async (): Promise<void> => {
      delete payload.exp;

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new UnauthorizedException("Token is invalid."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user not found", async (): Promise<void> => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new UnauthorizedException("User is not found."),
      );
    });

    it("should throw UnauthorizedException if user has no authentications", async (): Promise<void> => {
      user.authentications = [];
      userRepository.findOne.mockResolvedValue(user);

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new UnauthorizedException("User is not found."),
      );
    });

    it("should throw BadRequestException if user is already deactivated", async (): Promise<void> => {
      user.isDeactivated = true;
      userRepository.findOne.mockResolvedValue(user);

      await expect(usersService.deactivateUserProfile(payload, userDeactivateDto)).rejects.toThrow(
        new BadRequestException("User's profile is already deactivated."),
      );
    });
  });

  describe("deleteUserProfile", (): void => {
    let payload: TokenPayload;
    let userDeleteDto: UserDeleteDto;

    beforeEach((): void => {
      payload = {
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
        jwti: faker.string.uuid(),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      userDeleteDto = { confirmationWord: "delete" };
    });

    it("should delete profile successfully", async (): Promise<void> => {
      userRepository.findOne.mockResolvedValue(user);

      await usersService.deleteUserProfile(payload, userDeleteDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        relations: { authentications: true },
        select: {
          id: true,
          username: true,
          email: true,
          deletedAt: true,
          authentications: {
            id: true,
            metadata: true,
          },
        },
        where: { id: user.id },
      });
      expect(mockEntityManager.softDelete).toHaveBeenCalledWith(UserEntity, { id: user.id });
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        AuthenticationEntity,
        { userId: user.id },
        {
          refreshToken: null,
          lastAccessedAt: expect.any(Function),
        },
      );
      expect(tokensService.addToBlacklist).toHaveBeenCalledWith(payload.jwti, payload.exp);
      expect(rmqMicroserviceClient.emit).toHaveBeenCalled();
      expect(eventsService.buildInstance).toHaveBeenCalledWith(EventName.USER_DELETED, user.id, user.id, {
        email: user.email,
        username: user.username,
      });
    });

    it("should throw BadRequestException for invalid confirmation word", async (): Promise<void> => {
      userDeleteDto.confirmationWord = "invalid";

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new BadRequestException("Deletion failed. Invalid confirmation word."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid token (missing jwti)", async (): Promise<void> => {
      delete payload.jwti;

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new UnauthorizedException("Token is invalid."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid token (missing exp)", async (): Promise<void> => {
      delete payload.exp;

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new UnauthorizedException("Token is invalid."),
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user not found", async (): Promise<void> => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new UnauthorizedException("User is not found."),
      );
    });

    it("should throw UnauthorizedException if user has no authentications", async (): Promise<void> => {
      user.authentications = [];
      userRepository.findOne.mockResolvedValue(user);

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new UnauthorizedException("User is not found."),
      );
    });

    it("should throw BadRequestException if user is already deleted", async (): Promise<void> => {
      user.deletedAt = new Date();
      userRepository.findOne.mockResolvedValue(user);

      await expect(usersService.deleteUserProfile(payload, userDeleteDto)).rejects.toThrow(
        new BadRequestException("User's profile is already deleted."),
      );
    });
  });
});
