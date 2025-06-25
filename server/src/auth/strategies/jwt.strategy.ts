import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload, UserInfoAfterJwtAuthGuard } from "../interfaces/auth.interface.js";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface.js";
import { Request } from "express";
import UserEntity from "@server/user/user.entity";
import { IsNull, Not } from "typeorm";

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request.signedCookies?.accessToken;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration.secret")!,
    });
  }

  async validate(payload: JwtPayload): Promise<UserInfoAfterJwtAuthGuard> {
    if (!payload) {
      throw new UnauthorizedException("Authentication failed. Token payload is not valid or not provided.");
    }

    const user = await UserEntity.findOne({
      where: {
        id: payload.userId,
        authentications: {
          provider: payload.provider,
          refreshToken: Not(IsNull()),
        },
      },
      relations: ["authentications"],
    });

    if (!user) {
      throw new UnauthorizedException("Authentication failed. User not found or not authenticated.");
    }

    return {
      username: user.username,
      email: user.email,
      provider: payload.provider,
    };
  }
}
