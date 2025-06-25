interface JwtPayload {
  userId: string;
  provider: string;
}

interface UserInfoAfterJwtAuthGuard {
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

interface idPTokens {
  accessToken: string;
  refreshToken?: string;
}

interface GoogleOAuth20 {
  authorizationParams: {
    access_type: string;
    prompt: string;
  };
  userProfile: {
    userName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    avatarUrl?: string;
  };
}

export { JwtPayload, UserInfoAfterJwtAuthGuard, Profile, GoogleOAuth20, idPTokens };
