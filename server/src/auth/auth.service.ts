import { BadRequestException, Injectable, Logger, LoggerService, UnauthorizedException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import TokenService from "./token.service.js";
import UserService from "@server/user/user.service";
import UserEntity from "@server/user/user.entity";
import { hash } from "../utils/hasher.js";
import { SignUpLocalDto } from "@server/auth/dto/auth.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EventName } from "@server/event/interfaces/event.interfaces";
import EventService from "@server/event/event.service";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

@Injectable()
export default class AuthService {
  private readonly logger: LoggerService;
  private readonly tokenService: TokenService;
  private readonly userService: UserService;
  private readonly eventService: EventService;
  private readonly eventEmitter: EventEmitter2;

  constructor(
    tokenService: TokenService,
    userService: UserService,
    eventService: EventService,
    eventEmitter: EventEmitter2,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
  ) {
    this.logger = new Logger(AuthService.name);
    this.tokenService = tokenService;
    this.userService = userService;
    this.eventService = eventService;
    this.eventEmitter = eventEmitter;
  }

  async localSignUp(signUpLocalDto: SignUpLocalDto): Promise<void> {
    const { username, firstName, lastName, email, avatarUrl, password } = signUpLocalDto;

    const user: UserEntity | null = await this.userService.find({
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

        await manager.save(user);
        await manager.save(authentication);

        this.eventEmitter.emit(
          EventName.AUTH_CREATED_LOCAL,
          this.eventService.build(EventName.AUTH_CREATED_LOCAL, user.id, authentication.id, {
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
          EventName.AUTH_CREATED_LOCAL,
          this.eventService.build(EventName.AUTH_CREATED_LOCAL, user.id, authentication.id, {
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
   * Authenticates user during the provided strategy.
   *
   * @param idP - Authentication provider.
   * @param userInfo - User information.
   * @param options - Additional options for the authentication process.
   *
   * @returns User entity or void if authentication is successful, otherwise throws a proper exception.
   */
  async authAccordingToStrategy(
    idP: AuthenticationProvider,
    userInfo: SignUpLocalDto,
    options: AuthAccordingToStrategyOptions = {},
  ): Promise<UserEntity | void> {
    // Both idPTokens (accessToken and refreshToken) are not used in the authentication flow,
    // so also not stored in database;
    // Besides, inner access token and inner refresh token are configured by the application itself
    // for further access to the protected API routes;
    const { accessToken, refreshToken } = options;
    const { username, email, firstName, lastName, avatarUrl, password } = userInfo;

    const user: UserEntity | null = await this.userService.find({
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

    switch (idP) {
      case "keycloak":
      case "google": {
        await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
          try {
            if (!user) {
              this.logger.log(`User with email "${email}" does not exist. Creating ...`);

              const user = transactionalEntityManager.create(UserEntity, {
                firstName,
                lastName,
                email,
                avatarUrl,
              });
              await transactionalEntityManager.save(user);

              const authentication = transactionalEntityManager.create(AuthenticationEntity, {
                userId: user.id,
                provider: idP,
              });
              await transactionalEntityManager.save(authentication);
            } else {
              this.logger.log(
                `User with email "${email}" already exists. Update profile partially and check related authentication ...`,
              );

              let authentication = user.authentications.find((auth) => auth.provider === idP);

              if (!authentication) {
                authentication = transactionalEntityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                });
              }

              await transactionalEntityManager.update(UserEntity, user.id, {
                firstName,
                lastName,
                avatarUrl,
              });

              // NOTE: Saving to already existing and new authentication instance is needed
              // NOTE: for updating the lastAuthenticatedAt field;
              await transactionalEntityManager.save(authentication);
            }
          } catch (error) {
            this.logger.error(error.message);

            throw new UnauthorizedException(`Authentication for "${username ?? email}" failed.`);
          }
        });

        break;
      }

      case "github": {
        break;
      }

      case "local": {
        const { method } = options;

        if (method === "signup") {
          return this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
            if (!user) {
              const isUsernameTaken: UserEntity | null = await manager.findOne(UserEntity, {
                select: { id: true },
                where: { username },
              });

              if (isUsernameTaken) {
                throw new BadRequestException(`Username is already taken.`);
              }

              const user: UserEntity = manager.create(UserEntity, { email });

              const hashedPassword = await hash(password);

              const authentication = manager.create(AuthenticationEntity, {
                userId: user.id,
                provider: idP,
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

              await manager.save(user);
              await manager.save(authentication);
            } else {
              let authentication: AuthenticationEntity | undefined = user.authentications.find(
                (auth: AuthenticationEntity): boolean => auth.provider === idP,
              );

              if (authentication) {
                if (authentication.metadata.local?.isEmailVerified) {
                  throw new BadRequestException(
                    `Already signed up. Please, sign in with local authentication credentials.`,
                  );
                }

                throw new BadRequestException("Already signed up. Email verification is required to proceed.");
              }

              const hashedPassword = await hash(password);

              authentication = manager.create(AuthenticationEntity, {
                userId: user.id,
                provider: idP,
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
            }
          });

          // TODO: send a message to the any queue service (Bull/RabbitMQ/Kafka) to implement email verification;
        } else if (method === "signin") {
          // try {
          //   if (!user) {
          //     if (!username) {
          //       throw new BadRequestException(
          //         "Username or email are required to proceed authentication with local provider.",
          //       );
          //     }
          //
          //     const isUserExistsWithUsername = await this.dataSource.getRepository(UserEntity).findOne({
          //       select: {
          //         id: true,
          //       },
          //       where: {
          //         username,
          //       },
          //     });
          //
          //     if (!isUserExistsWithUsername) {
          //       throw new NotFoundException(`User with: "${username ?? email}" does not exist. Please sign up first.`);
          //     }
          //
          //     email = isUserExistsWithUsername.email;
          //   }
          // } catch (error) {
          //   this.logger.error(error.message);
          //
          //   throw new UnauthorizedException(`SignIn user with "${username ?? email}" failed.`);
          // }
        }

        break;
      }

      default: {
        throw new BadRequestException("Authentication provider is not supported.");
      }
    }

    // const reloadUser = await this.userRepository.findOne({
    //   relations: ["authentications"],
    //   select: {
    //     id: true,
    //     username: true,
    //     email: true,
    //     firstName: true,
    //     lastName: true,
    //     avatarUrl: true,
    //     createdAt: true,
    //     updatedAt: true,
    //     authentications: {
    //       id: true,
    //       provider: true,
    //       lastAccessedAt: true,
    //     },
    //   },
    //   where: {
    //     email,
    //     authentications: { provider: idP },
    //   },
    // });
    //
    // return reloadUser!;
  }

  /**
   * Signs in a user based on the provided credentials and returns an access token.
   *
   * @param credentials - The authentication credentials for the user.
   *
   * @returns A promise that resolves with an object containing the access token.
   */
  async signIn(credentials: AuthCredentials): Promise<any> {
    // async signIn(credentials: AuthCredentials): Promise<{ accessToken: string }> {
    //   const { provider, email, password } = credentials;
    //
    //   const user = await this.userRepository.findOne({
    //     relations: ["authentications"],
    //     select: {
    //       id: true,
    //       authentications: {
    //         provider: true,
    //         password: true,
    //       },
    //     },
    //     where: {
    //       email,
    //       authentications: {
    //         provider,
    //       },
    //     },
    //   });
    //
    //   if (!user) {
    //     throw new NotFoundException("Authentication failed. User not found.");
    //   }
    //
    //   if (provider === "local") {
    //     if (!password) {
    //       throw new BadRequestException("Authentication failed. Password is required.");
    //     }
    //
    //     const isPasswordValid = await verifyHash(password, user.authentications[0].password!);
    //
    //     if (!isPasswordValid) {
    //       throw new UnauthorizedException("Authentication failed. Invalid password.");
    //     }
    //   }
    //
    //   const payload: JwtPayload = {
    //     userId: user.id,
    //     provider,
    //     jwti: uuidv4(),
    //   };
    //
    //   return this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
    //     try {
    //       const { accessToken, refreshToken } = await this.tokenService.generateBothTokens(payload);
    //       const encryptedRefreshToken = encrypt(refreshToken);
    //
    //       await transactionalEntityManager.update(
    //         AuthenticationEntity,
    //         { userId: user.id, provider },
    //         { refreshToken: encryptedRefreshToken },
    //       );
    //
    //       // NOTE: Reset refresh token to null for all other authentication providers, but not for the current one;
    //       await transactionalEntityManager.update(
    //         AuthenticationEntity,
    //         { userId: user.id, provider: Not(provider) },
    //         { refreshToken: null },
    //       );
    //
    //       return { accessToken };
    //     } catch (error) {
    //       this.logger.error(error.message);
    //
    //       throw new UnauthorizedException("Authentication failed.");
    //     }
    //   });
    // }
  }

  // async emailVerification(emailOrUsername: string): Promise<void> {
  //   if (!emailOrUsername) {
  //     throw new BadRequestException("Email or username is required.");
  //   }
  // }
}
