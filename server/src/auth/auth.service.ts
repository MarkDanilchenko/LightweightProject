import {
  BadRequestException,
  Injectable,
  Logger,
  LoggerService,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import UserEntity from "@server/user/user.entity";
import { DataSource, EntityManager, Not, Repository } from "typeorm";
import { AuthenticationProvider } from "./types/auth.types.js";
import TokenService from "./token.service.js";
import { encrypt } from "../utils/encrypter.js";
import { AuthAccordingToStrategyOptions, AuthCredentials, JwtPayload } from "./interfaces/auth.interface.js";
import { v4 as uuidv4 } from "uuid";
import { hash, verifyHash } from "../utils/hasher.js";

@Injectable()
export default class AuthService {
  private readonly logger: LoggerService;

  constructor(
    private readonly tokenService: TokenService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    this.logger = new Logger(AuthService.name);
  }

  /**
   * Authenticates a user using the provided strategy.
   *
   * @param idP - The authentication provider to use.
   * @param userInfo - The user information to authenticate.
   * @param options - Additional options for the authentication process.
   *
   * @returns The authenticated user if successful, otherwise throws an error.
   */
  async authAccordingToStrategy(
    idP: AuthenticationProvider,
    userInfo: Partial<UserEntity> & {
      password?: string;
    },
    options?: AuthAccordingToStrategyOptions,
  ): Promise<UserEntity | void> {
    // NOTE: Both idPTokens (accessToken and refreshToken) are not used for authentication, so also not stored in database;
    // NOTE: Inner access token and refresh token are configured by the web application itself
    // NOTE: for further access to the protected API routes.
    const { accessToken, refreshToken, routeUrl } = options ?? {};
    const { username, firstName, lastName, avatarUrl, password } = userInfo;
    let { email } = userInfo;

    if (!email) {
      throw new BadRequestException("Email is required to proceed authentication.");
    }

    const user = await this.userRepository.findOne({
      relations: ["authentications"],
      select: {
        id: true,
        authentications: {
          id: true,
          userId: true,
          provider: true,
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

      case "local": {
        // TODO: Add email confirmation is a must
        if (!password) {
          throw new BadRequestException("Password is required to proceed local authentication.");
        }

        // NOTE: This case is the local signup;
        if (!(routeUrl && routeUrl.includes("local/signin"))) {
          return this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            try {
              if (username) {
                const isUsernameTaken = await transactionalEntityManager.findOne(UserEntity, {
                  where: {
                    username: username!,
                    email: Not(email!),
                  },
                });

                if (isUsernameTaken) {
                  throw new BadRequestException(`Username: "${username}" is already taken. Please choose another one.`);
                }
              }

              if (!user) {
                this.logger.log(`User with email "${email}" does not exist. Creating ...`);

                const user = transactionalEntityManager.create(UserEntity, {
                  username,
                  firstName,
                  lastName,
                  email,
                  avatarUrl,
                });
                await transactionalEntityManager.save(user);

                const hashedPassword = await hash(password);

                const authentication = transactionalEntityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                  password: hashedPassword,
                });
                await transactionalEntityManager.save(authentication);
              } else {
                this.logger.log(
                  `User with email: "${email}" already exists. Update profile partially and check related authentication ...`,
                );

                let authentication = user.authentications.find((auth) => auth.provider === idP);

                if (!authentication) {
                  const hashedPassword = await hash(password);

                  authentication = transactionalEntityManager.create(AuthenticationEntity, {
                    userId: user.id,
                    provider: idP,
                    password: hashedPassword,
                  });

                  await transactionalEntityManager.update(UserEntity, user.id, {
                    username,
                    firstName,
                    lastName,
                    avatarUrl,
                  });

                  await transactionalEntityManager.save(authentication);
                } else {
                  throw new BadRequestException(
                    `User with email: "${email}" has already been signed up. Please, sign in using your local authentication credentials.`,
                  );
                }
              }
            } catch (error) {
              this.logger.error(error.message);

              throw new UnauthorizedException(`SignUp user with "${username ?? email}" failed.`);
            }
          });
        }

        // NOTE: This case is the local signin;
        try {
          if (!user) {
            if (!username) {
              throw new BadRequestException(
                "Username or email are required to proceed authentication with local provider.",
              );
            }

            const isUserExistsWithUsername = await this.dataSource.getRepository(UserEntity).findOne({
              select: {
                id: true,
              },
              where: {
                username,
              },
            });

            if (!isUserExistsWithUsername) {
              throw new NotFoundException(`User with: "${username ?? email}" does not exist. Please sign up first.`);
            }

            email = isUserExistsWithUsername.email;
          }
        } catch (error) {
          this.logger.error(error.message);

          throw new UnauthorizedException(`SignIn user with "${username ?? email}" failed.`);
        }

        break;
      }

      default: {
        throw new BadRequestException(`Authentication provider is not supported.`);
      }
    }

    const reloadUser = await this.userRepository.findOne({
      relations: ["authentications"],
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        authentications: {
          id: true,
          provider: true,
          lastAccessedAt: true,
        },
      },
      where: {
        email,
        authentications: { provider: idP },
      },
    });

    return reloadUser!;
  }

  /**
   * Signs in a user based on the provided credentials and returns an access token.
   *
   * @param credentials - The authentication credentials for the user.
   *
   * @returns A promise that resolves with an object containing the access token.
   */
  async signIn(credentials: AuthCredentials): Promise<{ accessToken: string }> {
    const { provider, email, password } = credentials;

    const user = await this.userRepository.findOne({
      relations: ["authentications"],
      select: {
        id: true,
        authentications: {
          provider: true,
          password: true,
        },
      },
      where: {
        email,
        authentications: {
          provider,
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Authentication failed. User not found.");
    }

    if (provider === "local") {
      if (!password) {
        throw new BadRequestException("Authentication failed. Password is required.");
      }

      const isPasswordValid = await verifyHash(password, user.authentications[0].password!);

      if (!isPasswordValid) {
        throw new UnauthorizedException("Authentication failed. Invalid password.");
      }
    }

    const payload: JwtPayload = {
      userId: user.id,
      provider,
      jwti: uuidv4(),
    };

    return this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
      try {
        const { accessToken, refreshToken } = await this.tokenService.generateBothTokens(payload);
        const encryptedRefreshToken = encrypt(refreshToken);

        await transactionalEntityManager.update(
          AuthenticationEntity,
          { userId: user.id, provider },
          { refreshToken: encryptedRefreshToken },
        );

        // NOTE: Reset refresh token to null for all other authentication providers, but not for the current one;
        await transactionalEntityManager.update(
          AuthenticationEntity,
          { userId: user.id, provider: Not(provider) },
          { refreshToken: null },
        );

        return { accessToken };
      } catch (error) {
        this.logger.error(error.message);

        throw new UnauthorizedException("Authentication failed.");
      }
    });
  }
}
