import { z } from "zod";
import { localSignInSchema, localSignUpSchema, localVerificationEmailSchema } from "@server/auth/schemas/auth.schema";
import UserEntity from "@server/user/user.entity";

type RequestWithUser = Request & { user: UserEntity };

type LocalSignUp = z.infer<typeof localSignUpSchema>;

type LocalSignIn = z.infer<typeof localSignInSchema>;

type LocalVerificationEmail = z.infer<typeof localVerificationEmailSchema>;

export { RequestWithUser, LocalSignIn, LocalSignUp, LocalVerificationEmail };
