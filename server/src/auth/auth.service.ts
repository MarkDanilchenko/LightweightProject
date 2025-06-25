import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
  NotAcceptableException,
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
   * Authenticate a user according to the given strategy.
   *
   * @param idP The authentication provider to use.
   * @param profile The user profile to authenticate.
   * @param idPTokens The tokens for the given authentication provider.
   * @returns A promise that resolves to the authenticated user.
   */
  async authAccordingToStrategy(
    idP: AuthenticationProvider,
    profile: Partial<UserEntity>,
    idPTokens?: idPTokens,
  ): Promise<UserEntity> {
    const { username, firstName, lastName, email, avatarUrl } = profile;
    // NOTE: Both idPTokens are not used for authentication, so also not stored in database;
    // NOTE: Inner access token and refresh token are configured by the web application itself
    // for further access to the protected API routes.
    const { accessToken, refreshToken } = idPTokens ?? {};

    if (!username && !email) {
      throw new BadRequestException("Username or email are required to proceed authentication.");
    }

    switch (idP) {
      case "google": {
        const user = await this.userRepository.findOne({
          where: [{ username }, { email }, { username, email }],
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
              this.logger.log(`User "${username ?? email}" already exists. Checking authentication ...`);

              let authentication = await transactionalEntityManager.findOne(AuthenticationEntity, {
                where: { userId: user.id, provider: idP },
              });

              if (!authentication) {
                authentication = transactionalEntityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                });
              }

              // NOTE: Reset refresh token to null for all other authentication providers but not for the current one;
              await transactionalEntityManager.update(
                AuthenticationEntity,
                { userId: user.id, provider: Not(idP) },
                { refreshToken: null },
              );

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
        throw new NotAcceptableException(`Authentication provider is not supported.`);
      }
    }

    const reloadUser = await this.userRepository.findOne({
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
    try {
      const { provider, username, email, password } = credentials;

      const user = await this.userRepository.findOne({
        where: [
          { username, email, authentications: { provider } },
          { username, authentications: { provider } },
          { email, authentications: { provider } },
        ],
        relations: ["authentications"],
      });
      if (!user) {
        throw new UnauthorizedException("Authentication failed. User not found.");
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
      };

      const { accessToken, refreshToken } = await this.tokenService.generateBothTokens(payload);
      const encryptedRefreshToken = encrypt(refreshToken);

      await this.authenticationRepository.update(
        { userId: user.id, provider },
        { refreshToken: encryptedRefreshToken },
      );

      return { accessToken };
    } catch (error) {
      this.logger.error(error.message);

      throw new UnauthorizedException("Authentication failed.");
    }
  }
}
