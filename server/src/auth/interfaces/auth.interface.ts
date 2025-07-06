import { AuthenticationProvider } from "../types/auth.types.js";

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

interface Profile {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  authentications: {
    id: string;
    provider: string;
    lastAccessedAt: Date;
  };
}

interface AuthAccordingToStrategyOptions {
  accessToken?: string;
  refreshToken?: string;
  routeUrl?: string;
}

interface GoogleOAuth2 {
  authorizationParams: {
    access_type: string;
    prompt: string;
  };
  userInfo: {
    userName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

interface AuthCredentials {
  provider: AuthenticationProvider;
  email: string;
  username?: string;
  password?: string;
}

export { JwtPayload, JwtAuthGuardResponse, Profile, GoogleOAuth2, AuthAccordingToStrategyOptions, AuthCredentials };
