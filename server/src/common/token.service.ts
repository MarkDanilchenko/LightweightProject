import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenPayload } from "@server/common/interfaces/common.interfaces";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

@Injectable()
export default class TokenService {
  private readonly configService: ConfigService;
  private readonly jwtService: JwtService;
  public readonly jwtRefreshTokenExpiresIn: string;
  public readonly jwtAccessTokenExpiresIn: string;

  constructor(configService: ConfigService, jwtService: JwtService) {
    this.configService = configService;
    this.jwtService = jwtService;
    this.jwtRefreshTokenExpiresIn = configService.get<AppConfiguration["jwtConfiguration"]["refreshTokenExpiresIn"]>(
      "jwtConfiguration.refreshTokenExpiresIn",
    )!;
    this.jwtAccessTokenExpiresIn = configService.get<AppConfiguration["jwtConfiguration"]["accessTokenExpiresIn"]>(
      "jwtConfiguration.accessTokenExpiresIn",
    )!;
  }

  /**
   * Generates a jwt with the given payload and expiresIn.
   *
   * @param payload {TokenPayload} The payload to sign.
   * @param [expiresIn] {string} The time until the token expires. Defaults to 1 day.
   *
   * @returns {Promise<string>} A promise that resolves with the generated jwt.
   */
  async generateToken(payload: TokenPayload, expiresIn?: string): Promise<string> {
    return this.jwtService.signAsync(payload, { expiresIn: expiresIn || "1d" });
  }

  /**
   * Verifies the given jwt.
   *
   * @param token {string} The token to verify.
   *
   * @returns {Promise<TokenPayload>} A promise that resolves with the verified token payload
   * or rejects with an UnauthorizedException if the token is invalid or expired.
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    return this.jwtService.verifyAsync<TokenPayload>(token);
  }

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
}
