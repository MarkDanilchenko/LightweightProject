// interface AuthAccordingToStrategyOptions {
//   accessToken?: string;
//   refreshToken?: string;
//   [key: string]: any;
// }
//

//
// interface JwtAuthGuardResponse {
//   userId: string;
//   username: string;
//   email: string;
//   provider: string;
// }
//
// interface GoogleOAuth2 {
//   authorizationParams: {
//     access_type: string;
//     prompt: string;
//   };
//   userInfo: {
//     userName?: string;
//     firstName?: string;
//     lastName?: string;
//     email: string;
//     avatarUrl?: string;
//   };
// }
//
// interface KeycloakOAuth2OIDC {
//   defaultScope: {
//     sub: string;
//   };
//   emailScope: {
//     email: string;
//     email_verified: boolean;
//   };
//   profileScope: {
//     name: string;
//     preferred_username: string;
//     locale: string;
//     given_name: string;
//     family_name: string;
//     avatarUrl?: string;
//   };
//   userInfo: {
//     firstName?: string;
//     lastName?: string;
//     email: string;
//     avatarUrl?: string;
//   };
// }
//
// interface KeycloakSAML {
//   userName?: string;
//   firstName?: string;
//   lastName?: string;
//   email: string;
//   avatarUrl?: string;
// }
//
// interface AuthCredentials {
//   provider: AuthenticationProvider;
//   email: string;
//   password?: string;
//   // NOTE: "username" is used only in local strategy where users can signIn with either an email or username;
//   username?: string;
// }

interface AuthMetadata {
  local?: {
    isEmailVerified: boolean;
    password: string;
    callbackUrl?: string;
    temporaryInfo?: {
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      avatarUrl?: string | null;
    };
  };
  google?: Record<string, any>;
  keycloak?: Record<string, any>;
  github?: Record<string, any>;
}

enum AuthenticationProvider {
  LOCAL = "local",
  GOOGLE = "google",
  KEYCLOAK = "keycloak",
  GITHUB = "github",
}

export {
  AuthenticationProvider,
  AuthMetadata,
  // JwtAuthGuardResponse,
  // GoogleOAuth2,
  // KeycloakOAuth2OIDC,
  // AuthAccordingToStrategyOptions,
  // AuthCredentials,
  // KeycloakSAML,
};
