import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export default class TokenService {
  private readonly configService: ConfigService;
  private readonly jwtService: JwtService;

  constructor(configService: ConfigService, jwtService: JwtService) {
    this.configService = configService;
    this.jwtService = jwtService;
  }

  /**
   * Generates a JWT token that can be used to verify a local user's email address.
   * The token will contain the user's ID and will expire after the given TTL or 1 day if no TTL is given.
   *
   * @param userId The ID of the user to generate the token for.
   * @param [ttl] The TTL of the token in seconds. If not given, the token will expire after 1 day.
   *
   * @returns A promise that resolves with the generated JWT token.
   */
  async generateLocalEmailVerificationToken(userId: string, ttl?: string): Promise<string> {
    return this.jwtService.signAsync({ userId }, { expiresIn: ttl || "1d" });
  }

  //   /**
  //    * Generates both an access token and a refresh token given a payload.
  //    * @param payload The payload to sign.
  //    *
  //    * @returns An object containing the access token and refresh token.
  //    */
  //   async generateBothTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
  //     const [accessToken, refreshToken] = await Promise.all([
  //       this.generateAccessToken(payload),
  //       this.generateRefreshToken(payload),
  //     ]);
  //
  //     return { accessToken, refreshToken };
  //   }
  //
  //   /**
  //    * Generates an access token given a payload.
  //    * @param payload The payload to sign.
  //    *
  //    * @returns A promise that resolves with the access token.
  //    */
  //   async generateAccessToken(payload: JwtPayload): Promise<string> {
  //     const accessToken = await this.jwtService.signAsync(payload, {
  //       expiresIn: this.jwtAccessTokenExpirationTime,
  //     });
  //
  //     return accessToken;
  //   }
  //
  //   /**
  //    * Generates a refresh token given a payload.
  //    * @param payload The payload to sign.
  //    *
  //    * @returns A promise that resolves with the refresh token.
  //    */
  //   async generateRefreshToken(payload: JwtPayload): Promise<string> {
  //     const refreshToken = await this.jwtService.signAsync(payload, {
  //       expiresIn: this.jwtRefreshTokenExpirationTime,
  //     });
  //
  //     return refreshToken;
  //   }
  //
  //   /**
  //    * Refreshes an access token.
  //    *
  //    * @param accessToken The access token to refresh.
  //    *
  //    * @returns A promise that resolves with an object containing the new access token.
  //    *
  //    * @throws UnauthorizedException If the access token is invalid or the related user or authentication are not found.
  //    */
  //   async refreshAccessToken(accessToken: string): Promise<{ accessToken: string }> {
  //     const payload: JwtPayload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
  //       ignoreExpiration: true,
  //     });
  //
  //     if (!payload) {
  //       throw new UnauthorizedException("Authentication failed. Token payload is not provided.");
  //     }
  //
  //     const { jwti, userId, provider } = payload;
  //
  //     const user = await this.userService.findByPk(userId, {
  //       relations: ["authentications"],
  //       select: {
  //         id: true,
  //         username: true,
  //         email: true,
  //         authentications: {
  //           provider: true,
  //           refreshToken: true,
  //         },
  //       },
  //       where: {
  //         authentications: {
  //           provider,
  //           refreshToken: Not(IsNull()),
  //         },
  //       },
  //     });
  //
  //     if (!user) {
  //       throw new UnauthorizedException("Authentication failed. User or related authentication are not found.");
  //     }
  //
  //     const { refreshToken } = user.authentications[0];
  //
  //     const decryptedRefreshToken = decrypt(refreshToken!);
  //
  //     await this.verifyRefreshToken(decryptedRefreshToken);
  //
  //     const newAccessToken = await this.generateAccessToken({
  //       jwti,
  //       userId,
  //       provider,
  //     });
  //
  //     return { accessToken: newAccessToken };
  //   }
  //
  //   /**
  //    * Verifies the given refresh token.
  //    *
  //    * @param refreshToken The refresh token to verify.
  //    *
  //    * @throws UnauthorizedException If the refresh token is invalid.
  //    */
  //   async verifyRefreshToken(refreshToken: string): Promise<void> {
  //     await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
  //   }
}
