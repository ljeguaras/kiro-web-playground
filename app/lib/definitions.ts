import * as z from "zod";

export const SignupFormSchema = z.object({
  username: z
    .string()
    .min(3, { error: "Username must be at least 3 characters long." })
    .max(20, { error: "Username must be at most 20 characters long." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      error: "Username can only contain letters, numbers, and underscores.",
    })
    .trim(),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Password must contain at least one letter." })
    .regex(/[0-9]/, { error: "Password must contain at least one number." })
    .trim(),
});

export const LoginFormSchema = z.object({
  username: z.string().min(1, { error: "Username is required." }).trim(),
  password: z.string().min(1, { error: "Password is required." }).trim(),
});

export type FormState =
  | {
      errors?: {
        username?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type User = {
  id: string;
  username: string;
  password: string;
};

export type SessionPayload = {
  userId: string;
  expiresAt: Date;
};
