import type { Metadata } from "next";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = { title: "Creează cont · BusinessPuls" };

export default function SignupPage() {
  return <SignupForm />;
}
