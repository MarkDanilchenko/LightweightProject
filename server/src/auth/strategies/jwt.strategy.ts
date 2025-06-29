import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload, JwtAuthGuardResponse } from "../interfaces/auth.interface.js";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interface.js";
import { Request } from "express";
import UserService from "@server/user/user.service";

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      // Extract accessToken firstly from cookies and secondly from headers;
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

  async validate(payload: JwtPayload): Promise<JwtAuthGuardResponse> {
    if (!payload) {
      throw new UnauthorizedException("Authentication failed. Token payload is not provided.");
    }

    const { jwti, userId, provider } = payload;

    // TODO: need to check jwti for presence in Redis

    const user = await this.userService.findByPk(userId, {
      relations: ["authentications"],
      select: {
        id: true,
        username: true,
        email: true,
        authentications: {
          provider: true,
        },
      },
      where: {
        authentications: {
          provider,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Authentication failed. User not found or not authenticated.");
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      provider: user.authentications[0].provider,
    };
  }
}
