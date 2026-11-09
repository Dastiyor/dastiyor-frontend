/**
 * Provider plans: FREE, PRO, PRO+ and BUSINESS. Single source of truth for
 * prices, limits and the feature lists the plan pages show.
 *
 * No server imports here: client components read it too.
 */
import type { SubscriptionTier } from '@dastiyor/types';

export type PlanId = SubscriptionTier;

export interface Plan {
    /** Shown as is in every language. */
    name: string;
    /** Profile badge text. */
    badge: string;
    /** TJS for 30 days. */
    price: number;
    durationDays: number;
    /** null = unlimited */
    responsesPerMonth: number | null;
    /** 24-hour profile promotions per period; unused ones do not carry over. */
    promotionsPerMonth: number;
    /** Higher ranks list first among providers. */
    rank: number;
}

export const PLANS: Record<PlanId, Plan> = {
    pro: { name: 'PRO', badge: 'PRO', price: 49, durationDays: 30, responsesPerMonth: 30, promotionsPerMonth: 1, rank: 1 },
    pro_plus: { name: 'PRO+', badge: 'PRO+', price: 99, durationDays: 30, responsesPerMonth: null, promotionsPerMonth: 2, rank: 2 },
    business: { name: 'BUSINESS', badge: 'TOP', price: 199, durationDays: 30, responsesPerMonth: null, promotionsPerMonth: 5, rank: 3 },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export const FREE_RESPONSES_PER_MONTH = 5;

export type PlanTier = 'free' | PlanId;
export const TIER_ORDER: PlanTier[] = ['free', ...PLAN_IDS];

/** i18n keys under plans.f.* for each tier, in the order the plan list gives them. */
export const PLAN_FEATURES: Record<PlanTier, string[]> = {
    free: [
        'createProfile', 'photoAndDescription', 'categoriesAndAreas', 'browseTasks', 'searchFilters',
        'responses5', 'messages', 'reviews', 'visibilityStandard', 'statsBasic',
    ],
    pro: [
        'everythingFree', 'responses30', 'visibilityAboveFree', 'taskAlerts', 'promotions1',
        'badgePro', 'supportStandard',
    ],
    pro_plus: [
        'everythingPro', 'responsesUnlimited', 'visibilityAbovePro', 'analyticsExtended', 'promotions2',
        'highlightDirectory', 'taskAlertsPriority', 'supportPriority',
    ],
    business: [
        'everythingProPlus', 'responsesUnlimited', 'visibilityMax', 'analyticsAdvanced', 'promotions5',
        'highlightSearch', 'recommendedPlacement', 'pinCategory', 'responseStats', 'supportPersonal',
    ],
};

/** i18n keys under plans.rules.* */
export const PLAN_RULES = ['duration', 'autoRenew', 'customersFree', 'promotionsExpire', 'afterPayment', 'backToFree'];

/**
 * Plans before November 2026 were basic/standard/premium. Rows or store
 * entitlements that still carry those ids read as the nearest new plan.
 */
const LEGACY: Record<string, PlanId> = { basic: 'pro', standard: 'pro_plus', premium: 'business' };

/** A stored plan id as a current one, or null for anything unknown. */
export function normalizePlan(plan: string | null | undefined): PlanId | null {
    if (!plan) return null;
    if (plan in PLANS) return plan as PlanId;
    return LEGACY[plan] ?? null;
}

/** Only current ids can be bought. */
export function isValidPlan(plan: unknown): plan is PlanId {
    return typeof plan === 'string' && plan in PLANS;
}
