import { Request, Response } from 'express';
import Employee from '../models/Employee';
import Department from '../models/Department';
import mongoose from 'mongoose';

// ==================== ORGANIZATION CHART CONTROLLERS ====================

export const getOrgChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { rootId, depth = 10 } = req.query;

    // Get all active employees with their reporting structure
    const employees = await Employee.find({
      tenantId,
      status: 'active',
    })
      .select('firstName lastName employeeId designation departmentId managerId profilePhoto email')
      .populate('departmentId', 'name code')
      .lean();

    // Build the org chart tree structure
    const employeeMap = new Map<string, OrgNode>();
    const roots: OrgNode[] = [];

    interface OrgNode {
      id: string;
      name: string;
      employeeId: string;
      designation: string;
      department: string;
      departmentCode?: string;
      email: string;
      profilePhoto?: string;
      managerId?: string;
      children: OrgNode[];
    }

    // First pass: create all nodes
    employees.forEach(emp => {
      const node: OrgNode = {
        id: emp._id.toString(),
        name: `${emp.firstName} ${emp.lastName}`,
        employeeId: emp.employeeId,
        designation: emp.designation,
        department: (emp.departmentId as { name: string })?.name || 'N/A',
        departmentCode: (emp.departmentId as { code: string })?.code,
        email: emp.email,
        profilePhoto: emp.profilePhoto,
        managerId: emp.managerId?.toString(),
        children: [],
      };
      employeeMap.set(emp._id.toString(), node);
    });

    // Second pass: build tree structure
    employeeMap.forEach((node) => {
      if (node.managerId && employeeMap.has(node.managerId)) {
        const parent = employeeMap.get(node.managerId)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // If rootId specified, find that subtree
    let orgChart = roots;
    if (rootId) {
      const rootNode = employeeMap.get(rootId as string);
      if (rootNode) {
        orgChart = [rootNode];
      }
    }

    // Sort children by designation/name
    const sortChildren = (nodes: OrgNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortChildren(node.children));
    };
    sortChildren(orgChart);

    res.status(200).json({
      success: true,
      data: { orgChart },
    });
  } catch (error) {
    console.error('[Employee Service] Get org chart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organization chart' });
  }
};

export const getDepartmentOrgChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get all departments
    const departments = await Department.find({ tenantId, isActive: true })
      .select('name code description headId parentDepartmentId')
      .populate('headId', 'firstName lastName designation')
      .lean();

    interface DeptNode {
      id: string;
      name: string;
      code: string;
      description?: string;
      head?: {
        name: string;
        designation: string;
      };
      employeeCount: number;
      children: DeptNode[];
    }

    // Get employee counts per department
    const employeeCounts = await Employee.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    employeeCounts.forEach(ec => {
      countMap.set(ec._id.toString(), ec.count);
    });

    // Build department tree
    const deptMap = new Map<string, DeptNode>();
    const roots: DeptNode[] = [];

    departments.forEach(dept => {
      const head = dept.headId as { firstName: string; lastName: string; designation: string } | null;
      const node: DeptNode = {
        id: dept._id.toString(),
        name: dept.name,
        code: dept.code,
        description: dept.description,
        head: head ? {
          name: `${head.firstName} ${head.lastName}`,
          designation: head.designation,
        } : undefined,
        employeeCount: countMap.get(dept._id.toString()) || 0,
        children: [],
      };
      deptMap.set(dept._id.toString(), node);
    });

    deptMap.forEach((node, id) => {
      const dept = departments.find(d => d._id.toString() === id);
      if (dept?.parentDepartmentId && deptMap.has(dept.parentDepartmentId.toString())) {
        const parent = deptMap.get(dept.parentDepartmentId.toString())!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.status(200).json({
      success: true,
      data: { departmentChart: roots },
    });
  } catch (error) {
    console.error('[Employee Service] Get department org chart error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch department chart' });
  }
};

export const getEmployeeHierarchy = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { direction = 'both' } = req.query; // 'up', 'down', 'both'

    const employee = await Employee.findOne({ _id: id, tenantId })
      .select('firstName lastName employeeId designation departmentId managerId')
      .populate('departmentId', 'name')
      .lean();

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    interface HierarchyNode {
      id: string;
      name: string;
      employeeId: string;
      designation: string;
      department: string;
      level: number;
    }

    const hierarchy: {
      upward: HierarchyNode[];
      current: HierarchyNode;
      downward: HierarchyNode[];
    } = {
      upward: [],
      current: {
        id: employee._id.toString(),
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        designation: employee.designation,
        department: (employee.departmentId as { name: string })?.name || 'N/A',
        level: 0,
      },
      downward: [],
    };

    // Get upward hierarchy (managers)
    if (direction === 'up' || direction === 'both') {
      let currentManagerId = employee.managerId;
      let level = -1;

      while (currentManagerId) {
        const manager = await Employee.findOne({
          _id: currentManagerId,
          tenantId,
          status: 'active',
        })
          .select('firstName lastName employeeId designation departmentId managerId')
          .populate('departmentId', 'name')
          .lean();

        if (!manager) break;

        hierarchy.upward.unshift({
          id: manager._id.toString(),
          name: `${manager.firstName} ${manager.lastName}`,
          employeeId: manager.employeeId,
          designation: manager.designation,
          department: (manager.departmentId as { name: string })?.name || 'N/A',
          level,
        });

        currentManagerId = manager.managerId;
        level--;
      }
    }

    // Get downward hierarchy (direct reports)
    if (direction === 'down' || direction === 'both') {
      const getReports = async (managerId: string, level: number): Promise<HierarchyNode[]> => {
        const reports = await Employee.find({
          tenantId,
          managerId,
          status: 'active',
        })
          .select('firstName lastName employeeId designation departmentId')
          .populate('departmentId', 'name')
          .lean();

        const nodes: HierarchyNode[] = [];
        for (const report of reports) {
          const node: HierarchyNode = {
            id: report._id.toString(),
            name: `${report.firstName} ${report.lastName}`,
            employeeId: report.employeeId,
            designation: report.designation,
            department: (report.departmentId as { name: string })?.name || 'N/A',
            level,
          };
          nodes.push(node);

          // Recursively get reports (limit depth to 5)
          if (level < 5) {
            const subReports = await getReports(report._id.toString(), level + 1);
            nodes.push(...subReports);
          }
        }
        return nodes;
      };

      hierarchy.downward = await getReports(id, 1);
    }

    res.status(200).json({
      success: true,
      data: { hierarchy },
    });
  } catch (error) {
    console.error('[Employee Service] Get employee hierarchy error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee hierarchy' });
  }
};

