import { z } from "zod";
import { localSignInSchema, localSignUpSchema, localVerificationEmailSchema } from "@server/auth/schemas/auth.schema";

type LocalSignUpDto = z.infer<typeof localSignUpSchema>;

type LocalVerificationEmailDto = z.infer<typeof localVerificationEmailSchema>;

type LocalSignInDto = z.infer<typeof localSignInSchema>;

export { LocalSignInDto, LocalSignUpDto, LocalVerificationEmailDto };
