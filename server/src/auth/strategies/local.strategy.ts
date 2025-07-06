import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import AuthService from "../auth.service.js";
import { AuthAccordingToStrategyOptions, AuthCredentials } from "../interfaces/auth.interface.js";

@Injectable()
export default class LocalAuthStrategy extends PassportStrategy(Strategy, "local") {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "login",
      passwordField: "password",
      passReqToCallback: true,
    });
  }

  async validate(req: Request, login: string, password: string, done: (...args: unknown[]) => void): Promise<void> {
    // It is unknown whether login is email or username in local strategy.
    const credentials: AuthCredentials = {
      username: login,
      email: login,
      password: password,
      provider: "local",
    };

    const options: AuthAccordingToStrategyOptions = {
      routeUrl: req.url,
    };

    const user = await this.authService.authAccordingToStrategy(credentials.provider, credentials, options);

    done(null, user);
  }
}
