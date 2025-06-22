import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interface.js";
import { JwtPayload } from "./interfaces/auth.interface.js";

@Injectable()
export default class TokenService {
  private readonly jwtAccessTokenExpirationTime: string;
  private readonly jwtRefreshTokenExpirationTime: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtAccessTokenExpirationTime = configService.get<AppConfiguration["jwtConfiguration"]["accessTokenExpiresIn"]>(
      "jwtConfiguration.accessTokenExpiresIn",
    )!;
    this.jwtRefreshTokenExpirationTime = configService.get<
      AppConfiguration["jwtConfiguration"]["refreshTokenExpiresIn"]
    >("jwtConfiguration.refreshTokenExpiresIn")!;
  }

  /**
   * Generates both an access token and a refresh token given a payload.
   * @param payload The payload to sign.
   *
   * @returns An object containing the access token and refresh token.
   */
  async generateBothTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Generates an access token given a payload.
   * @param payload The payload to sign.
   *
   * @returns A promise that resolves with the access token.
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.jwtAccessTokenExpirationTime,
    });

    return accessToken;
  }

  /**
   * Generates a refresh token given a payload.
   * @param payload The payload to sign.
   *
   * @returns A promise that resolves with the refresh token.
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.jwtRefreshTokenExpirationTime,
    });

    return refreshToken;
  }

  async verifyRefreshToken(token: string): Promise<Record<string, any>> {
    const payload = await this.jwtService.verifyAsync<Record<string, any>>(token);

    return payload;
  }
}
