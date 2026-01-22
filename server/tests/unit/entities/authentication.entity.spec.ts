import { Repository } from "typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { buildAuthenticationFakeFactory } from "../../factories";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

describe("Authentication Entity", (): void => {
  let authenticationRepository: Repository<AuthenticationEntity>;

  beforeEach(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [{ provide: getRepositoryToken(AuthenticationEntity), useClass: Repository }],
    }).compile();

    authenticationRepository = testingModule.get<Repository<AuthenticationEntity>>(
      getRepositoryToken(AuthenticationEntity),
    );
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("Authentication repository should be defined", (): void => {
    expect(authenticationRepository).toBeDefined();
  });

  describe("AuthenticationEntity structure", (): void => {
    const authentication: AuthenticationEntity = buildAuthenticationFakeFactory();

    it("should have an id in uuid v4 format", (): void => {
      expect(authentication.id).toBeDefined();
      expect(typeof authentication.id).toBe("string");
      expect(authentication.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have a userId in uuid v4 format", (): void => {
      expect(authentication.userId).toBeDefined();
      expect(typeof authentication.userId).toBe("string");
      expect(authentication.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("should have a valid provider", (): void => {
      expect(authentication.provider).toBeDefined();
      expect(typeof authentication.provider).toBe("string");
      expect(Object.values(AuthenticationProvider)).toContain(authentication.provider);
    });

    it("should have an optional refreshToken", (): void => {
      expect(authentication.refreshToken).toBeDefined();
      expect(typeof authentication.refreshToken).toBe("string");
    });

    it("should have a metadata object", (): void => {
      expect(authentication.metadata).toBeDefined();
      expect(typeof authentication.metadata).toBe("object");
      expect(authentication.metadata).toEqual(expect.any(Object));
    });

    it("should have a valid createdAt date", (): void => {
      expect(authentication.createdAt).toBeDefined();
      expect(authentication.createdAt).toBeInstanceOf(Date);
      expect(authentication.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should have a valid lastAccessedAt date", (): void => {
      expect(authentication.lastAccessedAt).toBeDefined();
      expect(authentication.lastAccessedAt).toBeInstanceOf(Date);
      expect(authentication.lastAccessedAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(authentication.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(authentication.createdAt.getTime());
    });
  });

  describe("AuthenticationEntity validation", (): void => {
    let authentication: AuthenticationEntity;

    beforeEach((): void => {
      authentication = buildAuthenticationFakeFactory();
    });

    it("should successfully validate when all properties are valid", async (): Promise<void> => {
      expect(authentication).toBeInstanceOf(AuthenticationEntity);

      await expect(authentication.validate()).resolves.not.toThrow();
    });

    it("should throw an error when some property is invalid", async (): Promise<void> => {
      expect(authentication).toBeInstanceOf(AuthenticationEntity);
      // @ts-expect-error - invalid provider value initialization only for test purpose;
      authentication.provider = "invalidProviderName";

      await expect(authentication.validate()).rejects.toThrow();
    });
  });
});
