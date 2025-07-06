import { createZodDto } from "@anatine/zod-nestjs";
import { profileSchema, signInLocalSchema, signUpLocalSchema } from "../schemas/auth.schema.js";

export class SignInLocalDto extends createZodDto(signInLocalSchema) {}

export class SignUpLocalDto extends createZodDto(signUpLocalSchema) {}

export class ProfileDto extends createZodDto(profileSchema) {}
