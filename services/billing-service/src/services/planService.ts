import SubscriptionPlan, { ISubscriptionPlan } from '../models/SubscriptionPlan';

/**
 * Service to fetch and cache subscription plan data
 */
class PlanService {
  private plansCache: Map<string, ISubscriptionPlan> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  /**
   * Get plan by code with caching
   */
  async getPlanByCode(planCode: string): Promise<ISubscriptionPlan | null> {
    await this.refreshCacheIfNeeded();

    return this.plansCache.get(planCode) || null;
  }

  /**
   * Get plan limits for a specific plan
   */
  async getPlanLimits(planCode: string): Promise<{
    maxEmployees: number;
    maxAdmins: number;
    maxStorage: number;
    maxApiCalls: number;
  } | null> {
    const plan = await this.getPlanByCode(planCode);
    return plan ? plan.limits : null;
  }

  /**
   * Get all active plans
   */
  async getActivePlans(): Promise<ISubscriptionPlan[]> {
    await this.refreshCacheIfNeeded();

    return Array.from(this.plansCache.values()).filter((plan) => plan.isActive);
  }

  /**
   * Refresh cache if expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();

    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      await this.refreshCache();
    }
  }

  /**
   * Force refresh cache from database
   */
  async refreshCache(): Promise<void> {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true });

      this.plansCache.clear();
      plans.forEach((plan) => {
        this.plansCache.set(plan.planCode, plan);
      });

      this.lastCacheUpdate = Date.now();
      console.log(`[PlanService] Cache refreshed with ${plans.length} plans`);
    } catch (error) {
      console.error('[PlanService] Error refreshing cache:', error);
    }
  }

  /**
   * Clear cache (useful after plan updates)
   */
  clearCache(): void {
    this.plansCache.clear();
    this.lastCacheUpdate = 0;
  }
}

export default new PlanService();
