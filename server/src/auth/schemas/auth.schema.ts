import { z } from "zod";

export const signInLocalSchema = z.object({
  login: z.string(),
  password: z.string(),
});

export const signUpLocalSchema = z.object({
  username: z.string().min(3).max(64),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/),
});
