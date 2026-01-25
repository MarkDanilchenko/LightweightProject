/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { UnauthorizedException } from "@nestjs/common";
import LocalAuthStrategy from "@server/auth/strategies/local.strategy";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import { faker } from "@faker-js/faker";
import { verifyHash } from "@server/utils/hasher";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

jest.mock("@server/utils/hasher", () => ({
  verifyHash: jest.fn(),
}));

describe("LocalAuthStrategy", (): void => {
  const mockReq = {} as jest.Mocked<Request>;
  const mockDone: jest.MockedFunction<(...args: unknown[]) => void> = jest.fn();
  let localAuthStrategy: LocalAuthStrategy;
  let usersService: jest.Mocked<UsersService>;
  let user: UserEntity;
  let authentication: AuthenticationEntity;
  let password: string;

  beforeEach(async (): Promise<void> => {
    const mockUsersService = { findUser: jest.fn() };
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({ userId: user.id, provider: AuthenticationProvider.LOCAL });
    password = faker.internet.password({ length: 8 });

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [PassportModule],
      providers: [LocalAuthStrategy, { provide: UsersService, useValue: mockUsersService }],
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
    expect((localAuthStrategy as any)._usernameField).toBe("login");
    expect((localAuthStrategy as any)._passwordField).toBe("password");
    expect((localAuthStrategy as any)._passReqToCallback).toBe(true);
  });

  describe("validate", (): void => {
    it("should validate user with correct credentials", async (): Promise<void> => {
      user.authentications = [authentication];

      (verifyHash as jest.Mock).mockResolvedValue(true);
      usersService.findUser.mockResolvedValue(user);

      await localAuthStrategy.validate(mockReq, user.email, password, mockDone);

      expect(usersService.findUser).toHaveBeenCalledWith({
        relations: ["authentications"],
        select: {
          id: true,
          authentications: {
            id: true,
            provider: true,
            metadata: true,
          },
        },
        where: [
          { email: user.email, authentications: { provider: AuthenticationProvider.LOCAL } },
          { username: user.email, authentications: { provider: AuthenticationProvider.LOCAL } },
        ],
      });
      expect(verifyHash).toHaveBeenCalledWith(password, authentication.metadata.local?.password);
      expect(mockDone).toHaveBeenCalledWith(null, user);
    });

    it("should handle user not found", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(null);

      await localAuthStrategy.validate(mockReq, user.email, password, mockDone);

      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Authentication failed. User not found."), false);
    });

    it("should handle unverified email", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = false;
      user.authentications = [authentication];

      usersService.findUser.mockResolvedValue(user);

      await localAuthStrategy.validate(mockReq, user.email, password, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        new UnauthorizedException("Authentication failed. Email is not verified."),
        false,
      );
    });

    it("should handle invalid password", async (): Promise<void> => {
      user.authentications = [authentication];

      usersService.findUser.mockResolvedValue(user);
      (verifyHash as jest.Mock).mockResolvedValue(false);

      await localAuthStrategy.validate(mockReq, user.email, password, mockDone);

      expect(mockDone).toHaveBeenCalledWith(
        new UnauthorizedException("Authentication failed. Invalid credentials."),
        false,
      );
    });

    it("should handle missing authentication data", async (): Promise<void> => {
      // User instance here is without related authentication instance;
      usersService.findUser.mockResolvedValue(user);

      await localAuthStrategy.validate(mockReq, user.email, password, mockDone);

      expect(mockDone).toHaveBeenCalledWith(new UnauthorizedException("Authentication failed. User not found."), false);
    });
  });
});
