import { AuthenticationProvider } from "../types/auth.types.js";

interface AuthAccordingToStrategyOptions {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: any;
}

interface JwtPayload {
  jwti: string;
  userId: string;
  provider: string;
}

interface JwtAuthGuardResponse {
  userId: string;
  username: string;
  email: string;
  provider: string;
}

interface GoogleOAuth2 {
  authorizationParams: {
    access_type: string;
    prompt: string;
  };
  userInfo: {
    userName?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

interface KeycloakOAuth2OIDC {
  defaultScope: {
    sub: string;
  };
  emailScope: {
    email: string;
    email_verified: boolean;
  };
  profileScope: {
    name: string;
    preferred_username: string;
    locale: string;
    given_name: string;
    family_name: string;
    avatarUrl?: string;
  };
  userInfo: {
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

interface KeycloakSAML {
  userName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatarUrl?: string;
}

interface AuthCredentials {
  provider: AuthenticationProvider;
  email: string;
  password?: string;
  // NOTE: "username" is used only in local strategy where user can signIn with either an email or username;
  username?: string;
}

interface AuthMetadata {
  local?: {
    isEmailVerified: boolean;
    password: string;
    verificationCode?: string;
    verificationSendAt?: Date;
    verificationExpireAt?: Date;
    verificationAcceptedAt?: Date;
    verificationLink?: string;
  };
  google?: Record<string, any>;
  keycloak?: Record<string, any>;
  github?: Record<string, any>;
}

export {
  AuthMetadata,
  JwtPayload,
  JwtAuthGuardResponse,
  GoogleOAuth2,
  KeycloakOAuth2OIDC,
  AuthAccordingToStrategyOptions,
  AuthCredentials,
  KeycloakSAML,
};
