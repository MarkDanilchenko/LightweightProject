import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import UserEntity from "@server/users/users.entity";
import { buildUserFakeFactory } from "../../factories";

describe("UserEntity", (): void => {
  let userRepository: Repository<UserEntity>;

  beforeAll(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(UserEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    userRepository = testingModule.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  it("User repository should be defined", (): void => {
    expect(userRepository).toBeDefined();
  });

  describe("UserEntity structure", (): void => {
    let user: UserEntity;

    beforeAll((): void => {
      user = buildUserFakeFactory();
    });

    it("should have an id in uuid v4 format", (): void => {
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe("string");
      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have an email", (): void => {
      expect(user.email).toBeDefined();
      expect(typeof user.email).toBe("string");
      expect(user.email).toContain("@");
    });

    it("should have optional username", (): void => {
      expect(user.username).toBeDefined();
      expect(typeof user.username).toBe("string");
    });

    it("should have optional both firstName and lastName", (): void => {
      expect(user.firstName).toBeDefined();
      expect(user.lastName).toBeDefined();
      expect(typeof user.firstName).toBe("string");
      expect(typeof user.lastName).toBe("string");
    });

    it("should have timestamps", (): void => {
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
      expect(user.updatedAt.getTime()).toBeLessThanOrEqual(new Date().getTime());
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
    });

    it("should have optional avatarUrl", (): void => {
      expect(user.avatarUrl).toBeDefined();
      expect(typeof user.avatarUrl).toBe("string");
      expect(user.avatarUrl).toMatch(/^http(s)?:\/\//);
    });
  });

  describe("UserEntity validation", (): void => {
    let user: UserEntity;

    beforeAll((): void => {
      user = buildUserFakeFactory();
    });

    it("should successfully validate when all properties are valid", async (): Promise<void> => {
      expect(user).toBeInstanceOf(UserEntity);

      await expect(user.validate()).resolves.not.toThrow();
    });

    it("should throw an error when some property is invalid", async (): Promise<void> => {
      expect(user).toBeInstanceOf(UserEntity);
      user.email = "invalid email";

      await expect(user.validate()).rejects.toThrow();
    });
  });
});
