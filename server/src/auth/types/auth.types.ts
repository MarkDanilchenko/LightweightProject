import { AtLeastOne } from "@server/common/types/common.types.js";

type AuthenticationProvider = "google" | "local";

type signInCredentialsCore = {
  provider: string;
  password?: string;
};

type signInCredentials = signInCredentialsCore & AtLeastOne<{ username: string; email: string }>;

export { AuthenticationProvider, signInCredentials };
