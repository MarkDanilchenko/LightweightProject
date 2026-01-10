import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import LocalAuthStrategy from "@server/auth/strategies/local.strategy";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";

describe("LocalAuthStrategy", (): void => {
  let localAuthStrategy: LocalAuthStrategy;
  let user: UserEntity;
  let authentication: AuthenticationEntity;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [
        LocalAuthStrategy,
        {
          provide: UsersService,
          useValue: {
            findUser: jest.fn(),
          },
        },
      ],
    }).compile();

    localAuthStrategy = testingModule.get<LocalAuthStrategy>(LocalAuthStrategy);
    usersService = testingModule.get<jest.Mocked<UsersService>>(UsersService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(localAuthStrategy).toBeDefined();
  });

  it("should be configured with redefined options in super constructor", (): void => {
    const strategy = localAuthStrategy as any;

    expect(strategy._usernameField).toBe("login");
    expect(strategy._passwordField).toBe("password");
    expect(strategy._passReqToCallback).toBe(true);
  });

  describe("validate", (): void => {
    it("should validate user with correct credentials", async (): Promise<void> => {});

    it("should handle user not found", async (): Promise<void> => {});

    it("should handle invalid credentials", async (): Promise<void> => {});

    it("should handle unverified email", async (): Promise<void> => {});

    it("should handle invalid password", async (): Promise<void> => {});

    it("should handle error during validation", async (): Promise<void> => {});

    it("should handle missing authentication data", async (): Promise<void> => {});
  });
});
