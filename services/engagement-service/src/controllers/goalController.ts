import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Goal from '../models/Goal';

export const createGoal = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const goal = new Goal({
      ...req.body,
      tenantId,
      keyResults: req.body.keyResults?.map((kr: any) => ({ ...kr, id: kr.id || uuidv4() })) || []
    });
    await goal.save();
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create goal', error });
  }
};

export const getGoals = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, level, status, type, year, quarter, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (level) query.level = level;
    if (status) query.status = status;
    if (type) query.type = type;
    if (year) query['period.year'] = +year;
    if (quarter) query['period.quarter'] = +quarter;

    const goals = await Goal.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit);
    const total = await Goal.countDocuments(query);

    res.json({ success: true, data: goals, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch goals', error });
  }
};

export const getGoal = async (req: Request, res: Response) => {
  try {
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch goal', error });
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const goal = await Goal.findByIdAndUpdate(req.params.goalId, req.body, { new: true });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update goal', error });
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const goal = await Goal.findByIdAndDelete(req.params.goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete goal', error });
  }
};

export const updateKeyResult = async (req: Request, res: Response) => {
  try {
    const { goalId, keyResultId } = req.params;
    const { value, note, updatedBy } = req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const kr = goal.keyResults.find(k => k.id === keyResultId);
    if (!kr) return res.status(404).json({ success: false, message: 'Key result not found' });

    kr.currentValue = value;
    kr.updates.push({ value, note, updatedBy, updatedAt: new Date() });

    const progress = (kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue);
    kr.status = progress >= 1 ? 'completed' : progress >= 0.7 ? 'on_track' : progress >= 0.4 ? 'at_risk' : progress > 0 ? 'behind' : 'not_started';

    const totalWeight = goal.keyResults.reduce((acc, k) => acc + k.weight, 0);
    goal.progress = Math.min(100, Math.round(goal.keyResults.reduce((acc, k) => {
      const krProgress = Math.min(1, (k.currentValue - k.startValue) / (k.targetValue - k.startValue));
      return acc + (krProgress * k.weight / totalWeight) * 100;
    }, 0)));

    if (goal.progress >= 100) goal.status = 'completed';
    await goal.save();

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update key result', error });
  }
};

export const addCheckIn = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const goal = await Goal.findById(goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    goal.checkIns.push({ ...req.body, date: new Date() });
    await goal.save();

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add check-in', error });
  }
};

export const getGoalTree = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { year, quarter } = req.query;

    const query: any = { tenantId, level: 'company' };
    if (year) query['period.year'] = +year;
    if (quarter) query['period.quarter'] = +quarter;

    const companyGoals = await Goal.find(query);

    const buildTree = async (parentIds: string[]): Promise<any[]> => {
      const children = await Goal.find({ parentGoalId: { $in: parentIds } });
      if (children.length === 0) return [];
      const childIds = children.map(c => c._id.toString());
      const grandchildren = await buildTree(childIds);
      return children.map(c => ({
        ...c.toObject(),
        children: grandchildren.filter(gc => gc.parentGoalId?.toString() === c._id.toString())
      }));
    };

    const tree = await Promise.all(companyGoals.map(async cg => ({
      ...cg.toObject(),
      children: await buildTree([cg._id.toString()])
    })));

    res.json({ success: true, data: tree });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch goal tree', error });
  }
};

export const getGoalStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { year, quarter, employeeId } = req.query;

    const query: any = { tenantId };
    if (year) query['period.year'] = +year;
    if (quarter) query['period.quarter'] = +quarter;
    if (employeeId) query.employeeId = employeeId;

    const goals = await Goal.find(query);

    const stats = {
      total: goals.length,
      byStatus: { draft: 0, active: 0, completed: 0, cancelled: 0, deferred: 0 },
      byLevel: { company: 0, department: 0, team: 0, individual: 0 },
      averageProgress: 0,
      completionRate: 0,
      atRiskCount: 0
    };

    goals.forEach(g => {
      stats.byStatus[g.status as keyof typeof stats.byStatus]++;
      stats.byLevel[g.level as keyof typeof stats.byLevel]++;
      stats.averageProgress += g.progress;
      if (g.keyResults.some(kr => kr.status === 'at_risk' || kr.status === 'behind')) stats.atRiskCount++;
    });

    stats.averageProgress = goals.length ? Math.round(stats.averageProgress / goals.length) : 0;
    stats.completionRate = goals.length ? Math.round((stats.byStatus.completed / goals.length) * 100) : 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error });
  }
};

export const alignGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { parentGoalId, alignedGoalIds } = req.body;

    const goal = await Goal.findById(goalId);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    if (parentGoalId !== undefined) goal.parentGoalId = parentGoalId;
    if (alignedGoalIds) goal.alignedGoalIds = alignedGoalIds;
    await goal.save();

    res.json({ success: true, data: goal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to align goal', error });
  }
};
