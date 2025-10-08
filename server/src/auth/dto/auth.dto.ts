import { createZodDto } from "@anatine/zod-nestjs";
import { profileSchema, signInLocalSchema, signUpLocalSchema } from "@server/auth/schemas/auth.schema";

class SignUpLocalDto extends createZodDto(signUpLocalSchema) {}

class SignInLocalDto extends createZodDto(signInLocalSchema) {}

class ProfileDto extends createZodDto(profileSchema) {}

export { SignUpLocalDto, SignInLocalDto, ProfileDto };
