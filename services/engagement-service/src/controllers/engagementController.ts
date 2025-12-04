import { Request, Response } from 'express';
import Survey from '../models/Survey';
import SurveyResponse from '../models/SurveyResponse';
import Recognition from '../models/Recognition';
import PointsLedger from '../models/PointsLedger';

// Survey functions
export const createSurvey = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const survey = new Survey({ ...req.body, tenantId });
    await survey.save();
    res.status(201).json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create survey', error });
  }
};

export const getSurveys = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { status, type, page = 1, limit = 20 } = req.query;
    const query: Record<string, unknown> = { tenantId };
    if (status) query.status = status;
    if (type) query.type = type;

    const surveys = await Survey.find(query)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);
    const total = await Survey.countDocuments(query);

    res.json({ success: true, data: surveys, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch surveys', error });
  }
};

export const updateSurvey = async (req: Request, res: Response) => {
  try {
    const survey = await Survey.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!survey) return res.status(404).json({ success: false, message: 'Survey not found' });
    res.json({ success: true, data: survey });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update survey', error });
  }
};

// Recognition functions
export const giveRecognition = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const recognition = new Recognition({ ...req.body, tenantId, status: 'published' });
    await recognition.save();
    res.status(201).json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create recognition', error });
  }
};

export const getRecognitions = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, type, page = 1, limit = 20 } = req.query;
    const query: Record<string, unknown> = { tenantId, status: 'published' };
    if (employeeId) query.$or = [{ toEmployeeId: employeeId }, { fromEmployeeId: employeeId }];
    if (type) query.type = type;

    const recognitions = await Recognition.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit);
    const total = await Recognition.countDocuments(query);

    res.json({ success: true, data: recognitions, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch recognitions', error });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, type } = req.body;

    const recognition = await Recognition.findById(id);
    if (!recognition) return res.status(404).json({ success: false, message: 'Recognition not found' });

    const existingIdx = recognition.reactions.findIndex((r: { employeeId: unknown; type: string }) =>
      r.employeeId?.toString() === employeeId && r.type === type
    );
    if (existingIdx >= 0) {
      recognition.reactions.splice(existingIdx, 1);
    } else {
      recognition.reactions.push({ employeeId, type, at: new Date() });
    }
    await recognition.save();

    res.json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add reaction', error });
  }
};

// Points functions
export const getEmployeePoints = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    let ledger = await PointsLedger.findOne({ tenantId, employeeId });
    if (!ledger) {
      ledger = new PointsLedger({ tenantId, employeeId });
      await ledger.save();
    }
    res.json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch points', error });
  }
};

export const redeemPoints = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { points, description } = req.body;

    const ledger = await PointsLedger.findOne({ tenantId, employeeId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });
    if (ledger.balance < points) return res.status(400).json({ success: false, message: 'Insufficient points' });

    ledger.balance -= points;
    ledger.lifetimeRedeemed += points;
    await ledger.save();

    res.json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to redeem points', error });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { period = 'month' } = req.query;

    const startDate = getStartDate(period as string);

    const leaderboard = await Recognition.aggregate([
      { $match: { tenantId, status: 'published', createdAt: { $gte: startDate } } },
      { $group: { _id: '$toEmployeeId', totalPoints: { $sum: { $ifNull: ['$points', 0] } }, count: { $sum: 1 } } },
      { $sort: { totalPoints: -1, count: -1 } },
      { $limit: 50 }
    ]);

    res.json({ success: true, data: leaderboard.map((item, idx) => ({ rank: idx + 1, employeeId: item._id, totalPoints: item.totalPoints, recognitionCount: item.count })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error });
  }
};

// Celebration functions
export const createCelebration = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    // Placeholder - celebrations could use Recognition model with a specific type
    res.status(201).json({ success: true, data: { tenantId, ...req.body, type: 'celebration' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create celebration', error });
  }
};

export const getCelebrations = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    // Return upcoming birthdays, anniversaries etc.
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch celebrations', error });
  }
};

export const addWish = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { employeeId, message } = req.body;
    res.json({ success: true, data: { celebrationId: id, wish: { employeeId, message, at: new Date() } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add wish', error });
  }
};

// Stats
export const getEngagementStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [surveyCount, recognitionCount, avgResponseRate] = await Promise.all([
      Survey.countDocuments({ tenantId }),
      Recognition.countDocuments({ tenantId, status: 'published' }),
      Survey.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, avgRate: { $avg: '$responseRate' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalSurveys: surveyCount,
        totalRecognitions: recognitionCount,
        averageResponseRate: avgResponseRate[0]?.avgRate || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error });
  }
};

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case 'week': return new Date(now.setDate(now.getDate() - 7));
    case 'month': return new Date(now.setMonth(now.getMonth() - 1));
    case 'quarter': return new Date(now.setMonth(now.getMonth() - 3));
    case 'year': return new Date(now.setFullYear(now.getFullYear() - 1));
    default: return new Date(now.setMonth(now.getMonth() - 1));
  }
}
