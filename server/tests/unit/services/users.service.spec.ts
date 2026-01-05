/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Repository, UpdateResult } from "typeorm";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { buildUserFakeFactory } from "../../factories";

describe("UsersService", (): void => {
  let mockService: UsersService;
  let mockUser: UserEntity;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let dataSource: jest.Mocked<DataSource>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  beforeAll((): void => {
    mockUser = buildUserFakeFactory();
  });

  beforeEach(async (): Promise<void> => {
    mockUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;

    mockEntityManager = {
      update: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    dataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    } as unknown as jest.Mocked<DataSource>;

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    mockService = testingModule.get<UsersService>(UsersService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(mockService).toBeDefined();
    expect(mockUserRepository).toBeDefined();
    expect(dataSource).toBeDefined();
  });

  describe("findUserByPk", (): void => {
    it("should find a user by a primary key", async (): Promise<void> => {
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const result: UserEntity | null = await mockService.findUserByPk(mockUser.id);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: mockUser.id });
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found", async (): Promise<void> => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const result: UserEntity | null = await mockService.findUserByPk("7e59edc8-65cf-4817-a70e-2460d6198485");

      expect(mockUserRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: "7e59edc8-65cf-4817-a70e-2460d6198485" });
      expect(result).toBeNull();
    });
  });

  describe("findUser", (): void => {
    it("should find a user with custom options", async (): Promise<void> => {
      const options: FindOneOptions<UserEntity> = { where: { email: mockUser.email } };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result: UserEntity | null = await mockService.findUser(options);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found with custom options", async (): Promise<void> => {
      const options: FindOneOptions<UserEntity> = { where: { email: "XpEKTUd@example.com" } };
      mockUserRepository.findOne.mockResolvedValue(null);

      const result: UserEntity | null = await mockService.findUser(options);

      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toBeNull();
    });
  });

  describe("updateUser", (): void => {
    let whereCondition: FindOptionsWhere<UserEntity>;
    let values: Record<string, unknown>;
    let updateResult: UpdateResult;

    beforeAll((): void => {
      whereCondition = { id: mockUser.id };
      values = { firstName: "Abdullahi Campos" };
      updateResult = {
        affected: 1,
        raw: {},
        generatedMaps: [],
      };
    });

    it("should update a user with provided values", async (): Promise<void> => {
      mockEntityManager.update.mockResolvedValue(updateResult);

      const result: UpdateResult = await mockService.updateUser(whereCondition, values);

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockEntityManager.update).toHaveBeenCalledWith(UserEntity, whereCondition, values);
      expect(result).toEqual(updateResult);
    });

    it("should use provided entity manager when available", async (): Promise<void> => {
      const providedManager = {
        update: jest.fn().mockResolvedValue(updateResult),
      } as unknown as EntityManager;

      const result: UpdateResult = await mockService.updateUser(whereCondition, values, providedManager);

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(providedManager.update).toHaveBeenCalledWith(UserEntity, whereCondition, values);
      expect(result).toEqual(updateResult);
    });

    it("should handle transaction errors", async (): Promise<void> => {
      const error = new Error("Transaction failed");
      dataSource.transaction.mockRejectedValueOnce(error);

      await expect(mockService.updateUser(whereCondition, values)).rejects.toThrow(error);
    });
  });
});
