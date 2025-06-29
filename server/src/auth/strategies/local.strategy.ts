// import { Injectable, UnauthorizedException } from "@nestjs/common";
// import { PassportStrategy } from "@nestjs/passport";
// import { Strategy } from "passport-local";
// import AuthService from "../auth.service.js";
// import UserEntity from "@server/user/user.entity";

// @Injectable()
// export default class LocalStrategy extends PassportStrategy(Strategy, "local") {
//   constructor(private readonly authService: AuthService) {
//     super({
//       usernameField: "login",
//       passwordField: "password",
//     });
//   }

//   async validate(login: string, password: string): Promise<UserEntity> {
//     if (!login || !password) {
//       throw new UnauthorizedException("Authentication failed. Login and password are required.");
//     }
//   }
// }
