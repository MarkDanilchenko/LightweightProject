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
import { EntityManager, Repository } from "typeorm";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AuthenticationProviderKind } from "./types/auth.types.js";
import GoogleOAuth2 from "./interfaces/googleOAuth2.interface.js";
import TokenService from "./token.service.js";
import { encrypt } from "../utils/encoder.js";

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

  async validateUserAuthAccordingToStrategy(
    idP: AuthenticationProviderKind,
    userProfile: GoogleOAuth2["userProfile"],
    userIdPTokens?: GoogleOAuth2["userIdPTokens"],
  ): Promise<UserEntity> {
    switch (idP) {
      case "google": {
        const { userName, firstName, lastName, email, avatarUrl } = userProfile;
        // NOTE: IdP access token and refresh token (userIdPTokens) are not used, so also not stored in database;
        // NOTE: Access token and refresh token are configured by the web application for further access to the protected API routes.
        const { accessToken, refreshToken } = userIdPTokens ?? {};

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

              const authentication = await transactionalEntityManager.findOne(AuthenticationEntity, {
                where: { userId: user.id, provider: idP },
              });

              if (!authentication) {
                const authentication = this.entityManager.create(AuthenticationEntity, {
                  userId: user.id,
                  provider: idP,
                });
                await this.entityManager.save(authentication);
              }
            }
          } catch (error) {
            this.logger.error(error.message);

            throw new BadRequestException(`Authentication for user: ${userName ?? email} failed.`);
          }
        });

        const reloadUser = await this.userRepository.findOne({
          where: { email, username: userName },
          relations: ["authentications"],
        });

        if (!reloadUser) {
          throw new BadRequestException("User could not be reloaded.");
        }

        return reloadUser;
      }

      // case "local": {
      //   return;
      // }

      default: {
        throw new NotAcceptableException(`Authentication provider is not supported.`);
      }
    }
  }

  async signIn(user: UserEntity, provider: AuthenticationProviderKind): Promise<{ accessToken: string }> {
    try {
      const payload = {
        userId: user.id,
        provider,
      };

      const { accessToken, refreshToken } = await this.tokenService.generateBothTokens(payload);

      const encryptedRefreshToken = encrypt(refreshToken);

      await this.authenticationRepository.update({ userId: user.id }, { refreshToken: encryptedRefreshToken });

      return { accessToken };
    } catch (error) {
      this.logger.error(error.message);

      throw new UnauthorizedException("Authentication failed.");
    }
  }
}
