/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { buildUserFactory } from "../../factories";

describe("UsersService", (): void => {
  const user: UserEntity = buildUserFactory();
  const mockEntityManager: jest.Mocked<EntityManager> = {
    update: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;
  let usersService: UsersService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async (): Promise<void> => {
    const mockUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    } as unknown as jest.Mocked<DataSource>;

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    usersService = testingModule.get<UsersService>(UsersService);
    userRepository = testingModule.get<jest.Mocked<Repository<UserEntity>>>(getRepositoryToken(UserEntity));
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(usersService).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(dataSource).toBeDefined();
  });

  describe("findUserByPk", (): void => {
    it("should find a user by a primary key", async (): Promise<void> => {
      userRepository.findOneBy.mockResolvedValue(user);

      const result: UserEntity | null = await usersService.findUserByPk(user.id);

      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: user.id });
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
    const whereCondition: FindOptionsWhere<UserEntity> = { id: user.id };
    const values: Record<string, any> = { firstName: "Abdullahi Campos" };
    const updateResult: UpdateResult = {
      affected: 1,
      raw: {},
      generatedMaps: [],
    };

    it("should update a user with provided values", async (): Promise<void> => {
      mockEntityManager.update.mockResolvedValue(updateResult);

      const result: UpdateResult = await usersService.updateUser(whereCondition, values);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.update).toHaveBeenCalledWith(UserEntity, whereCondition, values);
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

    it("should handle transaction errors", async (): Promise<void> => {
      const error = new Error("Transaction failed");

      dataSource.transaction.mockRejectedValueOnce(error);

      await expect(usersService.updateUser(whereCondition, values)).rejects.toThrow(error);
    });
  });
});
