import { AtLeastOne } from "@server/common/types/common.types.js";
import UserEntity from "@server/user/user.entity";
import { JwtAuthGuardResponse } from "@server/auth/interfaces/auth.interface.js";

type AuthenticationProvider = "google" | "local";

type signInCredentialsCore = {
  provider: string;
  password?: string;
};

type signInCredentials = signInCredentialsCore & AtLeastOne<{ username: string; email: string }>;

type requestWithUser = Request & { user: UserEntity & JwtAuthGuardResponse };

export { AuthenticationProvider, signInCredentials, requestWithUser };
