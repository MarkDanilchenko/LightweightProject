import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
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
import AuthenticationEntity from "#server/auth/auth.entity";
import UsersService from "#server/users/users.service";
import UserEntity from "#server/users/users.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventName } from "#server/events/interfaces/events.interfaces";
import EventsService from "#server/events/events.service";
import { AuthenticationProvider, AuthenticationViaIdP } from "#server/auth/interfaces/auth.interfaces";
import { hash } from "#server/utils/hasher";
import TokensService from "#server/tokens/tokens.service";
import { v4 as uuidv4 } from "uuid";
import { TokenPayload } from "#server/tokens/interfaces/token.interfaces";
import {
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
  LocalSignUpDto,
  LocalEmailVerificationDto,
  LocalRestorationConfirmDto,
} from "#server/auth/dto/auth.dto";
import { RMQ_MICROSERVICE } from "#server/configs/constants";
import { ClientProxy } from "@nestjs/microservices";

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
    @Inject(RMQ_MICROSERVICE)
    private readonly rmqMicroserviceClient: ClientProxy,
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
      relations: { authentications: true },
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

    // TODO: need to set an event, after create new user;
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

        this.rmqMicroserviceClient.emit(
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

        this.rmqMicroserviceClient.emit(
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
   * @param {LocalEmailVerificationDto} localEmailVerificationDto - Token in jwt format.
   *
   * @returns {Promise<string>} - Access token.
   */
  async localEmailVerification(localEmailVerificationDto: LocalEmailVerificationDto): Promise<string> {
    const { token } = localEmailVerificationDto;

    const { userId, provider } = await this.tokensService.verify(token);
    if (!userId || !provider || provider !== AuthenticationProvider.LOCAL) {
      throw new UnauthorizedException("Invalid token.");
    }

    const authentication: AuthenticationEntity | null = await this.findAuthentication({
      relations: { user: true },
      select: {
        id: true,
        userId: true,
        provider: true,
        metadata: true,
        user: {
          id: true,
          email: true,
        },
      },
      where: { userId, provider },
    });
    if (!authentication) {
      throw new NotFoundException("Authentication not found.");
    } else if (authentication.metadata.local?.isEmailVerified) {
      throw new BadRequestException("Email has been already verified.");
    }

    const accessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      { expiresIn: this.tokensService.jwtAccessTokenExpiresIn },
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId, provider },
      { expiresIn: this.tokensService.jwtRefreshTokenExpiresIn },
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
        { refreshToken: null, lastAccessedAt: () => "lastAccessedAt" },
        manager,
      );

      // Finally update user with info from temporary;
      await this.userService.updateUser({ id: userId }, authentication.metadata.local?.temporaryInfo ?? {}, manager);

      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_CONFIRMED, userId, authentication.id, {
          email: authentication.user.email,
        }),
        manager,
      );
    });

    return accessToken;
  }

  /**
   * Sign in user according to provided Identity Provider (idP).
   *
   * @param {UserEntity} user - User entity.
   * @param {AuthenticationProvider} provider - Authentication provider.
   *
   * @returns {Promise<string>} - Access token.
   */
  async signIn(user: UserEntity, provider: AuthenticationProvider): Promise<string> {
    if (!user.authentications || !user.authentications.length) {
      throw new UnauthorizedException("Authentication not found.");
    }

    const verifiedAuthentication: AuthenticationEntity | null | undefined = user.authentications.find(
      (auth: AuthenticationEntity) => {
        switch (provider) {
          case AuthenticationProvider.LOCAL: {
            return auth.provider === provider && auth.metadata.local?.isEmailVerified;
          }

          case AuthenticationProvider.GITHUB:
          case AuthenticationProvider.GOOGLE: {
            return auth.provider === provider;
          }
        }
      },
    );
    if (!verifiedAuthentication) {
      throw new UnauthorizedException("Authentication not found.");
    }

    // This block is only for local authentication,
    // because it is already proceeded in strategies related to other idp;
    if (user.isDeactivated) {
      this.rmqMicroserviceClient.emit(
        EventName.AUTH_LOCAL_REACTIVATION,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_REACTIVATION, user.id, user.id, {
          username: user.username,
          email: user.email,
        }),
      );

      throw new UnauthorizedException("User is deactivated.");
    }

    // This block is only for local authentication,
    // because it is already proceeded in strategies related to other idp;
    if (user.deletedAt) {
      this.rmqMicroserviceClient.emit(
        EventName.AUTH_LOCAL_RESTORATION,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_RESTORATION, user.id, user.id, {
          username: user.username,
          email: user.email,
        }),
      );

      throw new UnauthorizedException("User is deleted.");
    }

    const accessToken: string = await this.tokensService.generate(
      { userId: user.id, provider, jwti: uuidv4() },
      { expiresIn: this.tokensService.jwtAccessTokenExpiresIn },
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId: user.id, provider },
      { expiresIn: this.tokensService.jwtRefreshTokenExpiresIn },
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication(
        { id: verifiedAuthentication.id, userId: user.id, provider },
        { refreshToken },
        manager,
      );

      // Set refreshToken to null for all other user's authentications;
      await this.updateAuthentication(
        { userId: user.id, provider: Not(provider) },
        { refreshToken: null, lastAccessedAt: (): string => "lastAccessedAt" },
        manager,
      );
    });

    return accessToken;
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
      throw new UnauthorizedException("Invalid token.");
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
    const payload: TokenPayload = await this.tokensService.verify(accessToken, { ignoreExpiration: true });
    if (!payload) {
      throw new UnauthorizedException("Invalid token.");
    }

    const { jwti, userId, provider } = payload;
    if (!jwti || !userId || !provider) {
      throw new UnauthorizedException("Invalid token.");
    }

    const isBlacklisted: boolean = await this.tokensService.isBlacklisted(jwti);
    if (isBlacklisted) {
      throw new UnauthorizedException("Invalid token.");
    }

    const authentication: AuthenticationEntity | null = await this.findAuthentication({
      where: {
        userId,
        provider,
        refreshToken: Not(IsNull()),
      },
    });
    if (!authentication) {
      throw new UnauthorizedException("User is not signed in.");
    }

    const { refreshToken } = authentication;
    await this.tokensService.verify(refreshToken!);

    const newAccessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      { expiresIn: this.tokensService.jwtAccessTokenExpiresIn },
    );

    return { accessToken: newAccessToken };
  }

  /**
   * Retrieves a user's profile.
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
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  /**
   * Sends an email with reset password instructions to the user.
   *
   * @param {LocalPasswordResetRequestDto} localPasswordResetRequestDto - The data transfer object containing the user's email.
   *
   * @returns {Promise<void>} A promise that resolves when the email with reset password instructions has been successfully sent.
   */
  async localPasswordResetRequest(localPasswordResetRequestDto: LocalPasswordResetRequestDto): Promise<void> {
    const { email } = localPasswordResetRequestDto;

    const user: UserEntity | null = await this.userService.findUser({
      relations: { authentications: true },
      select: {
        id: true,
        username: true,
        email: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: {
        email,
        authentications: {
          provider: AuthenticationProvider.LOCAL,
        },
      },
    });
    if (!user) {
      // Do not explicitly throw an error in this place;
      // For security reasons, it is better not to say, that the user has not been found, to avoid going through email addresses.
      // Return http status code 200 in controller instead;
      return;
    } else if (!user.authentications[0].metadata?.local?.isEmailVerified) {
      throw new UnauthorizedException(`Email "${email}" is not verified.`);
    }

    this.rmqMicroserviceClient.emit(
      EventName.AUTH_LOCAL_PASSWORD_RESET,
      this.eventsService.buildInstance(EventName.AUTH_LOCAL_PASSWORD_RESET, user.id, user.authentications[0].id, {
        email: user.email,
        username: user.username,
      }),
    );
  }

  /**
   * Resets the password for a user with a given token.
   *
   * @param {LocalPasswordResetConfirmDto} localPasswordResetConfirmDto - The data transfer object containing the token and the new password.
   *
   * @returns {Promise<void>} A promise that resolves when the password has been successfully reseted.
   */
  async localPasswordResetConfirm(localPasswordResetConfirmDto: LocalPasswordResetConfirmDto): Promise<void> {
    const { token, password } = localPasswordResetConfirmDto;

    const { userId, provider } = this.tokensService.decode(token);
    if (!userId || !provider) {
      throw new UnauthorizedException("Token is invalid.");
    }

    const user: UserEntity | null = await this.userService.findUser({
      relations: { authentications: true },
      select: {
        id: true,
        email: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: {
        id: userId,
        authentications: {
          provider,
        },
      },
    });
    if (!user) {
      throw new NotFoundException("User is not found.");
    } else if (!user.authentications[0].metadata?.local?.isEmailVerified) {
      throw new UnauthorizedException("Email is not verified.");
    }

    const currentPassword: string = user.authentications[0].metadata?.local?.password;
    await this.tokensService.verify(token, { secret: currentPassword });

    const newHashedPassword: string = await hash(password);

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication(
        { provider, userId, id: user.authentications[0].id },
        {
          metadata: {
            local: {
              ...user.authentications[0].metadata.local,
              password: newHashedPassword,
            },
          },
        },
        manager,
      );

      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED,
        this.eventsService.buildInstance(
          EventName.AUTH_LOCAL_PASSWORD_RESET_CONFIRMED,
          userId,
          user.authentications[0].id,
          {
            email: user.email,
          },
        ),
        manager,
      );
    });
  }

  /**
   * Confirms and processes a user account reactivation request.
   *
   * @param {LocalReactivationConfirmDto} localReactivationConfirmDto - The data transfer object containing the reactivation token.
   *
   * @returns {Promise<string>} - Access token.
   */
  async localReactivationConfirm(localReactivationConfirmDto: LocalReactivationConfirmDto): Promise<string> {
    const { token } = localReactivationConfirmDto;

    const { userId, provider } = await this.tokensService.verify(token);
    if (!userId || !provider || provider !== AuthenticationProvider.LOCAL) {
      throw new UnauthorizedException("Invalid token.");
    }

    const user: UserEntity | null = await this.userService.findUser({
      relations: { authentications: true },
      select: {
        id: true,
        isDeactivated: true,
        email: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: {
        id: userId,
        authentications: {
          provider,
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    } else if (!user.authentications[0].metadata?.local?.isEmailVerified) {
      throw new UnauthorizedException("Email is not verified.");
    } else if (!user.isDeactivated) {
      throw new BadRequestException(`User is not deactivated.`);
    }

    const accessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      { expiresIn: this.tokensService.jwtAccessTokenExpiresIn },
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId, provider },
      { expiresIn: this.tokensService.jwtRefreshTokenExpiresIn },
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication({ userId, provider }, { refreshToken }, manager);

      // Set refreshToken to null for all other user's authentications;
      await this.updateAuthentication(
        { userId, provider: Not(AuthenticationProvider.LOCAL) },
        { refreshToken: null, lastAccessedAt: () => "lastAccessedAt" },
        manager,
      );

      await this.userService.updateUser({ id: userId }, { isDeactivated: false }, manager);

      this.eventEmitter.emit(
        EventName.USER_REACTIVATED,
        this.eventsService.buildInstance(EventName.USER_REACTIVATED, userId, userId, {
          email: user.email,
        }),
        manager,
      );
    });

    return accessToken;
  }

  /**
   * Confirms and processes a user account restoration request.
   *
   * @param {LocalRestorationConfirmDto} localRestorationConfirmDto - The data transfer object containing the restoration token.
   *
   * @returns {Promise<string>} - Access token.
   */
  async localRestorationConfirm(localRestorationConfirmDto: LocalRestorationConfirmDto): Promise<string> {
    const { token } = localRestorationConfirmDto;

    const { userId, provider } = await this.tokensService.verify(token);
    if (!userId || !provider || provider !== AuthenticationProvider.LOCAL) {
      throw new UnauthorizedException("Invalid token.");
    }

    const user: UserEntity | null = await this.userService.findUser({
      relations: { authentications: true },
      select: {
        id: true,
        isDeactivated: true,
        deletedAt: true,
        email: true,
        authentications: {
          id: true,
          metadata: true,
        },
      },
      where: {
        id: userId,
        authentications: {
          provider,
        },
      },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    } else if (!user.authentications[0].metadata?.local?.isEmailVerified) {
      throw new UnauthorizedException("Email is not verified.");
    } else if (!user.deletedAt) {
      throw new BadRequestException(`User is not deleted.`);
    }

    const accessToken: string = await this.tokensService.generate(
      { userId, provider, jwti: uuidv4() },
      { expiresIn: this.tokensService.jwtAccessTokenExpiresIn },
    );
    const refreshToken: string = await this.tokensService.generate(
      { userId, provider },
      { expiresIn: this.tokensService.jwtRefreshTokenExpiresIn },
    );

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      await this.updateAuthentication({ userId, provider }, { refreshToken }, manager);

      // Set refreshToken to null for all other user's authentications;
      await this.updateAuthentication(
        { userId, provider: Not(AuthenticationProvider.LOCAL) },
        { refreshToken: null, lastAccessedAt: () => "lastAccessedAt" },
        manager,
      );

      await this.userService.restoreUser({ id: user.id }, manager);

      this.eventEmitter.emit(
        EventName.USER_RESTORED,
        this.eventsService.buildInstance(EventName.USER_RESTORED, userId, userId, {
          email: user.email,
        }),
        manager,
      );
    });

    return accessToken;
  }

  /**
   * Authenticates a user via an Identity Provider (IdP).
   *
   * @param {AuthenticationProvider} idP - The identity provider to authenticate with.
   * @param {AuthenticationViaIdP["userClaims"]} userClaims - The user claims from the identity provider.
   *
   * @returns {Promise<UserEntity>} A promise that resolves with the authenticated user entity.
   */
  async idPAuthentication(
    idP: AuthenticationProvider,
    userClaims: AuthenticationViaIdP["userClaims"],
  ): Promise<UserEntity> {
    switch (idP) {
      case AuthenticationProvider.GITHUB:
      case AuthenticationProvider.GOOGLE: {
        const { firstName, lastName, email, avatarUrl } = userClaims;
        let { username } = userClaims;

        return this.dataSource.transaction(async (manager: EntityManager): Promise<UserEntity> => {
          if (username) {
            const isUsernameTaken: UserEntity | null = await this.userService.findUser(
              {
                select: { id: true },
                where: { username },
                withDeleted: true,
              },
              manager,
            );
            if (isUsernameTaken) {
              username = undefined;
            }
          }

          let existingUser: UserEntity | null = await this.userService.findUser(
            {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                isDeactivated: true,
                authentications: {
                  id: true,
                  provider: true,
                  userId: true,
                  metadata: true,
                },
              },
              where: { email },
              withDeleted: true,
              relations: { authentications: true },
            },
            manager,
          );

          if (!existingUser) {
            const newUser: UserEntity = manager.create(UserEntity, {
              username,
              firstName,
              lastName,
              email,
              avatarUrl,
            });
            await manager.save(newUser);

            const authentication = manager.create(AuthenticationEntity, {
              userId: newUser.id,
              provider: idP,
            });
            await manager.save(authentication);

            newUser.authentications = [authentication];

            return newUser;
          } else {
            const updateValues: Partial<UserEntity> = {
              username,
              firstName,
              lastName,
              avatarUrl,
            };

            // TODO: when deactivatedById is added, change this if() { ... } statement with proper error throwing;
            if (existingUser.isDeactivated) {
              updateValues.isDeactivated = false;

              this.eventEmitter.emit(
                EventName.USER_REACTIVATED,
                this.eventsService.buildInstance(EventName.USER_REACTIVATED, existingUser.id, existingUser.id, {
                  email: existingUser.email,
                }),
                manager,
              );
            }

            if (existingUser.deletedAt) {
              await this.userService.restoreUser({ id: existingUser.id }, manager);

              this.eventEmitter.emit(
                EventName.USER_RESTORED,
                this.eventsService.buildInstance(EventName.USER_RESTORED, existingUser.id, existingUser.id, {
                  email: existingUser.email,
                }),
                manager,
              );
            }

            await this.userService.updateUser({ id: existingUser.id }, updateValues, manager);

            let authentication = existingUser.authentications.find((auth) => auth.provider === idP);
            if (!authentication) {
              authentication = manager.create(AuthenticationEntity, {
                userId: existingUser.id,
                provider: idP,
              });
            }
            // NOTE: Saving both already existing or new authentication instance is needed for updating the lastAuthenticatedAt;
            await manager.save(authentication);

            // User reloaded;
            existingUser = await this.userService.findUser(
              {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  isDeactivated: true,
                  authentications: {
                    id: true,
                    provider: true,
                    userId: true,
                    metadata: true,
                  },
                },
                where: { email },
                relations: { authentications: true },
              },
              manager,
            );

            if (!existingUser) {
              throw new NotFoundException("User not found");
            }

            return existingUser;
          }
        });
      }

      default: {
        throw new BadRequestException("Invalid idP");
      }
    }
  }
}
