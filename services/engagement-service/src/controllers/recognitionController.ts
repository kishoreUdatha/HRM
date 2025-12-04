import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Recognition from '../models/Recognition';
import PointsLedger from '../models/PointsLedger';

const LEVELS = [
  { level: 1, name: 'Newcomer', minPoints: 0 },
  { level: 2, name: 'Contributor', minPoints: 100 },
  { level: 3, name: 'Achiever', minPoints: 500 },
  { level: 4, name: 'Star', minPoints: 1500 },
  { level: 5, name: 'Champion', minPoints: 4000 },
  { level: 6, name: 'Legend', minPoints: 10000 }
];

export const createRecognition = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const recognition = new Recognition({ ...req.body, tenantId });
    await recognition.save();

    if (recognition.points && recognition.points > 0 && recognition.status === 'published') {
      await addPoints(tenantId, recognition.toEmployeeId, recognition.points, 'recognition', recognition._id.toString(), recognition.title);
    }

    res.status(201).json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create recognition', error });
  }
};

export const getRecognitions = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, type, visibility, featured, page = 1, limit = 20 } = req.query;
    const query: any = { tenantId, status: 'published' };
    if (employeeId) query.$or = [{ toEmployeeId: employeeId }, { fromEmployeeId: employeeId }];
    if (type) query.type = type;
    if (visibility) query.visibility = visibility;
    if (featured === 'true') query.featured = true;

    const recognitions = await Recognition.find(query).sort({ createdAt: -1 }).skip((+page - 1) * +limit).limit(+limit);
    const total = await Recognition.countDocuments(query);

    res.json({ success: true, data: recognitions, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch recognitions', error });
  }
};

export const getRecognitionsFeed = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const recognitions = await Recognition.find({ tenantId, status: 'published', visibility: 'public' })
      .sort({ featured: -1, createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.json({ success: true, data: recognitions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch feed', error });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { recognitionId } = req.params;
    const { employeeId, type } = req.body;

    const recognition = await Recognition.findById(recognitionId);
    if (!recognition) return res.status(404).json({ success: false, message: 'Recognition not found' });

    const existingIdx = recognition.reactions.findIndex(r => r.employeeId === employeeId && r.type === type);
    if (existingIdx >= 0) {
      recognition.reactions.splice(existingIdx, 1);
    } else {
      recognition.reactions.push({ employeeId, type, createdAt: new Date() });
    }
    await recognition.save();

    res.json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add reaction', error });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { recognitionId } = req.params;
    const { employeeId, text } = req.body;

    const recognition = await Recognition.findById(recognitionId);
    if (!recognition) return res.status(404).json({ success: false, message: 'Recognition not found' });

    recognition.comments.push({ employeeId, text, createdAt: new Date() });
    await recognition.save();

    res.json({ success: true, data: recognition });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add comment', error });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { period = 'month', type = 'received' } = req.query;

    const startDate = getStartDate(period as string);
    const matchField = type === 'received' ? 'toEmployeeId' : 'fromEmployeeId';

    const leaderboard = await Recognition.aggregate([
      { $match: { tenantId, status: 'published', createdAt: { $gte: startDate } } },
      { $group: { _id: `$${matchField}`, totalPoints: { $sum: { $ifNull: ['$points', 0] } }, count: { $sum: 1 } } },
      { $sort: { totalPoints: -1, count: -1 } },
      { $limit: 50 }
    ]);

    res.json({ success: true, data: leaderboard.map((item, idx) => ({ rank: idx + 1, employeeId: item._id, totalPoints: item.totalPoints, recognitionCount: item.count })) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error });
  }
};

export const getPointsLedger = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    let ledger = await PointsLedger.findOne({ tenantId, employeeId });
    if (!ledger) {
      ledger = new PointsLedger({ tenantId, employeeId });
      await ledger.save();
    }
    res.json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch points ledger', error });
  }
};

export const redeemPoints = async (req: Request, res: Response) => {
  try {
    const { tenantId, employeeId } = req.params;
    const { points, description, rewardId } = req.body;

    const ledger = await PointsLedger.findOne({ tenantId, employeeId });
    if (!ledger) return res.status(404).json({ success: false, message: 'Ledger not found' });
    if (ledger.balance < points) return res.status(400).json({ success: false, message: 'Insufficient points' });

    ledger.balance -= points;
    ledger.lifetimeRedeemed += points;
    ledger.transactions.push({
      id: uuidv4(),
      type: 'redeemed',
      amount: -points,
      balance: ledger.balance,
      source: 'redemption',
      referenceId: rewardId,
      description,
      createdAt: new Date()
    });
    await ledger.save();

    res.json({ success: true, data: ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to redeem points', error });
  }
};

async function addPoints(tenantId: string, employeeId: string, points: number, source: string, refId: string, description: string) {
  let ledger = await PointsLedger.findOne({ tenantId, employeeId });
  if (!ledger) ledger = new PointsLedger({ tenantId, employeeId });

  ledger.balance += points;
  ledger.lifetimeEarned += points;
  ledger.transactions.push({
    id: uuidv4(),
    type: 'earned',
    amount: points,
    balance: ledger.balance,
    source: source as any,
    referenceId: refId,
    description,
    createdAt: new Date()
  });

  const newLevel = LEVELS.slice().reverse().find(l => ledger!.lifetimeEarned >= l.minPoints);
  if (newLevel && newLevel.level > ledger.level.current) {
    ledger.level.current = newLevel.level;
    ledger.level.name = newLevel.name;
  }
  const nextLevel = LEVELS.find(l => l.level === ledger!.level.current + 1);
  ledger.level.pointsToNextLevel = nextLevel ? nextLevel.minPoints - ledger.lifetimeEarned : 0;
  ledger.level.totalPointsForLevel = nextLevel?.minPoints || ledger.lifetimeEarned;

  await ledger.save();
}

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
