import { z } from "zod";

export const requestRecoverySchema = z.object({ email: z.string().trim().email("Invalid email address").max(254) });
export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
  confirmPassword: z.string(),
}).refine((input) => input.password === input.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
