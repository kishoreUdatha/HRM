import { useState, useEffect } from 'react';
import api from '../services/api';

interface OrgNode {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  email: string;
  profilePhoto?: string;
  children: OrgNode[];
}

interface OrgStats {
  totalEmployees: number;
  departmentCount: number;
  averageSpanOfControl: number;
  organizationDepth: number;
}

const OrgChart = () => {
  const [orgData, setOrgData] = useState<OrgNode[]>([]);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrgChart();
  }, []);

  const fetchOrgChart = async () => {
    setLoading(true);
    try {
      const [chartRes, statsRes] = await Promise.all([
        api.get('/employees/org-chart'),
        api.get('/employees/org-chart/stats'),
      ]);
      setOrgData(chartRes.data.data.orgChart || []);
      setStats(statsRes.data.data);

      // Expand first level by default
      const firstLevel = new Set<string>();
      chartRes.data.data.orgChart?.forEach((node: OrgNode) => {
        firstLevel.add(node.id);
      });
      setExpandedNodes(firstLevel);
    } catch (error) {
      console.error('Failed to fetch org chart:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: OrgNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children) collectIds(node.children);
      });
    };
    collectIds(orgData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const OrgTreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="relative">
        <div
          className={`flex items-center p-3 bg-white border rounded-lg shadow-sm mb-2 hover:shadow-md transition-shadow cursor-pointer ${
            level === 0 ? 'border-blue-200 bg-blue-50' : ''
          }`}
          style={{ marginLeft: `${level * 40}px` }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {hasChildren && (
            <span className="mr-2 text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="mr-2 w-4"></span>}

          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium mr-3">
            {node.profilePhoto ? (
              <img src={node.profilePhoto} alt={node.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              node.name.split(' ').map(n => n[0]).join('').slice(0, 2)
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{node.name}</div>
            <div className="text-sm text-gray-500 truncate">{node.designation}</div>
          </div>

          <div className="text-right ml-4">
            <div className="text-sm text-gray-600">{node.department}</div>
            <div className="text-xs text-gray-400">{node.employeeId}</div>
          </div>

          {hasChildren && (
            <div className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {node.children.length}
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {node.children.map((child, index) => (
              <OrgTreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const FlatList = ({ nodes, level = 0 }: { nodes: OrgNode[]; level?: number }) => {
    return (
      <>
        {nodes.map((node) => (
          <div key={node.id}>
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium mr-3">
                    {node.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{node.name}</div>
                    <div className="text-sm text-gray-500">{node.employeeId}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{node.designation}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{node.department}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{node.email}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{node.children?.length || 0}</td>
            </tr>
            {node.children && node.children.length > 0 && (
              <FlatList nodes={node.children} level={level + 1} />
            )}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organization Chart</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === 'tree' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Employees</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Departments</div>
            <div className="text-2xl font-bold text-blue-600">{stats.departmentCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Avg. Span of Control</div>
            <div className="text-2xl font-bold text-purple-600">{stats.averageSpanOfControl}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Org Depth</div>
            <div className="text-2xl font-bold text-green-600">{stats.organizationDepth} levels</div>
          </div>
        </div>
      )}

      {/* Controls */}
      {viewMode === 'tree' && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Collapse All
          </button>
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : orgData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">🏢</div>
          <p>No organization data found. Add employees with reporting relationships to see the chart.</p>
        </div>
      ) : viewMode === 'tree' ? (
        <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
          {orgData.map((node) => (
            <OrgTreeNode key={node.id} node={node} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direct Reports</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <FlatList nodes={orgData} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrgChart;
