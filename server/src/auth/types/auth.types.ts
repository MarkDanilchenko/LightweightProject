import { z } from "zod";
import { localSignInSchema, localSignUpSchema, localVerificationEmailSchema } from "@server/auth/schemas/auth.schema";
import UserEntity from "@server/user/user.entity";

type RequestWithUser = Request & { user: UserEntity };

type LocalSignUpDto = z.infer<typeof localSignUpSchema>;

type LocalVerificationEmailDto = z.infer<typeof localVerificationEmailSchema>;

type LocalSignInDto = z.infer<typeof localSignInSchema>;

export { RequestWithUser, LocalSignInDto, LocalSignUpDto, LocalVerificationEmailDto };
