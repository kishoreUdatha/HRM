import { useState, useEffect } from 'react';
import api from '../services/api';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
}

const standardReports: ReportCard[] = [
  { id: 'employees', title: 'Employee Report', description: 'Employee demographics and distribution', icon: '👥', type: 'employees' },
  { id: 'attendance', title: 'Attendance Report', description: 'Attendance trends and statistics', icon: '📅', type: 'attendance' },
  { id: 'leaves', title: 'Leave Report', description: 'Leave utilization and balances', icon: '🏖️', type: 'leaves' },
  { id: 'payroll', title: 'Payroll Report', description: 'Salary and compensation analysis', icon: '💰', type: 'payroll' },
  { id: 'recruitment', title: 'Recruitment Report', description: 'Hiring pipeline and metrics', icon: '🎯', type: 'recruitment' },
  { id: 'performance', title: 'Performance Report', description: 'Performance ratings and trends', icon: '⭐', type: 'performance' },
  { id: 'training', title: 'Training Report', description: 'Training completion and effectiveness', icon: '📚', type: 'training' },
];

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportData, setReportData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async (type: string) => {
    setLoading(true);
    setSelectedReport(type);
    try {
      const response = await api.get(`/reports/standard/${type}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      // Mock data for demo
      setReportData(getMockData(type));
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (type: string) => {
    const mockData: Record<string, unknown> = {
      employees: {
        summary: { totalEmployees: 150, activeEmployees: 142, newHires: 12, terminations: 5 },
        byDepartment: [
          { department: 'Engineering', count: 45 },
          { department: 'Sales', count: 30 },
          { department: 'Marketing', count: 25 },
          { department: 'HR', count: 15 },
        ],
      },
      attendance: {
        summary: { averageAttendance: 94.5, totalWorkingDays: 22, lateArrivals: 45 },
        byDepartment: [
          { department: 'Engineering', attendance: 96 },
          { department: 'Sales', attendance: 92 },
        ],
      },
      leaves: {
        summary: { totalLeavesTaken: 450, pendingRequests: 12, approvalRate: 92 },
        byType: [
          { type: 'Annual', count: 280 },
          { type: 'Sick', count: 95 },
        ],
      },
      payroll: {
        summary: { totalGrossSalary: 2500000, totalDeductions: 450000, totalNetSalary: 2050000 },
      },
      recruitment: {
        summary: { openPositions: 15, totalApplications: 450, hiredThisMonth: 8 },
        pipeline: [
          { stage: 'New', count: 180 },
          { stage: 'Interview', count: 80 },
          { stage: 'Offer', count: 15 },
        ],
      },
      performance: {
        summary: { reviewsCompleted: 140, averageRating: 3.8 },
        ratingDistribution: [
          { rating: 5, count: 15 },
          { rating: 4, count: 45 },
          { rating: 3, count: 65 },
        ],
      },
      training: {
        summary: { totalPrograms: 35, completionRate: 78 },
        byCategory: [
          { category: 'Technical', enrollments: 200 },
          { category: 'Soft Skills', enrollments: 120 },
        ],
      },
    };
    return mockData[type] || {};
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    const data = reportData as { summary?: Record<string, number | string> };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {data.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.summary).map(([key, value]) => (
              <div key={key} className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-500 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {typeof value === 'number' && key.toLowerCase().includes('salary')
                    ? `$${value.toLocaleString()}`
                    : typeof value === 'number' && key.toLowerCase().includes('rate')
                    ? `${value}%`
                    : value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Data Tables */}
        {Object.entries(data).map(([key, value]) => {
          if (key === 'summary' || !Array.isArray(value)) return null;

          return (
            <div key={key} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-900 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(value[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {header.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {value.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {Object.values(row as Record<string, unknown>).map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 text-sm text-gray-900">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50">
            Export
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            + Custom Report
          </button>
        </div>
      </div>

      {!selectedReport ? (
        <>
          {/* Report Cards */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Standard Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {standardReports.map((report) => (
              <div
                key={report.id}
                onClick={() => fetchReport(report.type)}
                className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-3">{report.icon}</div>
                <h3 className="font-semibold text-gray-900">{report.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Report View */}
          <div className="mb-4">
            <button
              onClick={() => {
                setSelectedReport(null);
                setReportData(null);
              }}
              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
            >
              ← Back to Reports
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {standardReports.find((r) => r.type === selectedReport)?.title}
              </h2>
              <div className="flex gap-2">
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This year</option>
                  <option>Custom range</option>
                </select>
                <button className="bg-gray-100 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
                  Export PDF
                </button>
                <button className="bg-gray-100 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
                  Export Excel
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            renderReportContent()
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
