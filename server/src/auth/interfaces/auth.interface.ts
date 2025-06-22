interface JwtPayload {
  userId: string;
  provider: string;
}

interface UserInfoByJwtAuthGuard {
  id: string;
  username: string;
  email: string;
  idp: string;
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

export { JwtPayload, UserInfoByJwtAuthGuard, Profile };
