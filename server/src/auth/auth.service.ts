import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
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
import AuthenticationEntity from "@server/auth/auth.entity";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventName } from "@server/events/interfaces/events.interfaces";
import EventsService from "@server/events/events.service";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { hash } from "@server/utils/hasher";
import TokensService from "@server/tokens/tokens.service";
import { v4 as uuidv4 } from "uuid";
import { LocalSignUpDto, LocalVerificationEmailDto } from "@server/auth/types/auth.types";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";

@Injectable()
export default class AuthService {
  private readonly dataSource: DataSource;
  private readonly tokensService: TokensService;
  private readonly userService: UsersService;
  private readonly eventsService: EventsService;
  private readonly eventEmitter: EventEmitter2;

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
    tokensService: TokensService,
    userService: UsersService,
    eventsService: EventsService,
    eventEmitter: EventEmitter2,
  ) {
    this.dataSource = dataSource;
    this.tokensService = tokensService;
    this.userService = userService;
    this.eventsService = eventsService;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Updates an authentication entity with the given values.
   *
   * @param {FindOptionsWhere<AuthenticationEntity>} whereCondition - The condition to find the authentication entity to update.
   * @param {Record<string, unknown>} values - The values to update the authentication entity with.
   * @param {EntityManager} [manager]  - The entity manager to use. If not provided, a new transaction will be started.
   *
   * @returns {Promise<UpdateResult>} A promise that resolves with the update result.
   */
  async updateAuthentication(
    whereCondition: FindOptionsWhere<AuthenticationEntity>,
    values: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<UpdateResult> {
    const callback = async (manager: EntityManager): Promise<UpdateResult> => {
      return manager.update(AuthenticationEntity, whereCondition, values);
    };

    if (!manager) {
      return this.dataSource.transaction(callback);
    }

    return callback(manager);
  }

  /**
   * Finds an authentication entity by its primary key (authentication ID).
   *
   * @param {string} id - The ID of the authentication to find.
   *
   * @returns {Promise<AuthenticationEntity | null>} A promise that resolves with the authentication entity if found, otherwise null.
   */
  async findAuthenticationByPk(id: string): Promise<AuthenticationEntity | null> {
    return this.authenticationRepository.findOneBy({ id });
  }

  /**
   * Finds an authentication entity using the given options.
   *
   * @param {FindOneOptions<AuthenticationEntity>} options - The options to find the authentication entity.
   *
   * @returns {Promise<AuthenticationEntity | null>} A promise that resolves with the authentication entity if found, otherwise null.
   */
  async findAuthentication(options: FindOneOptions<AuthenticationEntity>): Promise<AuthenticationEntity | null> {
    return this.authenticationRepository.findOne(options);
  }

  /**
   * Sign up a users with local authentication.
   *
   * @param {LocalSignUpDto} localSignUpDto - The data transfer object containing the users's sign up information.
   *
   * @return {Promise<void>} A promise, that resolves, when the users is successfully signed up.
   */
  async localSignUp(localSignUpDto: LocalSignUpDto): Promise<void> {
    const { username, firstName, lastName, email, avatarUrl, password } = localSignUpDto;

    const user: UserEntity | null = await this.userService.findUser({
      relations: ["authentications"],
      select: {
        id: true,
        email: true,
        authentications: {
          id: true,
          userId: true,
          provider: true,
          metadata: true,
        },
      },
      where: {
        email,
      },
    });

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      if (!user) {
        const isUsernameTaken: UserEntity | null = await this.userService.findUser({
          select: { id: true },
          where: { username },
        });

        if (isUsernameTaken) {
          throw new BadRequestException("Username is already taken.");
        }

        const user: UserEntity = manager.create(UserEntity, { email });
        await manager.save(user);

        const hashedPassword: string = await hash(password);

        const authentication: AuthenticationEntity = manager.create(AuthenticationEntity, {
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          metadata: {
            local: {
              isEmailVerified: false,
              password: hashedPassword,
              temporaryInfo: {
                username,
                firstName,
                lastName,
                avatarUrl,
              },
            },
          },
        });
        await manager.save(authentication);

        this.eventEmitter.emit(
          EventName.AUTH_LOCAL_CREATED,
          this.eventsService.buildInstance(EventName.AUTH_LOCAL_CREATED, user.id, authentication.id, {
            username,
            firstName,
            lastName,
            avatarUrl,
            email,
          }),
        );
      } else {
        const existingAuthentication: AuthenticationEntity | undefined = user.authentications.find(
          (auth: AuthenticationEntity): boolean => auth.provider === AuthenticationProvider.LOCAL,
        );

        if (existingAuthentication) {
          if (existingAuthentication.metadata.local?.isEmailVerified) {
            throw new BadRequestException(
              "Already signed up." + " Please, sign in with local authentication credentials.",
            );
          }

          throw new BadRequestException("Already signed up." + " Email verification is required to proceed.");
        }

        const hashedPassword: string = await hash(password);

        const authentication: AuthenticationEntity = manager.create(AuthenticationEntity, {
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
          metadata: {
            local: {
              isEmailVerified: false,
              password: hashedPassword,
              temporaryInfo: {
                username,
                firstName,
                lastName,
                avatarUrl,
              },
            },
          },
        });
        await manager.save(authentication);

        this.eventEmitter.emit(
          EventName.AUTH_LOCAL_CREATED,
          this.eventsService.buildInstance(EventName.AUTH_LOCAL_CREATED, user.id, authentication.id, {
            username,
            firstName,
            lastName,
            avatarUrl,
            email,
          }),
        );
      }
    });
  }

  /**
   * Verify user's email during local authentication workflow and return access token.
   *
   * @param {LocalVerificationEmailDto} localVerificationEmailDto - Token in jwt format.
   *
   * @returns {Promise<{ accessToken: string }>} - Access token.
   */
  async localVerificationEmail(localVerificationEmailDto: LocalVerificationEmailDto): Promise<{ accessToken: string }> {
    const { token } = localVerificationEmailDto;

    const { userId, provider } = await this.tokensService.verify(token);
    if (!userId || provider !== AuthenticationProvider.LOCAL || !provider) {
      throw new UnauthorizedException("Invalid or expired token.");
    }

    const authentication: AuthenticationEntity | null = await this.findAuthentication({
      where: {
        userId,
        provider,
      },
    });
    if (!authentication) {
      throw new NotFoundException("Authentication not found.");
    }

    if (authentication.metadata.local?.isEmailVerified) {
      throw new BadRequestException("Email has been already verified.");
    }

    const accessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      this.tokensService.jwtAccessTokenExpiresIn,
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId, provider },
      this.tokensService.jwtRefreshTokenExpiresIn,
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication(
        { id: authentication.id, userId, provider },
        {
          refreshToken,
          metadata: {
            local: {
              ...authentication.metadata.local,
              isEmailVerified: true,
            },
          },
        },
        manager,
      );

      // Set refreshToken to null for all other user's authentications;
      await this.updateAuthentication(
        { userId, provider: Not(AuthenticationProvider.LOCAL) },
        {
          refreshToken: null,
          lastAccessedAt: () => "lastAccessedAt",
        },
        manager,
      );

      // Finally update user with info from temporary;
      await this.userService.updateUser({ id: userId }, authentication.metadata.local?.temporaryInfo ?? {}, manager);

      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_VERIFIED, userId, authentication.id),
        manager,
      );
    });

    return { accessToken };
  }

  /**
   * Sign in users with local authentication.
   *
   * @param {UserEntity} user - User entity.
   *
   * @returns {Promise<{ accessToken: string }>} - Access token.
   */
  async localSignIn(user: UserEntity): Promise<{ accessToken: string }> {
    if (!user.authentications || user.authentications.length === 0) {
      throw new UnauthorizedException("Authentication failed. Authentication not found.");
    }

    const authentication: AuthenticationEntity | null | undefined = user.authentications.find(
      (auth: AuthenticationEntity) =>
        auth.provider === AuthenticationProvider.LOCAL && auth.metadata.local?.isEmailVerified,
    );
    if (!authentication) {
      throw new UnauthorizedException("Authentication failed. Authentication not found.");
    }

    const accessToken: string = await this.tokensService.generate(
      { userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: uuidv4() },
      this.tokensService.jwtAccessTokenExpiresIn,
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId: user.id, provider: AuthenticationProvider.LOCAL },
      this.tokensService.jwtRefreshTokenExpiresIn,
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication(
        { id: authentication.id, userId: user.id, provider: AuthenticationProvider.LOCAL },
        { refreshToken },
        manager,
      );

      // Set refreshToken to null for all other users' authentications;
      await this.updateAuthentication(
        { userId: user.id, provider: Not(AuthenticationProvider.LOCAL) },
        { refreshToken: null, lastAccessedAt: (): string => "lastAccessedAt" },
        manager,
      );
    });

    return { accessToken };
  }

  /**
   * Signs out a user based on the given payload.
   *
   * @param {TokenPayload} payload - The payload containing the user's authentication information.
   *
   * @returns {Promise<void>} A promise that resolves when the user is successfully signed out.
   */
  async signOut(payload: TokenPayload): Promise<void> {
    const { jwti, userId, provider, exp } = payload;
    if (!jwti || !exp) {
      throw new UnauthorizedException("Authentication failed. Token is invalid.");
    }

    await this.tokensService.addToBlacklist(jwti, exp);
    await this.updateAuthentication({ userId, provider }, { refreshToken: null });
  }

  /**
   * Refreshes the access token for a user based on the given access token.
   *
   * @param {string} accessToken - The access token to refresh.
   *
   * @returns {Promise<{ accessToken: string }>} - A promise that resolves with the new access token.
   */
  async refreshAccessToken(accessToken: string): Promise<{ accessToken: string }> {
    const payload: TokenPayload = await this.tokensService.verify(accessToken, true);
    if (!payload) {
      throw new UnauthorizedException("Authentication failed.");
    }

    const { jwti, userId, provider } = payload;
    if (!jwti || !userId || !provider) {
      throw new UnauthorizedException("Authentication failed. Token is invalid.");
    }

    const isBlacklisted: boolean = await this.tokensService.isBlacklisted(jwti);
    if (isBlacklisted) {
      throw new UnauthorizedException("Authentication failed. Token is invalid.");
    }

    const authentication: AuthenticationEntity | null = await this.findAuthentication({
      where: {
        userId,
        provider,
        refreshToken: Not(IsNull()),
      },
    });
    if (!authentication) {
      throw new UnauthorizedException("Authentication failed. User is not signed in.");
    }

    const { refreshToken } = authentication;
    await this.tokensService.verify(refreshToken!);

    const newAccessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      this.tokensService.jwtAccessTokenExpiresIn,
    );

    return { accessToken: newAccessToken };
  }

  /**
   * Retrieves a user's profile information from the database.
   *
   * @param {string} userId - The user's ID.
   *
   * @returns {Promise<Partial<UserEntity>>} A promise that resolves with the user's profile information.
   */
  async retrieveProfile(userId: string): Promise<Partial<UserEntity>> {
    const user: UserEntity | null = await this.userService.findUser({
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
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new UnauthorizedException("Authentication failed. User is not found.");
    }

    return user;
  }

  // async authAccordingToStrategy(
  //   idP: AuthenticationProvider,
  //   userInfo: SignUpLocalDto,
  //   options: AuthAccordingToStrategyOptions = {},
  // ): Promise<UserEntity | void> {
  //   // Both idPTokens (accessToken and refreshToken) are not used in the authentication flow,
  //   // so also not stored in database;
  //   // Besides, inner access token and inner refresh token are configured by the application itself
  //   // for further access to the protected API routes;
  //   const { accessToken, refreshToken } = options;
  //   const { username, email, firstName, lastName, avatarUrl, password } = userInfo;
  //
  //   const users: UserEntity | null = await this.userService.find({
  //     relations: ["authentications"],
  //     select: {
  //       id: true,
  //       email: true,
  //       authentications: {
  //         id: true,
  //         userId: true,
  //         provider: true,
  //         metadata: true,
  //       },
  //     },
  //     where: {
  //       email,
  //     },
  //   });
  //
  //   switch (idP) {
  //     case "keycloak":
  //     case "google": {
  //       await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
  //         try {
  //           if (!users) {
  //             this.logger.log(`User with email "${email}" does not exist. Creating ...`);
  //
  //             const users = transactionalEntityManager.create(UserEntity, {
  //               firstName,
  //               lastName,
  //               email,
  //               avatarUrl,
  //             });
  //             await transactionalEntityManager.save(users);
  //
  //             const authentication = transactionalEntityManager.create(AuthenticationEntity, {
  //               userId: users.id,
  //               provider: idP,
  //             });
  //             await transactionalEntityManager.save(authentication);
  //           } else {
  //             this.logger.log(
  //               `User with email "${email}" already exists. Update profile partially and check related authentication ...`,
  //             );
  //
  //             let authentication = users.authentications.find((auth) => auth.provider === idP);
  //
  //             if (!authentication) {
  //               authentication = transactionalEntityManager.create(AuthenticationEntity, {
  //                 userId: users.id,
  //                 provider: idP,
  //               });
  //             }
  //
  //             await transactionalEntityManager.update(UserEntity, users.id, {
  //               firstName,
  //               lastName,
  //               avatarUrl,
  //             });
  //
  //             // NOTE: Saving to already existing and new authentication instance is needed
  //             // NOTE: for updating the lastAuthenticatedAt field;
  //             await transactionalEntityManager.save(authentication);
  //           }
  //         } catch (error) {
  //           this.logger.error(error.message);
  //
  //           throw new UnauthorizedException(`Authentication for "${username ?? email}" failed.`);
  //         }
  //       });
  //
  //       break;
  //     }
}
