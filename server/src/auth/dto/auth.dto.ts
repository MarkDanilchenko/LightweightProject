import { createZodDto } from "@anatine/zod-nestjs";
import { signInLocalSchema, signUpLocalSchema } from "../schemas/auth.schema.js";

export class SignInLocalDto extends createZodDto(signInLocalSchema) {}

export class SignUpLocalDto extends createZodDto(signUpLocalSchema) {}
