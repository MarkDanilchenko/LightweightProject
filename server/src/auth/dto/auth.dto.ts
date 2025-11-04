import { createZodDto } from "@anatine/zod-nestjs";
import {
  localVerificationEmailSchema,
  profileSchema,
  localSignInSchema,
  localSignUpSchema,
} from "@server/auth/schemas/auth.schema";

class LocalSignUpDtoClass extends createZodDto(localSignUpSchema) {}

class LocalVerificationEmailDtoClass extends createZodDto(localVerificationEmailSchema) {}

class LocalSignInDtoClass extends createZodDto(localSignInSchema) {}

class ProfileDtoClass extends createZodDto(profileSchema) {}

export { LocalSignUpDtoClass, LocalSignInDtoClass, ProfileDtoClass, LocalVerificationEmailDtoClass };
