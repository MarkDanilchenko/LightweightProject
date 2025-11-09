import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, FindOneOptions, FindOptionsWhere, Not, Repository, UpdateResult } from "typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import UserService from "@server/user/user.service";
import UserEntity from "@server/user/user.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventName } from "@server/event/interfaces/event.interfaces";
import EventService from "@server/event/event.service";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import { hash } from "@server/utils/hasher";
import TokenService from "@server/common/token.service";
import { v4 as uuidv4 } from "uuid";
import { LocalSignUpDto, LocalVerificationEmailDto } from "@server/auth/types/auth.types";
import { TokenPayload } from "@server/common/interfaces/common.interfaces";

@Injectable()
export default class AuthService {
  private readonly eventService: EventService;
  private readonly eventEmitter: EventEmitter2;
  private readonly userService: UserService;
  private readonly tokenService: TokenService;

  constructor(
    eventService: EventService,
    eventEmitter: EventEmitter2,
    userService: UserService,
    tokenService: TokenService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
  ) {
    this.eventService = eventService;
    this.eventEmitter = eventEmitter;
    this.userService = userService;
    this.tokenService = tokenService;
  }

  /**
   * Updates an authentication entity with the given values.
   *
   * @param whereCondition {FindOptionsWhere<AuthenticationEntity>} - The condition to find the authentication entity to update.
   * @param values {Record<string, unknown>} - The values to update the authentication entity with.
   *
   * @returns {Promise<UpdateResult>} A promise that resolves with the update result.
   */
  async updateAuthentication(
    whereCondition: FindOptionsWhere<AuthenticationEntity>,
    values: Record<string, unknown>,
  ): Promise<UpdateResult> {
    return this.authenticationRepository.update(whereCondition, values);
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
   * Sign up a user with local authentication.
   *
   * @param {LocalSignUpDto} localSignUpDto - The data transfer object containing the user's sign up information.
   *
   * @return {Promise<void>} A promise, that resolves, when the user is successfully signed up.
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
        const isUsernameTaken: UserEntity | null = await manager.findOne(UserEntity, {
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
          this.eventService.buildInstance(EventName.AUTH_LOCAL_CREATED, user.id, authentication.id, {
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
          this.eventService.buildInstance(EventName.AUTH_LOCAL_CREATED, user.id, authentication.id, {
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
   * Verify user email while local authentication workflow, update user data and authentication data and return access token.
   *
   * @param {LocalVerificationEmailDto} localVerificationEmailDto - Token in jwt format.
   *
   * @returns {Promise<{ accessToken: string }>} - Access token.
   */
  async localVerificationEmail(localVerificationEmailDto: LocalVerificationEmailDto): Promise<{ accessToken: string }> {
    const { token } = localVerificationEmailDto;

    const { userId, provider } = await this.tokenService.verify(token);
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

    const accessToken: string = await this.tokenService.generate(
      { userId, provider, jwti: uuidv4() },
      this.tokenService.jwtAccessTokenExpiresIn,
    );
    const refreshToken: string = await this.tokenService.generate(
      { userId, provider },
      this.tokenService.jwtRefreshTokenExpiresIn,
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await manager.update(
        AuthenticationEntity,
        { id: authentication.id, userId, provider },
        {
          refreshToken,
          metadata: {
            local: {
              ...authentication.metadata.local,
              isEmailVerified: true,
              verificationConfirmedAt: new Date(),
            },
          },
        },
      );

      // Set refreshToken to null for all other user's authentications;
      await manager.update(
        AuthenticationEntity,
        { userId, provider: Not(AuthenticationProvider.LOCAL) },
        {
          refreshToken: null,
          lastAccessedAt: () => "lastAccessedAt",
        },
      );

      await manager.update(UserEntity, { id: userId }, authentication.metadata.local?.temporaryInfo ?? {});
    });

    return { accessToken };
  }

  /**
   * Sign in user with local authentication.
   *
   * @param {UserEntity} user - User entity.
   *
   * @returns {Promise<{ accessToken: string }>} - Access token.
   */
  async localSignIn(user: UserEntity): Promise<{ accessToken: string }> {
    let authentication: AuthenticationEntity | null | undefined = user.authentications.find(
      (auth: AuthenticationEntity) =>
        auth.provider === AuthenticationProvider.LOCAL && auth.metadata.local?.isEmailVerified,
    );

    if (!authentication) {
      authentication = await this.findAuthentication({
        where: {
          userId: user.id,
          provider: AuthenticationProvider.LOCAL,
        },
      });

      if (!authentication) {
        throw new UnauthorizedException("Authentication failed. Authentication not found.");
      }

      if (!authentication.metadata.local?.isEmailVerified) {
        throw new UnauthorizedException("Authentication failed. Email is not verified.");
      }
    }

    const accessToken: string = await this.tokenService.generate(
      { userId: user.id, provider: AuthenticationProvider.LOCAL, jwti: uuidv4() },
      this.tokenService.jwtAccessTokenExpiresIn,
    );
    const refreshToken: string = await this.tokenService.generate(
      { userId: user.id, provider: AuthenticationProvider.LOCAL },
      this.tokenService.jwtRefreshTokenExpiresIn,
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await manager.update(
        AuthenticationEntity,
        { id: authentication.id, userId: user.id, provider: AuthenticationProvider.LOCAL },
        { refreshToken },
      );

      // Set refreshToken to null for all other user's authentications;
      await manager.update(
        AuthenticationEntity,
        { userId: user.id, provider: Not(AuthenticationProvider.LOCAL) },
        {
          refreshToken: null,
          lastAccessedAt: () => "lastAccessedAt",
        },
      );
    });

    return { accessToken };
  }

  async signOut(payload: TokenPayload): Promise<void> {
    // const { jwti, userId, provider, exp: ttl } = payload;
    // await this.tokenService.addToBlacklist(jwti, ttl);
    // await this.updateAuthentication(
    //   {
    //     userId,
    //     provider,
    //   },
    //   {
    //     refreshToken: null,
    //   },
    // );
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
  //   const user: UserEntity | null = await this.userService.find({
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
  //           if (!user) {
  //             this.logger.log(`User with email "${email}" does not exist. Creating ...`);
  //
  //             const user = transactionalEntityManager.create(UserEntity, {
  //               firstName,
  //               lastName,
  //               email,
  //               avatarUrl,
  //             });
  //             await transactionalEntityManager.save(user);
  //
  //             const authentication = transactionalEntityManager.create(AuthenticationEntity, {
  //               userId: user.id,
  //               provider: idP,
  //             });
  //             await transactionalEntityManager.save(authentication);
  //           } else {
  //             this.logger.log(
  //               `User with email "${email}" already exists. Update profile partially and check related authentication ...`,
  //             );
  //
  //             let authentication = user.authentications.find((auth) => auth.provider === idP);
  //
  //             if (!authentication) {
  //               authentication = transactionalEntityManager.create(AuthenticationEntity, {
  //                 userId: user.id,
  //                 provider: idP,
  //               });
  //             }
  //
  //             await transactionalEntityManager.update(UserEntity, user.id, {
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
