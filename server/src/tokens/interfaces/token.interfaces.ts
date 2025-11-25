import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";

interface TokenPayload {
  jwti?: string;
  userId: string;
  provider: AuthenticationProvider;
  iat?: number;
  exp?: number; // Unix timestamp in seconds;
}

export { TokenPayload };