export const getDirectReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const reports = await Employee.find({
      tenantId,
      managerId: id,
      status: 'active',
    })
      .select('firstName lastName employeeId designation departmentId email profilePhoto')
      .populate('departmentId', 'name')
      .lean();

    // Get count of their direct reports
    const reportsWithCounts = await Promise.all(
      reports.map(async (report) => {
        const directReportCount = await Employee.countDocuments({
          tenantId,
          managerId: report._id,
          status: 'active',
        });
        return {
          ...report,
          directReportCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { directReports: reportsWithCounts },
    });
  } catch (error) {
    console.error('[Employee Service] Get direct reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch direct reports' });
  }
};

export const updateReportingManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { managerId } = req.body;

    // Prevent circular reporting
    if (managerId) {
      let currentManager = managerId;
      const visited = new Set<string>();
      visited.add(id);

      while (currentManager) {
        if (visited.has(currentManager)) {
          res.status(400).json({
            success: false,
            message: 'Cannot create circular reporting structure',
          });
          return;
        }
        visited.add(currentManager);

        const manager = await Employee.findById(currentManager).select('managerId').lean();
        currentManager = manager?.managerId?.toString() || null;
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { managerId: managerId || null },
      { new: true }
    )
      .populate('managerId', 'firstName lastName designation')
      .lean();

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Reporting manager updated',
      data: { employee },
    });
  } catch (error) {
    console.error('[Employee Service] Update reporting manager error:', error);
    res.status(500).json({ success: false, message: 'Failed to update reporting manager' });
  }
};

export const getOrgStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const [
      totalEmployees,
      departmentCount,
      avgSpanOfControl,
      maxDepth,
      employeesWithNoManager,
      employeesWithNoReports
    ] = await Promise.all([
      Employee.countDocuments({ tenantId, status: 'active' }),
      Department.countDocuments({ tenantId, isActive: true }),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
        {
          $lookup: {
            from: 'employees',
            let: { empId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$managerId', '$$empId'] },
                  status: 'active',
                  tenantId: new mongoose.Types.ObjectId(tenantId),
                },
              },
            ],
            as: 'directReports',
          },
        },
        { $match: { 'directReports.0': { $exists: true } } },
        { $group: { _id: null, avgReports: { $avg: { $size: '$directReports' } } } },
      ]),
      calculateOrgDepth(tenantId),
      Employee.countDocuments({ tenantId, status: 'active', managerId: { $exists: false } }),
      Employee.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'active' } },
        {
          $lookup: {
            from: 'employees',
            let: { empId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$managerId', '$$empId'] },
                  status: 'active',
                },
              },
            ],
            as: 'directReports',
          },
        },
        { $match: { directReports: { $size: 0 } } },
        { $count: 'count' },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        departmentCount,
        averageSpanOfControl: avgSpanOfControl[0]?.avgReports?.toFixed(1) || 0,
        organizationDepth: maxDepth,
        employeesWithNoManager,
        individualContributors: employeesWithNoReports[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error('[Employee Service] Get org stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organization stats' });
  }
};

// Helper function to calculate org depth
async function calculateOrgDepth(tenantId: string): Promise<number> {
  const employees = await Employee.find({ tenantId, status: 'active' })
    .select('_id managerId')
    .lean();

  const employeeMap = new Map<string, string | null>();
  employees.forEach(emp => {
    employeeMap.set(emp._id.toString(), emp.managerId?.toString() || null);
  });

  let maxDepth = 0;

  const calculateDepth = (empId: string, visited: Set<string>): number => {
    if (visited.has(empId)) return 0;
    visited.add(empId);

    const managerId = employeeMap.get(empId);
    if (!managerId) return 1;

    return 1 + calculateDepth(managerId, visited);
  };

  employeeMap.forEach((_, empId) => {
    const depth = calculateDepth(empId, new Set());
    maxDepth = Math.max(maxDepth, depth);
  });

  return maxDepth;
}
