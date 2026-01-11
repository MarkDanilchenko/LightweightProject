import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import UsersService from "@server/users/users.service";
import UserEntity from "@server/users/users.entity";
import { AuthenticationProvider, AuthMetadata } from "@server/auth/interfaces/auth.interfaces";
import { verifyHash } from "@server/utils/hasher";

@Injectable()
export default class LocalAuthStrategy extends PassportStrategy(Strategy, "localAuthStrategy") {
  private readonly usersService: UsersService;

  constructor(userService: UsersService) {
    super({
      usernameField: "login",
      passwordField: "password",
      passReqToCallback: true, // Put request object into the validate function in some purpose if we need to access it;
    });

    this.usersService = userService;
  }

  async validate(req: Request, login: string, password: string, done: (...args: unknown[]) => void): Promise<void> {
    // Login can be either an email or a username;
    const user: UserEntity | null = await this.usersService.findUser({
      relations: ["authentications"],
      select: {
        id: true,
        authentications: {
          id: true,
          provider: true,
          metadata: true,
        },
      },
      where: [
        {
          email: login,
          authentications: { provider: AuthenticationProvider.LOCAL },
        },
        {
          username: login,
          authentications: { provider: AuthenticationProvider.LOCAL },
        },
      ],
    });
    if (!user || !user.authentications?.length) {
      return done(new UnauthorizedException("Authentication failed. User not found."), false);
    }

    const authenticationMetadata: AuthMetadata = user.authentications[0].metadata;
    if (!authenticationMetadata.local?.isEmailVerified) {
      return done(new UnauthorizedException("Authentication failed. Email is not verified."), false);
    }

    const isPasswordVerified: boolean = await verifyHash(password, authenticationMetadata.local?.password);
    if (!isPasswordVerified) {
      return done(new UnauthorizedException("Authentication failed. Invalid credentials."), false);
    }

    done(null, user);
  }
}
