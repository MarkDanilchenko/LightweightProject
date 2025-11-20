import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

interface TokenPayload {
  jwti?: string;
  userId: string;
  provider: AuthenticationProvider;
  iat?: number;
  ext?: number;
}

export { TokenPayload };
