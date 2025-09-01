import { z } from "zod";
import UserEntity from "@server/user/user.entity";
import { JwtAuthGuardResponse } from "@server/auth/interfaces/auth.interface.js";
import { profileSchema, signInLocalSchema, signUpLocalSchema } from "../schemas/auth.schema.js";

type SignInLocal = z.infer<typeof signInLocalSchema>;

type SignUpLocal = z.infer<typeof signUpLocalSchema>;

type Profile = z.infer<typeof profileSchema>;

type AuthenticationProvider = "google" | "keycloak" | "local" | "github";

type requestWithUser = Request & { user: UserEntity & JwtAuthGuardResponse };

export { AuthenticationProvider, requestWithUser, SignInLocal, SignUpLocal, Profile };
