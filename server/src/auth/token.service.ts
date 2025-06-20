import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "../configs/interfaces/appConfiguration.interface.js";

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

  async generateBothTokens(payload: Record<string, unknown>): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    return { accessToken, refreshToken };
  }

  async generateAccessToken(payload: Record<string, unknown>): Promise<string> {
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.jwtAccessTokenExpirationTime,
    });

    return accessToken;
  }

  async generateRefreshToken(payload: Record<string, unknown>): Promise<string> {
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
