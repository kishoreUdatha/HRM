import React, { useState, useEffect } from 'react';
import {
  HiChartBar,
  HiTrendingUp,
  HiTrendingDown,
  HiUsers,
  HiExclamation,
  HiRefresh,
  HiClock,
  HiStar,
  HiHeart,
  HiCurrencyDollar,
} from 'react-icons/hi';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

interface KPI {
  _id: string;
  name: string;
  category: string;
  value: number;
  previousValue?: number;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

interface AttritionPrediction {
  employeeId: string;
  employeeName: string;
  department: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low';
  factors: string[];
}

interface DepartmentMetric {
  department: string;
  headcount: number;
  avgPerformance: number;
  engagementScore: number;
  attritionRate: number;
  [key: string]: string | number;
}

const Analytics: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [attritionRisks, setAttritionRisks] = useState<AttritionPrediction[]>([]);
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetric[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; headcount: number; attrition: number; hires: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'departments'>('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, predictionsRes, trendsRes] = await Promise.allSettled([
        api.get('/analytics/kpis'),
        api.get('/analytics/predictions/attrition'),
        api.get('/analytics/trends'),
      ]);

      if (kpiRes.status === 'fulfilled') {
        setKpis(kpiRes.value.data.data?.kpis || kpiRes.value.data.kpis || generateMockKPIs());
      } else {
        setKpis(generateMockKPIs());
      }

      if (predictionsRes.status === 'fulfilled') {
        setAttritionRisks(predictionsRes.value.data.data?.predictions || predictionsRes.value.data.predictions || generateMockPredictions());
      } else {
        setAttritionRisks(generateMockPredictions());
      }

      if (trendsRes.status === 'fulfilled') {
        setTrendData(trendsRes.value.data.data?.trends || trendsRes.value.data.trends || generateMockTrends());
      } else {
        setTrendData(generateMockTrends());
      }

      setDepartmentMetrics(generateMockDepartmentMetrics());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Use mock data on error
      setKpis(generateMockKPIs());
      setAttritionRisks(generateMockPredictions());
      setTrendData(generateMockTrends());
      setDepartmentMetrics(generateMockDepartmentMetrics());
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data generators
  const generateMockKPIs = (): KPI[] => [
    { _id: '1', name: 'Total Headcount', category: 'workforce', value: 248, previousValue: 235, target: 260, trend: 'up', unit: 'employees' },
    { _id: '2', name: 'Attrition Rate', category: 'workforce', value: 4.2, previousValue: 5.1, target: 3.5, trend: 'down', unit: '%' },
    { _id: '3', name: 'Avg Performance Score', category: 'performance', value: 3.8, previousValue: 3.6, target: 4.0, trend: 'up', unit: '/5' },
    { _id: '4', name: 'Employee Engagement', category: 'engagement', value: 78, previousValue: 74, target: 85, trend: 'up', unit: '%' },
    { _id: '5', name: 'Training Completion', category: 'learning', value: 89, previousValue: 85, target: 95, trend: 'up', unit: '%' },
    { _id: '6', name: 'Time to Hire', category: 'recruitment', value: 32, previousValue: 38, target: 28, trend: 'down', unit: 'days' },
  ];

  const generateMockPredictions = (): AttritionPrediction[] => [
    { employeeId: 'EMP001', employeeName: 'John Smith', department: 'Engineering', riskScore: 85, riskLevel: 'high', factors: ['Low engagement', 'No recent promotion', 'Below market salary'] },
    { employeeId: 'EMP015', employeeName: 'Sarah Johnson', department: 'Sales', riskScore: 72, riskLevel: 'high', factors: ['Manager change', 'Performance concerns'] },
    { employeeId: 'EMP023', employeeName: 'Mike Davis', department: 'Marketing', riskScore: 58, riskLevel: 'medium', factors: ['Limited growth opportunities'] },
    { employeeId: 'EMP045', employeeName: 'Emily Brown', department: 'HR', riskScore: 45, riskLevel: 'medium', factors: ['Workload concerns'] },
    { employeeId: 'EMP067', employeeName: 'David Wilson', department: 'Finance', riskScore: 32, riskLevel: 'low', factors: ['Tenure milestone approaching'] },
  ];

  const generateMockTrends = () => [
    { month: 'Jan', headcount: 220, attrition: 5, hires: 12 },
    { month: 'Feb', headcount: 227, attrition: 3, hires: 10 },
    { month: 'Mar', headcount: 232, attrition: 4, hires: 9 },
    { month: 'Apr', headcount: 235, attrition: 6, hires: 9 },
    { month: 'May', headcount: 238, attrition: 4, hires: 7 },
    { month: 'Jun', headcount: 241, attrition: 5, hires: 8 },
    { month: 'Jul', headcount: 244, attrition: 3, hires: 6 },
    { month: 'Aug', headcount: 248, attrition: 4, hires: 8 },
  ];

