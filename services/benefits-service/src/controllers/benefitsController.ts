import { Request, Response } from 'express';
import BenefitPlan from '../models/BenefitPlan';
import BenefitEnrollment from '../models/BenefitEnrollment';
import CompensationPlan from '../models/CompensationPlan';
import WellnessProgram from '../models/WellnessProgram';
import mongoose from 'mongoose';

// Benefit Plan Controllers
export const createBenefitPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const plan = new BenefitPlan({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });
    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBenefitPlans = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, isActive, type } = req.query;

    const query: any = { tenantId };
    if (category) query.category = category;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const plans = await BenefitPlan.find(query).sort({ category: 1, name: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBenefitPlanById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await BenefitPlan.findOne({ _id: id, tenantId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBenefitPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const plan = await BenefitPlan.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBenefitPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;

    // Check if there are active enrollments
    const activeEnrollments = await BenefitEnrollment.countDocuments({
      tenantId,
      benefitPlanId: id,
      status: 'active',
    });

    if (activeEnrollments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active enrollments',
      });
    }

    await BenefitPlan.findOneAndDelete({ _id: id, tenantId });
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enrollment Controllers
export const enrollInBenefit = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, benefitPlanId, tierId, enrollmentReason, effectiveDate, dependents, beneficiaries } = req.body;

    // Check for existing active enrollment
    const existingEnrollment = await BenefitEnrollment.findOne({
      tenantId,
      employeeId,
      benefitPlanId,
      status: 'active',
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Employee already enrolled in this plan',
      });
    }

    // Get plan details
    const plan = await BenefitPlan.findOne({ _id: benefitPlanId, tenantId });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const tier = plan.tiers.find(t => t.name === tierId);
    if (!tier) {
      return res.status(400).json({ success: false, message: 'Invalid tier' });
    }

    const enrollment = new BenefitEnrollment({
      tenantId,
      employeeId,
      benefitPlanId,
      tierId,
      tierName: tier.name,
      enrollmentReason,
      effectiveDate: effectiveDate || new Date(),
      employeeCost: tier.employeeCost,
      employerCost: tier.employerCost,
      paymentFrequency: tier.frequency,
      dependents,
      beneficiaries,
      status: 'pending_approval',
    });

    await enrollment.save();
    res.status(201).json({ success: true, data: enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEnrollments = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, benefitPlanId, status, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (benefitPlanId) query.benefitPlanId = benefitPlanId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [enrollments, total] = await Promise.all([
      BenefitEnrollment.find(query)
        .populate('employeeId', 'firstName lastName email')
        .populate('benefitPlanId', 'name category type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      BenefitEnrollment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: enrollments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeEnrollments = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;

    const enrollments = await BenefitEnrollment.find({
      tenantId,
      employeeId,
      status: { $in: ['active', 'pending', 'pending_approval'] },
    }).populate('benefitPlanId');

    res.json({ success: true, data: enrollments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveEnrollment = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy } = req.body;

    const enrollment = await BenefitEnrollment.findOneAndUpdate(
      { _id: id, tenantId, status: 'pending_approval' },
      {
        status: 'active',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found or not pending' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const terminateEnrollment = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { terminationDate, reason } = req.body;

    const enrollment = await BenefitEnrollment.findOneAndUpdate(
      { _id: id, tenantId, status: 'active' },
      {
        status: 'terminated',
        terminationDate: terminationDate || new Date(),
        notes: reason,
      },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEnrollmentDependents = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { dependents } = req.body;

    const enrollment = await BenefitEnrollment.findOneAndUpdate(
      { _id: id, tenantId },
      { dependents },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: enrollment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compensation Plan Controllers
export const createCompensationPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Mark any existing active plan as superseded
    await CompensationPlan.updateMany(
      { tenantId, employeeId: req.body.employeeId, status: 'active' },
      { status: 'superseded', endDate: req.body.effectiveDate }
    );

    const plan = new CompensationPlan({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });

    await plan.save();
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompensationPlans = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const plans = await CompensationPlan.find(query)
      .populate('employeeId', 'firstName lastName email')
      .sort({ effectiveDate: -1 });

    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveCompensationPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;

    const plan = await CompensationPlan.findOne({
      tenantId,
      employeeId,
      status: 'active',
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: 'No active compensation plan found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveCompensationPlan = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy } = req.body;

    const plan = await CompensationPlan.findOneAndUpdate(
      { _id: id, tenantId, status: 'draft' },
      {
        status: 'active',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Wellness Program Controllers
export const createWellnessProgram = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const program = new WellnessProgram({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });
    await program.save();
    res.status(201).json({ success: true, data: program });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWellnessPrograms = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { category, isActive } = req.query;

    const query: any = { tenantId };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const programs = await WellnessProgram.find(query).sort({ startDate: -1 });
    res.json({ success: true, data: programs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateWellnessProgram = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const program = await WellnessProgram.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }
    res.json({ success: true, data: program });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Benefits Summary
export const getBenefitsSummary = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;

    const [enrollments, compensationPlan] = await Promise.all([
      BenefitEnrollment.find({
        tenantId,
        employeeId,
        status: 'active',
      }).populate('benefitPlanId'),
      CompensationPlan.findOne({
        tenantId,
        employeeId,
        status: 'active',
      }),
    ]);

    const totalEmployeeCost = enrollments.reduce((sum, e) => sum + e.employeeCost, 0);
    const totalEmployerCost = enrollments.reduce((sum, e) => sum + e.employerCost, 0);

    res.json({
      success: true,
      data: {
        enrollments,
        compensationPlan,
        summary: {
          totalBenefits: enrollments.length,
          totalEmployeeCost,
          totalEmployerCost,
          totalValue: totalEmployeeCost + totalEmployerCost,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Benefits Stats
export const getBenefitsStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const enrollmentsByCategory = await BenefitEnrollment.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: 'active',
        },
      },
      {
        $lookup: {
          from: 'benefitplans',
          localField: 'benefitPlanId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
      {
        $group: {
          _id: '$plan.category',
          count: { $sum: 1 },
          totalEmployeeCost: { $sum: '$employeeCost' },
          totalEmployerCost: { $sum: '$employerCost' },
        },
      },
    ]);

    const totalActivePlans = await BenefitPlan.countDocuments({
      tenantId,
      isActive: true,
    });

    const totalActiveEnrollments = await BenefitEnrollment.countDocuments({
      tenantId,
      status: 'active',
    });

    const pendingApprovals = await BenefitEnrollment.countDocuments({
      tenantId,
      status: 'pending_approval',
    });

    res.json({
      success: true,
      data: {
        totalActivePlans,
        totalActiveEnrollments,
        pendingApprovals,
        enrollmentsByCategory,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
