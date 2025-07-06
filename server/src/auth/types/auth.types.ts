import UserEntity from "@server/user/user.entity";
import { JwtAuthGuardResponse } from "@server/auth/interfaces/auth.interface.js";
import { z } from "zod";
import { signInLocalSchema, signUpLocalSchema } from "../schemas/auth.schema.js";

type SignInLocal = z.infer<typeof signInLocalSchema>;

type SignUpLocal = z.infer<typeof signUpLocalSchema>;

type AuthenticationProvider = "google" | "local";

type requestWithUser = Request & { user: UserEntity & JwtAuthGuardResponse };

export { AuthenticationProvider, requestWithUser, SignInLocal, SignUpLocal };
