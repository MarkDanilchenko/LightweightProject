import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { WinstonModuleOptions } from "nest-winston";
import { RmqOptions } from "@nestjs/microservices";

export default interface AppConfiguration {
  serverConfiguration: {
    host: string;
    port: number;
    cookieSecret: string;
    swaggerEnabled: boolean;
    commonSecret: string;
    https: boolean;
    protocol: "http" | "https";
  };
  smtpConfiguration: {
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
  };
  loggerConfiguration: WinstonModuleOptions;
  dbConfiguration: TypeOrmModuleOptions;
  jwtConfiguration: {
    secret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  authConfiguration: {
    google: {
      clientID: string;
      clientSecret: string;
      callbackURL: string;
    };
    keycloak: {
      oidc: {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
        authUrl: string;
        idTokenUrl: string;
        userInfoUrl: string;
        discoveryUrl: string;
      };
      saml: {
        issuer: string;
        idpCert: string;
        callbackUrl: string;
        entryPoint: string;
        descriptorUrl: string;
      };
    };
  };
  rabbitmqConfiguration: RmqOptions;
}
