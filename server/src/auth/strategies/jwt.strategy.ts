import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { ExtractJwt, Strategy, VerifiedCallback } from "passport-jwt";
import { TokenPayload } from "@server/tokens/interfaces/token.interfaces";
import { RequestWithSignedCookies } from "@server/common/types/common.types";
import TokensService from "@server/tokens/tokens.service";

@Injectable()
export default class JwtStrategy extends PassportStrategy(Strategy, "jwtStrategy") {
  private readonly configService: ConfigService;
  private readonly tokensService: TokensService;

  constructor(configService: ConfigService, tokensService: TokensService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: RequestWithSignedCookies): string | null => {
          return request.signedCookies?.accessToken;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration.secret")!,
    });

    this.configService = configService;
    this.tokensService = tokensService;
  }

  async validate(payload: TokenPayload, done: VerifiedCallback): Promise<void> {
    if (!payload) {
      throw new UnauthorizedException("Authentication failed.");
    }

    const { jwti } = payload;
    if (!jwti) {
      throw new UnauthorizedException("Authentication failed. Token is invalid.");
    }

    const isBlackListed: boolean = await this.tokensService.isBlacklisted(jwti);
    if (isBlackListed) {
      throw new UnauthorizedException("Authentication failed. Token is invalid.");
    }

    // Do not return user instance here, because it is an additional select-request to the database;
    // It is not needed for high-load Guards because of performance reasons;
    // So, return only payload;
    done(null, payload);
  }
}
