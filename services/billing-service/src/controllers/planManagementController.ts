import { Request, Response } from 'express';
import SubscriptionPlan from '../models/SubscriptionPlan';

/**
 * Get all subscription plans (Super Admin)
 */
export const getAllPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const { includeInactive } = req.query;

    const query = includeInactive === 'true' ? {} : { isActive: true };

    const plans = await SubscriptionPlan.find(query).sort({ sortOrder: 1 });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('[PlanManagement] Get all plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
    });
  }
};

/**
 * Get visible plans for pricing page (Public)
 */
export const getPublicPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find({
      isActive: true,
      isVisible: true,
    }).sort({ sortOrder: 1 });

    // Format for public display
    const publicPlans = plans.map((plan) => ({
      planCode: plan.planCode,
      displayName: plan.displayName,
      description: plan.description,
      pricing: {
        monthly: plan.pricing.monthly / 100, // Convert paise to rupees
        yearly: plan.pricing.yearly / 100,
        yearlyPerMonth: Math.round(plan.pricing.yearly / 12) / 100,
        currency: plan.pricing.currency,
      },
      limits: plan.limits,
      features: plan.features,
    }));

    res.json({
      success: true,
      data: publicPlans,
    });
  } catch (error) {
    console.error('[PlanManagement] Get public plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pricing plans',
    });
  }
};

/**
 * Get plan by code
 */
export const getPlanByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planCode } = req.params;

    const plan = await SubscriptionPlan.findOne({ planCode });

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('[PlanManagement] Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plan',
    });
  }
};

/**
 * Create new plan (Super Admin)
 */
export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      planCode,
      displayName,
      description,
      pricing,
      limits,
      features,
      isActive,
      isVisible,
      sortOrder,
      metadata,
    } = req.body;

    // Check if plan code already exists
    const existingPlan = await SubscriptionPlan.findOne({ planCode });
    if (existingPlan) {
      res.status(400).json({
        success: false,
        message: 'Plan with this code already exists',
      });
      return;
    }

    const plan = new SubscriptionPlan({
      planCode,
      displayName,
      description,
      pricing,
      limits,
      features,
      isActive,
      isVisible,
      sortOrder,
      metadata,
    });

    await plan.save();

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Subscription plan created successfully',
    });
  } catch (error) {
    console.error('[PlanManagement] Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription plan',
    });
  }
};

/**
 * Update plan (Super Admin)
 */
export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planCode } = req.params;
    const updates = req.body;

    // Don't allow planCode to be changed
    delete updates.planCode;

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planCode },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Subscription plan updated successfully',
    });
  } catch (error) {
    console.error('[PlanManagement] Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
    });
  }
};

/**
 * Delete/deactivate plan (Super Admin)
 */
export const deletePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planCode } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanently delete (dangerous)
      const plan = await SubscriptionPlan.findOneAndDelete({ planCode });

      if (!plan) {
        res.status(404).json({
          success: false,
          message: 'Subscription plan not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Subscription plan permanently deleted',
      });
    } else {
      // Soft delete (just deactivate)
      const plan = await SubscriptionPlan.findOneAndUpdate(
        { planCode },
        { $set: { isActive: false, isVisible: false } },
        { new: true }
      );

      if (!plan) {
        res.status(404).json({
          success: false,
          message: 'Subscription plan not found',
        });
        return;
      }

      res.json({
        success: true,
        data: plan,
        message: 'Subscription plan deactivated',
      });
    }
  } catch (error) {
    console.error('[PlanManagement] Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subscription plan',
    });
  }
};

/**
 * Update plan limits only (Super Admin)
 */
export const updatePlanLimits = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planCode } = req.params;
    const { limits } = req.body;

    if (!limits) {
      res.status(400).json({
        success: false,
        message: 'Limits object is required',
      });
      return;
    }

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planCode },
      { $set: { limits } },
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Plan limits updated successfully',
    });
  } catch (error) {
    console.error('[PlanManagement] Update limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan limits',
    });
  }
};

/**
 * Update plan features only (Super Admin)
 */
export const updatePlanFeatures = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planCode } = req.params;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      res.status(400).json({
        success: false,
        message: 'Features must be an array',
      });
      return;
    }

    const plan = await SubscriptionPlan.findOneAndUpdate(
      { planCode },
      { $set: { features } },
      { new: true, runValidators: true }
    );

    if (!plan) {
      res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
      return;
    }

    res.json({
      success: true,
      data: plan,
      message: 'Plan features updated successfully',
    });
  } catch (error) {
    console.error('[PlanManagement] Update features error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update plan features',
    });
  }
};
