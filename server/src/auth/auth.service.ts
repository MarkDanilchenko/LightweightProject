import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import UserEntity from "@server/user/user.entity";
import { DataSource, EntityManager, Not, Repository } from "typeorm";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AuthenticationProvider, signInCredentials } from "./types/auth.types.js";
import TokenService from "./token.service.js";
import { decrypt, encrypt } from "../utils/encrypter.js";
import { idPTokens, JwtPayload } from "./interfaces/auth.interface.js";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export default class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Authenticate or register a new user, according to the given strategy.
   *
   * @param idP The authentication provider.
   * @param userInfo The user information for authentication.
   * @param idPTokens The tokens from the given authentication provider.
   *
   * @returns A promise that resolves with the authenticated user.
   */
  async authAccordingToStrategy(
    idP: AuthenticationProvider,
    userInfo: Partial<UserEntity>,
    idPTokens?: idPTokens,
  ): Promise<UserEntity> {
    // NOTE: Both idPTokens are not used for authentication, so also not stored in database;
    // NOTE: Inner access token and refresh token are configured by the web application itself
    // for further access to the protected API routes.
    const { accessToken, refreshToken } = idPTokens ?? {};
    const { username, email, firstName, lastName, avatarUrl } = userInfo;

    if (!username && !email) {
      throw new BadRequestException("Username or email are required to proceed authentication.");
    }

    switch (idP) {
      case "google": {
        const user = await this.userRepository.findOne({
          relations: ["authentications"],
          select: {
            id: true,
            authentications: {
              provider: true,
            },
          },
          where: {
            username,
            email,
          },
        });

        await this.dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
          try {
            if (!user) {
              this.logger.log(`User "${username ?? email}" does not exist. Creating ...`);

              const user = transactionalEntityManager.create(UserEntity, {
                username,
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
              this.logger.log(`User "${username ?? email}" already exists. Checking related authentication ...`);

              let authentication = user.authentications.find((auth) => auth.provider === idP);

              if (!authentication) {
                authentication = transactionalEntityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                });
              }

              // NOTE: Save is both to already existing and new authentication instance is needed
              // for properly setting the lastAuthenticatedAt field;
              await transactionalEntityManager.save(authentication);
            }
          } catch (error) {
            this.logger.error(error.message);

            throw new BadRequestException(`Authentication user "${username ?? email}" failed.`);
          }
        });

        break;
      }

      case "local": {
        break;
      }

      default: {
        throw new BadRequestException(`Authentication provider is not supported.`);
      }
    }

    const reloadUser = await this.userRepository.findOne({
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
      where: { email, username, authentications: { provider: idP } },
      relations: ["authentications"],
    });

    return reloadUser!;
  }

  /**
   * Signs in a user based on the provided credentials and returns an access token.
   *
   * @param credentials - The sign-in credentials including provider, username, email, and password.
   *
   * @returns A promise that resolves with an object containing the access token.
   */
  async signIn(credentials: signInCredentials): Promise<{ accessToken: string }> {
    const { provider, username, email, password } = credentials;

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
        username,
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

      const decryptedPassword = decrypt(user.authentications[0].password!);

      if (decryptedPassword !== password) {
        throw new UnauthorizedException("Authentication failed. Wrong password.");
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

        throw new BadRequestException("Authentication failed.");
      }
    });
  }
}
