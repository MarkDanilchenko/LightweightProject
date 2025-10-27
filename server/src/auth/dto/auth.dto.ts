import { createZodDto } from "@anatine/zod-nestjs";
import {
  localVerificationEmailSchema,
  profileSchema,
  signInLocalSchema,
  signUpLocalSchema,
} from "@server/auth/schemas/auth.schema";

class SignUpLocalDto extends createZodDto(signUpLocalSchema) {}

class SignInLocalDto extends createZodDto(signInLocalSchema) {}

class ProfileDto extends createZodDto(profileSchema) {}

class LocalVerificationEmailDto extends createZodDto(localVerificationEmailSchema) {}

export { SignUpLocalDto, SignInLocalDto, ProfileDto, LocalVerificationEmailDto };
