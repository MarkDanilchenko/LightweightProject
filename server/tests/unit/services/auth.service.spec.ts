/* eslint-disable @typescript-eslint/unbound-method */
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import AuthService from "@server/auth/auth.service";
import { Test, TestingModule } from "@nestjs/testing";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import { AuthenticationProvider, AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import {
  DataSource,
  EntityManager,
  FindOneOptions,
  FindOptionsWhere,
  IsNull,
  Not,
  Repository,
  UpdateResult,
} from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ClientProxy } from "@nestjs/microservices";
import { RMQ_MICROSERVICE } from "@server/configs/constants";
import TokensService from "@server/tokens/tokens.service";
import UsersService from "@server/users/users.service";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { randomValidJwt } from "../../utils";
import { faker } from "@faker-js/faker";
import { EventName } from "@server/events/interfaces/events.interfaces";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { LocalPasswordResetDto, LocalVerificationEmailDto } from "@server/auth/dto/auth.dto";

jest.mock("@server/utils/hasher", () => ({
  hash: jest.fn().mockImplementation((password: string): Promise<string> => Promise.resolve("hashed-password")),
}));

describe("AuthService", (): void => {
  let authService: AuthService;
  let dataSource: jest.Mocked<DataSource>;
  let entityManager: jest.Mocked<EntityManager>;
  let rmqMicroserviceClient: jest.Mocked<ClientProxy>;
  let tokensService: jest.Mocked<TokensService>;
  let usersService: jest.Mocked<UsersService>;
  let eventsService: jest.Mocked<EventsService>;
  let eventEmitter2: jest.Mocked<EventEmitter2>;
  let authenticationRepository: jest.Mocked<Repository<AuthenticationEntity>>;

  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({
      userId: user.id,
      provider: AuthenticationProvider.LOCAL,
    });
    user.authentications = [authentication];

    entityManager = {
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    const mockDataSource = { transaction: jest.fn().mockImplementation((callback) => callback(entityManager)) };
    const mockRmqMicroserviceClient = { emit: jest.fn() };
    const mockUsersService = { findUser: jest.fn(), updateUser: jest.fn() };
    const mockEventsService = { buildInstance: jest.fn(), createEvent: jest.fn() };
    const mockEventEmitter2 = { emit: jest.fn() };
    const mockTokensService = {
      verify: jest.fn(),
      decode: jest.fn(),
      generate: jest.fn(),
      addToBlacklist: jest.fn(),
      isBlacklisted: jest.fn(),
      jwtAccessTokenExpiresIn: "24h",
      jwtRefreshTokenExpiresIn: "7d",
    };
    const mockAuthenticationRepository = {
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: RMQ_MICROSERVICE, useValue: mockRmqMicroserviceClient },
        { provide: TokensService, useValue: mockTokensService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: EventsService, useValue: mockEventsService },
        { provide: EventEmitter2, useValue: mockEventEmitter2 },
        { provide: getRepositoryToken(AuthenticationEntity), useValue: mockAuthenticationRepository },
      ],
    }).compile();

    authService = testingModule.get<AuthService>(AuthService);
    dataSource = testingModule.get<jest.Mocked<DataSource>>(DataSource);
    rmqMicroserviceClient = testingModule.get<jest.Mocked<ClientProxy>>(RMQ_MICROSERVICE);
    tokensService = testingModule.get<jest.Mocked<TokensService>>(TokensService);
    usersService = testingModule.get<jest.Mocked<UsersService>>(UsersService);
    eventsService = testingModule.get<jest.Mocked<EventsService>>(EventsService);
    eventEmitter2 = testingModule.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
    authenticationRepository = testingModule.get<jest.Mocked<Repository<AuthenticationEntity>>>(
      getRepositoryToken(AuthenticationEntity),
    );
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(authService).toBeDefined();
  });

  describe("updateAuthentication", (): void => {
    const updateResult: UpdateResult = { affected: 1, raw: {}, generatedMaps: [] };
    let whereCondition: FindOptionsWhere<AuthenticationEntity>;
    let values: Record<string, unknown>;

    beforeEach((): void => {
      entityManager.update.mockResolvedValue(updateResult);
      whereCondition = { id: authentication.id };
      values = {
        refreshToken: randomValidJwt(
          { userId: user.id, provider: AuthenticationProvider.LOCAL },
          { expiresIn: tokensService.jwtRefreshTokenExpiresIn },
        ),
      };
    });

    afterEach((): void => {
      jest.clearAllMocks();
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
      const notExistingUuid = faker.string.uuid();
      const options: FindOneOptions<AuthenticationEntity> = { where: { userId: notExistingUuid } };

      authenticationRepository.findOne.mockResolvedValue(null);

      const result: AuthenticationEntity | null = await authService.findAuthentication(options);

      expect(authenticationRepository.findOne).toHaveBeenCalledWith(options);
      expect(result).toBeNull();
    });
  });

  describe("localSignUp", (): void => {
    it("should create user and authentication when user does not exist", async (): Promise<void> => {
      usersService.findUser.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      eventsService.buildInstance.mockReturnValueOnce(expect.any(Object));
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

  describe("localVerificationEmail", (): void => {
    let dto: LocalVerificationEmailDto;
    let payload: Partial<TokenPayload>;

    beforeEach((): void => {
      dto = {
        token: randomValidJwt({ userId: user.id, provider: AuthenticationProvider.LOCAL }, { expiresIn: "1d" }),
      };
      payload = { userId: user.id, provider: AuthenticationProvider.LOCAL };
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should verify email and return access token", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = false;
      authentication.user = user;
      const newAccessToken: string = randomValidJwt(
        { userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: faker.string.uuid() },
        { expiresIn: tokensService.jwtAccessTokenExpiresIn },
      );
      const newRefreshToken: string = randomValidJwt(
        { userId: user.id, provider: AuthenticationProvider.LOCAL },
        { expiresIn: tokensService.jwtRefreshTokenExpiresIn },
      );

      tokensService.verify.mockResolvedValue(payload as TokenPayload);
      authenticationRepository.findOne.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValueOnce(newAccessToken).mockResolvedValueOnce(newRefreshToken);
      eventsService.buildInstance.mockReturnValueOnce(expect.any(Object));

      const result: { accessToken: string } = await authService.localVerificationEmail(dto);

      expect(tokensService.verify).toHaveBeenCalledWith(dto.token);
      expect(authenticationRepository.findOne).toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(entityManager.update).toHaveBeenCalledTimes(2);
      expect(usersService.updateUser).toHaveBeenCalledWith(
        { id: user.id },
        authentication.metadata.local?.temporaryInfo ?? {},
        entityManager,
      );
      expect(eventEmitter2.emit).toHaveBeenCalledWith(
        EventName.AUTH_LOCAL_EMAIL_VERIFIED,
        expect.any(Object),
        entityManager,
      );
      expect(result).toEqual({ accessToken: newAccessToken });
    });

    it("should throw UnauthorizedException when token is invalid", async (): Promise<void> => {
      tokensService.verify.mockResolvedValue({} as TokenPayload);

      await expect(authService.localVerificationEmail(dto)).rejects.toThrow(
        new UnauthorizedException("Invalid token."),
      );
    });

    it("should throw NotFoundException when authentication not found", async (): Promise<void> => {
      tokensService.verify.mockResolvedValue(payload as TokenPayload);
      authenticationRepository.findOne.mockResolvedValue(null);

      await expect(authService.localVerificationEmail(dto)).rejects.toThrow(
        new NotFoundException("Authentication not found."),
      );
    });

    it("should throw BadRequestException when email was already verified", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = true;

      tokensService.verify.mockResolvedValue(payload as TokenPayload);
      authenticationRepository.findOne.mockResolvedValue(authentication);

      await expect(authService.localVerificationEmail(dto)).rejects.toThrow(
        new BadRequestException("Email has been already verified."),
      );
    });
  });

  describe("localSignIn", (): void => {
    it("should throw UnauthorizedException when user has no authentications", async (): Promise<void> => {
      user.authentications = [];

      await expect(authService.localSignIn(user)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Authentication not found."),
      );
    });

    it("should throw UnauthorizedException when no verified local authentication", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = false;

      await expect(authService.localSignIn(user)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Authentication not found."),
      );
    });

    it("should sign in user with verified local authentication", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = true;
      const newAccessToken: string = randomValidJwt(
        { userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: faker.string.uuid() },
        { expiresIn: tokensService.jwtAccessTokenExpiresIn },
      );
      const newRefreshToken: string = randomValidJwt(
        { userId: user.id, provider: AuthenticationProvider.LOCAL },
        { expiresIn: tokensService.jwtRefreshTokenExpiresIn },
      );

      tokensService.generate.mockResolvedValueOnce(newAccessToken).mockResolvedValueOnce(newRefreshToken);

      const result: { accessToken: string } = await authService.localSignIn(user);

      expect(tokensService.generate).toHaveBeenCalledTimes(2);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(entityManager.update).toHaveBeenCalledTimes(2);
      expect(entityManager.update).toHaveBeenNthCalledWith(
        1,
        AuthenticationEntity,
        { id: authentication.id, userId: user.id, provider: AuthenticationProvider.LOCAL },
        { refreshToken: newRefreshToken },
      );
      expect(entityManager.update).toHaveBeenNthCalledWith(
        2,
        AuthenticationEntity,
        { userId: user.id, provider: Not(AuthenticationProvider.LOCAL) },
        { refreshToken: null, lastAccessedAt: expect.any(Function) },
      );
      expect(result).toEqual({ accessToken: newAccessToken });
    });
  });

  describe("signOut", (): void => {
    it("should throw UnauthorizedException when jwti or exp is missing", async (): Promise<void> => {
      const payload: TokenPayload = {
        jwti: undefined,
        exp: undefined,
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
      } as TokenPayload;

      await expect(authService.signOut(payload)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Token is invalid."),
      );
    });

    it("should add token to blacklist and clear refreshToken", async (): Promise<void> => {
      const updateResult: UpdateResult = { affected: 1, raw: {}, generatedMaps: [] };
      const payload: TokenPayload = {
        jwti: faker.string.uuid(),
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
        exp: Math.floor(Date.now() / 1_000) + 3_600, // 1 hour from now;
      } as TokenPayload;

      entityManager.update.mockResolvedValue(updateResult);

      await authService.signOut(payload);

      expect(tokensService.addToBlacklist).toHaveBeenCalledWith(payload.jwti, payload.exp);
      expect(entityManager.update).toHaveBeenCalledWith(
        AuthenticationEntity,
        { userId: payload.userId, provider: payload.provider },
        { refreshToken: null },
      );
    });
  });

  describe("refreshAccessToken", (): void => {
    let oldAccessToken: string;

    beforeEach((): void => {
      oldAccessToken = randomValidJwt(undefined, {
        expiresIn: tokensService.jwtAccessTokenExpiresIn,
        notBefore: Math.floor(Date.now() / 1000) + 30, // only after 30 seconds from now this token will be valid - consider that it is invalid;
      });
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should throw UnauthorizedException when payload is falsy", async (): Promise<void> => {
      tokensService.verify.mockResolvedValue(null as unknown as TokenPayload);

      await expect(authService.refreshAccessToken(oldAccessToken)).rejects.toThrow(
        new UnauthorizedException("Authentication failed."),
      );
    });

    it("should throw UnauthorizedException when required fields are missing", async (): Promise<void> => {
      const payload = { jwti: undefined, userId: undefined, provider: undefined } as unknown as TokenPayload;

      tokensService.verify.mockResolvedValue(payload);

      await expect(authService.refreshAccessToken(oldAccessToken)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Token is invalid."),
      );
    });

    it("should throw UnauthorizedException when token is blacklisted", async (): Promise<void> => {
      const payload: TokenPayload = {
        jwti: faker.string.uuid(),
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
      };

      tokensService.verify.mockResolvedValue(payload);
      tokensService.isBlacklisted.mockResolvedValue(true);

      await expect(authService.refreshAccessToken(oldAccessToken)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. Token is invalid."),
      );
    });

    it("should throw UnauthorizedException when authentication with refresh token not found", async (): Promise<void> => {
      const payload: TokenPayload = {
        jwti: faker.string.uuid(),
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
      };

      tokensService.verify.mockResolvedValue(payload);
      tokensService.isBlacklisted.mockResolvedValue(false);

      authenticationRepository.findOne.mockResolvedValue(null);

      await expect(authService.refreshAccessToken(oldAccessToken)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. User is not signed in."),
      );
    });

    it("should generate new access token when refresh token is valid", async (): Promise<void> => {
      const payload: TokenPayload = {
        jwti: faker.string.uuid(),
        userId: user.id,
        provider: AuthenticationProvider.LOCAL,
      };
      const newAccessToken: string = randomValidJwt(payload, {
        expiresIn: tokensService.jwtAccessTokenExpiresIn,
      });

      tokensService.verify.mockResolvedValueOnce(payload).mockResolvedValueOnce({} as TokenPayload);
      tokensService.isBlacklisted.mockResolvedValue(false);

      // Consider, that authentication is found and has a valid refresh token;
      authenticationRepository.findOne.mockResolvedValue(authentication);
      tokensService.generate.mockResolvedValue(newAccessToken);

      const result: { accessToken: string } = await authService.refreshAccessToken(oldAccessToken);

      expect(authenticationRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: payload.userId,
          provider: payload.provider,
          refreshToken: Not(IsNull()),
        },
      });
      expect(tokensService.verify).toHaveBeenCalledTimes(2);
      expect(tokensService.generate).toHaveBeenCalledWith(
        { userId: payload.userId, provider: payload.provider, jwti: expect.any(String) },
        { expiresIn: tokensService.jwtAccessTokenExpiresIn },
      );
      expect(result).toEqual({ accessToken: newAccessToken });
    });
  });

  describe("retrieveProfile", (): void => {
    it("should return user profile when user exists", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(user);

      const result: Partial<UserEntity> = await authService.retrieveProfile(user.id);

      expect(usersService.findUser).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        where: { id: user.id },
      });
      expect(result).toEqual(user);
    });

    it("should throw UnauthorizedException when user does not exist", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(null);

      await expect(authService.retrieveProfile(user.id)).rejects.toThrow(
        new UnauthorizedException("Authentication failed. User is not found."),
      );
    });
  });

  describe("localPasswordForgot", (): void => {
    it("should silently return when user was not found", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(null);

      await expect(authService.localPasswordForgot({ email: user.email })).resolves.toBeUndefined();
      expect(rmqMicroserviceClient.emit).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when email is not verified", async (): Promise<void> => {
      authentication.metadata.local!.isEmailVerified = false;

      usersService.findUser.mockResolvedValue(user);

      await expect(authService.localPasswordForgot({ email: user.email })).rejects.toThrow(
        new BadRequestException(`Email "${user.email}" is not verified yet.`),
      );
    });

    it("should emit password reset event when user found and email verified", async (): Promise<void> => {
      usersService.findUser.mockResolvedValue(user);
      eventsService.buildInstance.mockReturnValue(expect.any(Object));

      await authService.localPasswordForgot({ email: user.email });

      expect(rmqMicroserviceClient.emit).toHaveBeenCalledWith(EventName.AUTH_LOCAL_PASSWORD_RESET, expect.any(Object));
    });
  });

  describe("localPasswordReset", (): void => {
    const newPassword = "FwwGjwC5qjO";
    let dto: LocalPasswordResetDto;

    beforeEach((): void => {
      dto = {
        token: randomValidJwt(
          { userId: user.id, provider: AuthenticationProvider.LOCAL },
          { expiresIn: "15m" },
          authentication.metadata.local!.password,
        ),
        password: newPassword,
      };
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should throw BadRequestException when token is invalid after decode", async (): Promise<void> => {
      tokensService.decode.mockReturnValue(
        expect.objectContaining({ userId: undefined, provider: undefined }) as TokenPayload,
      );

      await expect(authService.localPasswordReset(dto)).rejects.toThrow(new BadRequestException("Token is invalid."));
    });

    it("should throw BadRequestException when user not found", async (): Promise<void> => {
      const decoded: TokenPayload = { userId: user.id, provider: AuthenticationProvider.LOCAL };

      tokensService.decode.mockReturnValue(decoded);
      usersService.findUser.mockResolvedValue(null);

      await expect(authService.localPasswordReset(dto)).rejects.toThrow(new BadRequestException("Token is invalid."));
    });

    it("should throw BadRequestException when email is not verified", async (): Promise<void> => {
      const decoded: TokenPayload = { userId: user.id, provider: AuthenticationProvider.LOCAL };
      authentication.metadata.local!.isEmailVerified = false;

      tokensService.decode.mockReturnValue(decoded);
      usersService.findUser.mockResolvedValue(user);

      await expect(authService.localPasswordReset(dto)).rejects.toThrow(
        new BadRequestException("Email is not verified yet."),
      );
    });

    it("should reset password, update authentication and emit event", async (): Promise<void> => {
      const decoded: TokenPayload = { userId: user.id, provider: AuthenticationProvider.LOCAL };
      const updateResult: UpdateResult = { affected: 1, raw: {}, generatedMaps: [] };
      authentication.metadata.local!.isEmailVerified = true;

      tokensService.decode.mockReturnValue(decoded);
      usersService.findUser.mockResolvedValue(user);
      tokensService.verify.mockResolvedValue({} as TokenPayload);
      entityManager.update.mockResolvedValue(updateResult);
      eventsService.buildInstance.mockReturnValue(expect.any(Object));

      await authService.localPasswordReset(dto);

      expect(tokensService.verify).toHaveBeenCalledWith(dto.token, { secret: authentication.metadata.local!.password });
      expect(dataSource.transaction).toHaveBeenCalled();
      expect(entityManager.update).toHaveBeenCalledWith(
        AuthenticationEntity,
        { provider: decoded.provider, userId: decoded.userId, id: authentication.id },
        expect.objectContaining({
          metadata: expect.objectContaining({
            local: expect.objectContaining({ password: "hashed-password" }) as AuthMetadata["local"],
          }) as AuthMetadata,
        }),
      );
      expect(eventEmitter2.emit).toHaveBeenCalledWith(
        EventName.AUTH_LOCAL_PASSWORD_RESETED,
        expect.any(Object),
        entityManager,
      );
    });
  });
});
