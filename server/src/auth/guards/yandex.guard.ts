import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export default class YandexOAuth2Guard extends AuthGuard("yandexOAuth2") {}
