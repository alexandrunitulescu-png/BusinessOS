import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Email invalid"),
  password: z.string().min(1, "Parola este obligatorie"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Numele este obligatoriu"),
  email: z.string().trim().email("Email invalid"),
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere"),
});
