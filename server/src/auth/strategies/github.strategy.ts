import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-github2";
import { ConfigService } from "@nestjs/config";
import AuthService from "#server/auth/auth.service";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import UserEntity from "#server/users/users.entity";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";

@Injectable()
export default class GitHubOAuth2Strategy extends PassportStrategy(Strategy, "githubOAuth2") {
  private readonly authService: AuthService;

  constructor(configService: ConfigService, authService: AuthService) {
    super({
      clientID: configService.get<AppConfiguration["authConfiguration"]["github"]["clientID"]>(
        "authConfiguration.github.clientID",
      )!,
      clientSecret: configService.get<AppConfiguration["authConfiguration"]["github"]["clientSecret"]>(
        "authConfiguration.github.clientSecret",
      )!,
      callbackURL: configService.get<AppConfiguration["authConfiguration"]["github"]["callbackURL"]>(
        "authConfiguration.github.callbackURL",
      )!,

      // For OAuth2 "user:email" scope is enough to retrieve both user's email and profile
      // with minimum amount of confidential data;
      scope: ["user:email"],
    });

    this.authService = authService;
  }

  /**
   * Validate the users during the GitHub OAuth2 strategy.
   *
   * @param {string} accessToken The access token received from GitHub
   * @param {string} refreshToken The refresh token received from GitHub
   * @param {Profile} profile The users profile received from GitHub
   * @param {(error: any, user?: any, info?: any) => void} done The callback for the validation result
   *
   * @returns {Promise<void>} A promise that resolves once the validation is complete
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: any, user?: any, info?: any) => void,
  ): Promise<void> {
    // Both accessToken and refreshToken are tokens from GitHub and not used in the app authentication flow;
    // Inner access and refresh tokens are configured by the app itself
    // for further access to the protected API endpoints;
    const { emails, photos, username, name } = profile;

    const email = emails && Array.isArray(emails) && emails[0] ? emails[0].value : undefined;
    if (!email) {
      return done(new UnauthorizedException("Email is required"), undefined);
    }

    try {
      const user: UserEntity = await this.authService.idPAuthentication(AuthenticationProvider.GITHUB, {
        firstName: name?.givenName,
        lastName: name?.familyName,
        username,
        email,
        avatarUrl: photos && Array.isArray(photos) && photos[0] ? photos[0].value : undefined,
      });

      done(null, user);
    } catch (error: unknown) {
      return done(new UnauthorizedException(error as Error).message, undefined);
    }
  }
}
