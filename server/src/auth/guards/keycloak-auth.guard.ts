import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class KeycloakAuthGuard extends AuthGuard("keycloakOAuth2OIDC") {}

@Injectable()
export class KeycloakSAMLAuthGuard extends AuthGuard("keycloakSAML") {}
