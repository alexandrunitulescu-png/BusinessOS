import type { AnyPlanCode, FeatureKey, PlanLimits } from "@/lib/billing/constants";

export type PlanInfo = {
  /** May be INTERNAL for a comped org; the public catalog (listPlans) never is. */
  code: AnyPlanCode;
  name: string;
  price: number | null;
  currency: string;
  limits: PlanLimits;
  features: Record<FeatureKey, boolean>;
};

export type SubscriptionInfo = {
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

export type Entitlements = {
  plan: PlanInfo;
  subscription: SubscriptionInfo;
  /** Plan defaults merged with per-org feature_flags overrides. */
  features: Record<FeatureKey, boolean>;
};

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  /** null = unlimited */
  limit: number | null;
  remaining: number | null;
};
