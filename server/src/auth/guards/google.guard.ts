import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export default class GoogleOAuth2Guard extends AuthGuard("googleOAuth2") {}
