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
//   username?: string;
//   firstName?: string;
//   lastName?: string;
//   email: string;
//   avatarUrl?: string;
// }

enum AuthenticationProvider {
  LOCAL = "local",
  GOOGLE = "google",
  KEYCLOAK = "keycloak",
  GITHUB = "github",
  YANDEX = "yandex",
}

interface AuthenticationInstanceMetadata {
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
  yandex?: Record<string, any>;
}

interface AuthenticationViaIdP {
  userClaims: {
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

export { AuthenticationProvider, AuthenticationInstanceMetadata, AuthenticationViaIdP };
