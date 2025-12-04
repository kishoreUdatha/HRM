import { useState, useEffect } from 'react';
import api from '../services/api';

interface TrainingProgram {
  _id: string;
  title: string;
  code: string;
  category: string;
  type: string;
  instructor?: string;
  duration: number;
  status: string;
  enrollmentCount: number;
  completionCount: number;
  averageRating?: number;
  startDate?: string;
}

interface Enrollment {
  _id: string;
  trainingId: { _id: string; title: string; code: string };
  employeeId: { _id: string; firstName: string; lastName: string };
  status: string;
  progress: number;
  enrolledAt: string;
}

const Training = () => {
  const [activeTab, setActiveTab] = useState<'programs' | 'enrollments'>('programs');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalTrainings: number;
    activeTrainings: number;
    totalEnrollments: number;
    completionRate: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const statsRes = await api.get('/employees/training/stats');
      setStats(statsRes.data.data);

      if (activeTab === 'programs') {
        const response = await api.get('/employees/training/programs');
        setPrograms(response.data.data.trainings || []);
      } else {
        const response = await api.get('/employees/training/enrollments');
        setEnrollments(response.data.data.enrollments || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      enrolled: 'bg-blue-100 text-blue-800',
      dropped: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      technical: '💻',
      soft_skills: '🤝',
      compliance: '📋',
      leadership: '👑',
      safety: '🦺',
      product: '📦',
    };
    return icons[category] || '📚';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Training & Development</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Create Training
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Programs</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalTrainings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Active Programs</div>
            <div className="text-2xl font-bold text-blue-600">{stats.activeTrainings}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Enrollments</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalEnrollments}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Completion Rate</div>
            <div className="text-2xl font-bold text-green-600">{stats.completionRate}%</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('programs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'programs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Training Programs
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'enrollments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Enrollments
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'programs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No training programs found. Create your first training program!
            </div>
          ) : (
            programs.map((program) => (
              <div key={program._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{getCategoryIcon(program.category)}</div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(program.status)}`}>
                    {program.status}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-gray-900">{program.title}</h3>
                <p className="text-sm text-gray-500">{program.code}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-900 capitalize">{program.category?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <span className="text-gray-900 capitalize">{program.type?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-900">{program.duration} hours</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Enrolled:</span>
                    <span className="text-gray-900">{program.enrollmentCount}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <button className="text-blue-600 hover:text-blue-900 text-sm">View Details</button>
                  <button className="text-green-600 hover:text-green-900 text-sm">Enroll</button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Training</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enrolled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrollments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No enrollments found.
                  </td>
                </tr>
              ) : (
                enrollments.map((enrollment) => (
                  <tr key={enrollment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {enrollment.employeeId?.firstName} {enrollment.employeeId?.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {enrollment.trainingId?.title}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">{enrollment.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(enrollment.status)}`}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-900">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Training;