  const generateMockDepartmentMetrics = (): DepartmentMetric[] => [
    { department: 'Engineering', headcount: 85, avgPerformance: 4.1, engagementScore: 82, attritionRate: 3.5 },
    { department: 'Sales', headcount: 45, avgPerformance: 3.9, engagementScore: 75, attritionRate: 5.2 },
    { department: 'Marketing', headcount: 32, avgPerformance: 3.7, engagementScore: 79, attritionRate: 4.1 },
    { department: 'HR', headcount: 18, avgPerformance: 4.0, engagementScore: 85, attritionRate: 2.8 },
    { department: 'Finance', headcount: 28, avgPerformance: 3.8, engagementScore: 77, attritionRate: 3.9 },
    { department: 'Operations', headcount: 40, avgPerformance: 3.6, engagementScore: 72, attritionRate: 6.1 },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const getKPIIcon = (category: string) => {
    switch (category) {
      case 'workforce': return <HiUsers className="w-6 h-6" />;
      case 'performance': return <HiStar className="w-6 h-6" />;
      case 'engagement': return <HiHeart className="w-6 h-6" />;
      case 'recruitment': return <HiClock className="w-6 h-6" />;
      case 'learning': return <HiChartBar className="w-6 h-6" />;
      default: return <HiCurrencyDollar className="w-6 h-6" />;
    }
  };

  const getRiskBadge = (level: string) => {
    const styles = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[level as keyof typeof styles]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-secondary-200 rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">HR Analytics</h1>
          <p className="text-secondary-500">Insights and predictions for workforce management</p>
        </div>
        <button
          onClick={fetchAnalyticsData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors"
        >
          <HiRefresh className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-secondary-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'predictions', label: 'Predictions' },
          { id: 'departments', label: 'Departments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi) => {
              const change = kpi.previousValue
                ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100
                : 0;
              const isPositive = kpi.trend === 'up' && kpi.name !== 'Attrition Rate' && kpi.name !== 'Time to Hire';
              const isGood = kpi.name === 'Attrition Rate' || kpi.name === 'Time to Hire' ? kpi.trend === 'down' : kpi.trend === 'up';

              return (
                <div key={kpi._id} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg ${isGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {getKPIIcon(kpi.category)}
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? <HiTrendingUp className="w-4 h-4" /> : <HiTrendingDown className="w-4 h-4" />}
                      {Math.abs(change).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-sm text-secondary-500 mb-1">{kpi.name}</p>
                  <p className="text-2xl font-bold text-secondary-900">
                    {kpi.value}
                    <span className="text-sm font-normal text-secondary-500 ml-1">{kpi.unit}</span>
                  </p>
                  {kpi.target && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-secondary-500 mb-1">
                        <span>Target: {kpi.target}{kpi.unit}</span>
                        <span>{Math.round((kpi.value / kpi.target) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Workforce Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">Workforce Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="headcount" stroke="#3B82F6" strokeWidth={2} name="Headcount" />
                <Line type="monotone" dataKey="hires" stroke="#10B981" strokeWidth={2} name="New Hires" />
                <Line type="monotone" dataKey="attrition" stroke="#EF4444" strokeWidth={2} name="Attrition" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Department Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Headcount by Department</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentMetrics}
                    dataKey="headcount"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {departmentMetrics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Engagement by Department</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentMetrics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="department" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="engagementScore" fill="#3B82F6" name="Engagement Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'predictions' && (
        <div className="space-y-6">
          {/* Alert Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <HiExclamation className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Attrition Risk Alert</p>
              <p className="text-sm text-yellow-700 mt-1">
                {attritionRisks.filter((r) => r.riskLevel === 'high').length} employees identified with high attrition risk.
                Consider taking proactive retention measures.
              </p>
            </div>
          </div>

          {/* High Risk Employees */}
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h2 className="text-lg font-semibold text-secondary-900">Attrition Risk Analysis</h2>
              <p className="text-sm text-secondary-500">AI-powered predictions based on multiple factors</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Risk Score</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Risk Level</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Key Factors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {attritionRisks.map((risk) => (
                    <tr key={risk.employeeId} className="hover:bg-secondary-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-secondary-900">{risk.employeeName}</p>
                          <p className="text-sm text-secondary-500">{risk.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-secondary-600">{risk.department}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-secondary-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                risk.riskScore >= 70 ? 'bg-red-500' : risk.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${risk.riskScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-secondary-900">{risk.riskScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getRiskBadge(risk.riskLevel)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {risk.factors.slice(0, 2).map((factor, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-secondary-100 text-secondary-600 rounded">
                              {factor}
                            </span>
                          ))}
                          {risk.factors.length > 2 && (
                            <span className="px-2 py-0.5 text-xs bg-secondary-100 text-secondary-600 rounded">
                              +{risk.factors.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Department Comparison Table */}
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h2 className="text-lg font-semibold text-secondary-900">Department Performance</h2>
              <p className="text-sm text-secondary-500">Compare metrics across departments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-50 border-b border-secondary-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Headcount</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Avg Performance</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Engagement</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Attrition Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {departmentMetrics.map((dept) => (
                    <tr key={dept.department} className="hover:bg-secondary-50">
                      <td className="px-6 py-4 font-medium text-secondary-900">{dept.department}</td>
                      <td className="px-6 py-4 text-right text-secondary-600">{dept.headcount}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${dept.avgPerformance >= 4 ? 'text-green-600' : dept.avgPerformance >= 3.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {dept.avgPerformance.toFixed(1)}/5
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-secondary-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                dept.engagementScore >= 80 ? 'bg-green-500' : dept.engagementScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${dept.engagementScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-secondary-600">{dept.engagementScore}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${dept.attritionRate <= 3 ? 'text-green-600' : dept.attritionRate <= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {dept.attritionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Performance Comparison</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="avgPerformance" fill="#3B82F6" name="Avg Performance" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Attrition Rate by Department</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attritionRate" fill="#EF4444" name="Attrition Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
