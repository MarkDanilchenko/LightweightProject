/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { DataSource, EntityManager } from "typeorm";
import CronService from "#server/services/cron/cron.service";
import UsersService from "#server/users/users.service";
import UserEntity from "#server/users/users.entity";
import { buildUserFactory } from "../../factories";

describe("CronService", (): void => {
  let cronService: CronService;
  let usersService: jest.Mocked<UsersService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockEntityManager = {
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    query: jest.fn(),
  } as unknown as jest.Mocked<EntityManager>;

  beforeEach(async (): Promise<void> => {
    const mockUsersService = {
      findUsers: jest.fn(),
      anonymizeUserProfile: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((callback) => callback(mockEntityManager)),
    } as unknown as jest.Mocked<DataSource>;

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    cronService = testingModule.get<CronService>(CronService);
    usersService = testingModule.get<jest.Mocked<UsersService>>(UsersService);
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(cronService).toBeDefined();
    expect(usersService).toBeDefined();
    expect(dataSource).toBeDefined();
  });

  describe("handleDailyUsersAnonymization", (): void => {
    let users: UserEntity[];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    beforeEach((): void => {
      const user1: UserEntity = buildUserFactory({
        deletedAt: new Date(thirtyDaysAgo.getTime() - 86400000),
        anonymizedAt: null,
      });

      const user2: UserEntity = buildUserFactory({
        deletedAt: new Date(thirtyDaysAgo.getTime() - 172800000),
        anonymizedAt: null,
      });

      const user3: UserEntity = buildUserFactory({
        deletedAt: new Date(thirtyDaysAgo.getTime() - 259200000),
        anonymizedAt: null,
      });

      users = [user1, user2, user3];
    });

    it("should anonymize users deleted more than 30 days ago", async (): Promise<void> => {
      usersService.findUsers.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(usersService.findUsers).toHaveBeenCalledTimes(2);
      expect(usersService.anonymizeUserProfile).toHaveBeenCalledTimes(3);
      expect(usersService.anonymizeUserProfile).toHaveBeenCalledWith(users[0], mockEntityManager);
      expect(usersService.anonymizeUserProfile).toHaveBeenCalledWith(users[1], mockEntityManager);
      expect(usersService.anonymizeUserProfile).toHaveBeenCalledWith(users[2], mockEntityManager);
    });

    it("should stop processing when no more eligible users are found", async (): Promise<void> => {
      usersService.findUsers.mockResolvedValue([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(usersService.findUsers).toHaveBeenCalledTimes(1);
      expect(usersService.anonymizeUserProfile).not.toHaveBeenCalled();
    });

    it("should skip users that are already anonymized", async (): Promise<void> => {
      const alreadyAnonymizedUser: UserEntity = buildUserFactory({
        deletedAt: new Date(thirtyDaysAgo.getTime() - 86400000),
        anonymizedAt: new Date(),
      });

      usersService.findUsers.mockResolvedValue([alreadyAnonymizedUser]).mockResolvedValueOnce([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(usersService.anonymizeUserProfile).not.toHaveBeenCalled();
    });

    it("should skip users deleted less than 30 days ago", async (): Promise<void> => {
      const recentlyDeletedUser: UserEntity = buildUserFactory({
        deletedAt: new Date(Date.now() - 172800000),
        anonymizedAt: null,
      });

      usersService.findUsers.mockResolvedValue([recentlyDeletedUser]).mockResolvedValueOnce([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(usersService.anonymizeUserProfile).not.toHaveBeenCalled();
    });

    it("should use default batch size when CRON_USER_ANONYMIZATION_BATCH is not set", async (): Promise<void> => {
      usersService.findUsers.mockResolvedValue([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(usersService.findUsers).toHaveBeenCalledWith(expect.objectContaining({ take: 25 }), mockEntityManager);
    });

    it("should run anonymization within a database transaction", async (): Promise<void> => {
      usersService.findUsers.mockResolvedValue(users).mockResolvedValueOnce([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      await cronService.handleDailyUsersAnonymization();

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(dataSource.transaction).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should handle errors gracefully without throwing", async (): Promise<void> => {
      const error: Error = new Error("Anonymization failed");
      usersService.findUsers.mockRejectedValue(error);

      await expect(cronService.handleDailyUsersAnonymization()).resolves.toBeUndefined();
    });

    it("should log the start and completion of the anonymization job", async (): Promise<void> => {
      usersService.findUsers.mockResolvedValueOnce(users).mockResolvedValueOnce([]);
      usersService.anonymizeUserProfile.mockResolvedValue();

      const logSpy: jest.SpyInstance = jest.spyOn((cronService as any).logger, "log");

      await cronService.handleDailyUsersAnonymization();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Starting users' anonymization job"));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("finished"));
    });

    it("should log errors that occur during anonymization", async (): Promise<void> => {
      const error: Error = new Error("Anonymization failed");
      error.stack = "Error: Anonymization failed\n    at test";
      usersService.findUsers.mockRejectedValue(error);

      const errorSpy: jest.SpyInstance = jest.spyOn((cronService as any).logger, "error");

      await cronService.handleDailyUsersAnonymization();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error during scheduled users' anonymization job"),
        expect.any(String),
      );
    });
  });
});
