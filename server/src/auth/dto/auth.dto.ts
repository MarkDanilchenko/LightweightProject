import { createZodDto } from "@anatine/zod-nestjs";
import {
  localVerificationEmailSchema,
  profileSchema,
  localSignInSchema,
  localSignUpSchema,
} from "@server/auth/schemas/auth.schema";

class LocalSignUpDto extends createZodDto(localSignUpSchema) {}

class LocalSignInDto extends createZodDto(localSignInSchema) {}

class ProfileDto extends createZodDto(profileSchema) {}

class LocalVerificationEmailDto extends createZodDto(localVerificationEmailSchema) {}

export { LocalSignUpDto, LocalSignInDto, ProfileDto, LocalVerificationEmailDto };
