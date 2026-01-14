import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export default class JwtGuard extends AuthGuard("jwtStrategy") {
  /**
   * This method is overridden from the AuthGuard class and is used to
   * specify the property of the request object that should be used to
   * retrieve the authentication payload.
   *
   * In this case, the property is set to "tokenPayload" which means
   * that the authentication payload will be retrieved from the
   * "tokenPayload" property of the request object.
   */
  constructor() {
    super({ property: "tokenPayload" });
  }
}
