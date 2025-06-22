import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
  NotAcceptableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import UserEntity from "@server/user/user.entity";
import { EntityManager, Not, Repository } from "typeorm";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AuthenticationProviderKind } from "./types/auth.types.js";
import GoogleOAuth2 from "./interfaces/googleOAuth2.interface.js";
import TokenService from "./token.service.js";
import { encrypt } from "../utils/encoder.js";
import { JwtPayload } from "./interfaces/auth.interface.js";

@Injectable()
export default class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(AuthenticationEntity)
    private readonly authenticationRepository: Repository<AuthenticationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Registers a new user if the user does not exist in the database and
   * creates a new authentication record for the user. If the user already
   * exists, it only creates a new authentication record for the user.
   *
   * @param idP The authentication provider kind.
   * @param userProfile The user profile returned from the authentication provider.
   * @param userIdPTokens The user IdP tokens containing the access token and refresh token.
   *
   * @returns The user entity with the newly created authentication record.
   */
  async authAccordingToStrategy(
    idP: AuthenticationProviderKind,
    userProfile: GoogleOAuth2["userProfile"],
    userIdPTokens?: GoogleOAuth2["userIdPTokens"],
  ): Promise<UserEntity> {
    const { userName, firstName, lastName, email, avatarUrl } = userProfile;
    // NOTE: IdP access token and refresh token (userIdPTokens) are not used for authentication,
    // so also not stored in database;
    // NOTE: Inner access token and refresh token are configured by the web application
    // for further access to the protected API routes.
    const { accessToken, refreshToken } = userIdPTokens ?? {};

    switch (idP) {
      case "google": {
        if (!userName || !email) {
          throw new BadRequestException("User name or email are required from Google to proceed.");
        }

        const user = await this.userRepository.findOne({
          where: { email, username: userName },
        });

        await this.entityManager.transaction(async (transactionalEntityManager) => {
          try {
            if (!user) {
              this.logger.log(`User ${userName ?? email} does not exist. Creating ...`);

              const user = transactionalEntityManager.create(UserEntity, {
                username: userName,
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
              this.logger.log(`User ${userName ?? email} already exists. Checking authentication ...`);

              let authentication = await transactionalEntityManager.findOne(AuthenticationEntity, {
                where: { userId: user.id, provider: idP },
              });

              if (!authentication) {
                authentication = this.entityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                });

                // NOTE: Set refresh token to null for all other authentication providers
                // but not for the current one;
                await this.entityManager.update(
                  AuthenticationEntity,
                  { userId: user.id, provider: Not(idP) },
                  { refreshToken: null },
                );
              }
              // NOTE: Save is both to already existing and new authentication is needed
              // for properly setting the lastAuthenticatedAt field;
              await this.entityManager.save(authentication);
            }
          } catch (error) {
            this.logger.error(error.message);

            throw new BadRequestException(`Authentication for user: ${userName ?? email} failed.`);
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
      where: { email, username: userName, authentications: { provider: idP } },
      relations: ["authentications"],
    });

    if (!reloadUser) {
      throw new BadRequestException("User could not be reloaded after authentication.");
    }

    return reloadUser;
  }

  /**
   * Generates an access token and saves a refresh token to the database
   * for the given user and authentication provider.
   *
   * @param user The user to authenticate.
   * @param provider The authentication provider to use.
   */
  async signIn(user: UserEntity, provider: AuthenticationProviderKind): Promise<{ accessToken: string }> {
    try {
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
