import PayrollAudit, { IPayrollAudit } from '../models/PayrollAudit';

interface AuditLogParams {
  tenantId: string;
  entityType: IPayrollAudit['entityType'];
  entityId: string;
  action: IPayrollAudit['action'];
  performedBy: string;
  performedByName?: string;
  performedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: IPayrollAudit['metadata'];
  sessionId?: string;
  requestId?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<IPayrollAudit> {
  const changes = calculateChanges(params.previousState, params.newState);

  const audit = new PayrollAudit({
    ...params,
    changes,
    performedAt: new Date()
  });

  await audit.save();
  return audit;
}

function calculateChanges(
  previousState?: Record<string, any>,
  newState?: Record<string, any>
): Array<{ field: string; previousValue: any; newValue: any }> {
  if (!previousState || !newState) return [];

  const changes: Array<{ field: string; previousValue: any; newValue: any }> = [];
  const sensitiveFields = ['password', 'token', 'secret', 'key'];

  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(newState)]);

  for (const key of allKeys) {
    if (sensitiveFields.some(sf => key.toLowerCase().includes(sf))) continue;
    if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') continue;

    const prevVal = previousState[key];
    const newVal = newState[key];

    if (JSON.stringify(prevVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        previousValue: prevVal,
        newValue: newVal
      });
    }
  }

  return changes;
}

export async function getAuditLogs(
  tenantId: string,
  filters: {
    entityType?: IPayrollAudit['entityType'];
    entityId?: string;
    action?: IPayrollAudit['action'];
    performedBy?: string;
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
  },
  pagination: { page: number; limit: number }
): Promise<{ logs: IPayrollAudit[]; total: number }> {
  const query: any = { tenantId };

  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.action) query.action = filters.action;
  if (filters.performedBy) query.performedBy = filters.performedBy;
  if (filters.employeeId) query['metadata.employeeId'] = filters.employeeId;

  if (filters.startDate || filters.endDate) {
    query.performedAt = {};
    if (filters.startDate) query.performedAt.$gte = filters.startDate;
    if (filters.endDate) query.performedAt.$lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    PayrollAudit.find(query)
      .sort({ performedAt: -1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .lean(),
    PayrollAudit.countDocuments(query)
  ]);

  return { logs, total };
}

export async function getEntityAuditTrail(
  tenantId: string,
  entityType: IPayrollAudit['entityType'],
  entityId: string
): Promise<IPayrollAudit[]> {
  return PayrollAudit.find({ tenantId, entityType, entityId })
    .sort({ performedAt: -1 })
    .lean();
}

export async function getEmployeePayrollAuditTrail(
  tenantId: string,
  employeeId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IPayrollAudit[]> {
  const query: any = {
    tenantId,
    'metadata.employeeId': employeeId
  };

  if (startDate || endDate) {
    query.performedAt = {};
    if (startDate) query.performedAt.$gte = startDate;
    if (endDate) query.performedAt.$lte = endDate;
  }

  return PayrollAudit.find(query)
    .sort({ performedAt: -1 })
    .lean();
}

export async function getAuditSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalActions: number;
  actionBreakdown: Record<string, number>;
  entityBreakdown: Record<string, number>;
  userBreakdown: Array<{ userId: string; userName: string; count: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
}> {
  const query = {
    tenantId,
    performedAt: { $gte: startDate, $lte: endDate }
  };

  const [totalActions, actionAgg, entityAgg, userAgg, dailyAgg] = await Promise.all([
    PayrollAudit.countDocuments(query),
    PayrollAudit.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]),
    PayrollAudit.aggregate([
      { $match: query },
      { $group: { _id: '$entityType', count: { $sum: 1 } } }
    ]),
    PayrollAudit.aggregate([
      { $match: query },
      { $group: { _id: { id: '$performedBy', name: '$performedByName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    PayrollAudit.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$performedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const actionBreakdown: Record<string, number> = {};
  actionAgg.forEach(a => { actionBreakdown[a._id] = a.count; });

  const entityBreakdown: Record<string, number> = {};
  entityAgg.forEach(e => { entityBreakdown[e._id] = e.count; });

  const userBreakdown = userAgg.map(u => ({
    userId: u._id.id,
    userName: u._id.name || 'Unknown',
    count: u.count
  }));

  const dailyTrend = dailyAgg.map(d => ({
    date: d._id,
    count: d.count
  }));

  return { totalActions, actionBreakdown, entityBreakdown, userBreakdown, dailyTrend };
}

export async function purgeOldAuditLogs(
  tenantId: string,
  retentionDays: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await PayrollAudit.deleteMany({
    tenantId,
    performedAt: { $lt: cutoffDate }
  });

  return result.deletedCount;
}
