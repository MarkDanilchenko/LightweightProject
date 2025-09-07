import * as dotenv from "dotenv";
import * as winston from "winston";
import AppConfiguration from "./interfaces/appConfiguration.interface.js";
import { utilities as nestWinstonModuleUtilities } from "nest-winston";

dotenv.config({ path: "./.env.development" });

export default (): AppConfiguration => {
  const {
    DATABASE_NAME,
    DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_HOST,
    DATABASE_PORT,
    SERVER_HOST,
    SERVER_PORT,
    TYPEORM_LOGGING,
    TYPEORM_MIGRATIONS_RUN,
    SWAGGER_ENABLED,
    HTTPS,
    CERT_PATH,
    KEY_PATH,
    COMMON_SECRET,
    COOKIE_SECRET,
    JWT_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_EXPIRES_IN,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    KC_HOSTNAME,
    KC_PORT,
    KC_REALM_NAME,
    KC_CLIENT_ID,
    KC_CLIENT_SECRET,
    KC_SAML_IDP_CERT,
    KC_SAML_ISSUER,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
  } = process.env;

  const serverConfiguration: AppConfiguration["serverConfiguration"] = {
    host: SERVER_HOST || "127.0.0.1",
    port: Number(SERVER_PORT) || 3000,
    swaggerEnabled: SWAGGER_ENABLED === "true",
    cookieSecret: COOKIE_SECRET!,
    commonSecret: COMMON_SECRET!,
    https: HTTPS === "true",
    protocol: HTTPS === "true" ? "https" : "http",
  };

  const smtpConfiguration: AppConfiguration["smtpConfiguration"] = {
    host: SMTP_HOST!,
    port: Number(SMTP_PORT) || 587,
    username: SMTP_USERNAME!,
    password: SMTP_PASSWORD!,
  };

  const loggerConfiguration: AppConfiguration["loggerConfiguration"] = {
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({
            format: " - MM/DD/YYYY, hh:mm:ss A",
          }),
          nestWinstonModuleUtilities.format.nestLike("Nest", {
            prettyPrint: true,
            colors: true,
            processId: true,
            appName: true,
          }),
        ),
      }),
    ],
  };

  const dbConfiguration: AppConfiguration["dbConfiguration"] = {
    type: "postgres",
    host: DATABASE_HOST || "127.0.0.1",
    port: Number(DATABASE_PORT) || 5432,
    database: DATABASE_NAME,
    username: DATABASE_USER,
    password: DATABASE_PASSWORD,
    logging: TYPEORM_LOGGING === "true",
    migrationsRun: TYPEORM_MIGRATIONS_RUN === "true",
    entities: ["**/*.entity.js"],
    migrations: ["**/migrations/*.js"],
    applicationName: "LightweightProject",
  };

  const jwtConfiguration: AppConfiguration["jwtConfiguration"] = {
    secret: JWT_SECRET!,
    accessTokenExpiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN || "24h",
    refreshTokenExpiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
  };

  const authConfiguration: AppConfiguration["authConfiguration"] = {
    google: {
      clientID: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      callbackURL: `${serverConfiguration.protocol}://${serverConfiguration.host}:${serverConfiguration.port}/api/v1/auth/google/redirect`,
    },
    keycloak: {
      oidc: {
        clientID: KC_CLIENT_ID!,
        clientSecret: KC_CLIENT_SECRET!,
        callbackURL: `${serverConfiguration.protocol}://${serverConfiguration.host}:${serverConfiguration.port}/api/v1/auth/keycloak/oidc/redirect`,
        authUrl: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/protocol/openid-connect/auth`,
        idTokenUrl: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/protocol/openid-connect/token`,
        userInfoUrl: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/protocol/openid-connect/userinfo`,
        discoveryUrl: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/.well-known/openid-configuration`,
      },
      saml: {
        issuer: KC_SAML_ISSUER!,
        idpCert: KC_SAML_IDP_CERT!,
        callbackUrl: `${serverConfiguration.protocol}://${serverConfiguration.host}:${serverConfiguration.port}/api/v1/auth/keycloak/saml/redirect`,
        entryPoint: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/protocol/saml`,
        descriptorUrl: `${serverConfiguration.protocol}://${KC_HOSTNAME}:${KC_PORT}/realms/${KC_REALM_NAME}/protocol/saml/descriptor`,
      },
    },
  };

  return {
    serverConfiguration,
    loggerConfiguration,
    dbConfiguration,
    jwtConfiguration,
    authConfiguration,
    smtpConfiguration,
  };
};
