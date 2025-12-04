import { useState, useEffect } from 'react';
import api from '../services/api';

interface JobPosting {
  _id: string;
  title: string;
  code: string;
  departmentId: { _id: string; name: string };
  location: string;
  employmentType: string;
  status: string;
  applicationsCount: number;
  postedAt: string;
}

interface JobApplication {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobPostingId: { _id: string; title: string; code: string };
  status: string;
  stage: number;
  createdAt: string;
}

const Recruitment = () => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'jobs') {
        const response = await api.get('/employees/recruitment/jobs');
        setJobs(response.data.data.jobPostings || []);
      } else {
        const response = await api.get('/employees/recruitment/applications');
        setApplications(response.data.data.applications || []);
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
      open: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      new: 'bg-blue-100 text-blue-800',
      screening: 'bg-purple-100 text-purple-800',
      interview: 'bg-indigo-100 text-indigo-800',
      offer: 'bg-green-100 text-green-800',
      hired: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        <button
          onClick={() => setShowJobModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Post New Job
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'jobs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Job Postings
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'applications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Applications
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'jobs' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No job postings found. Create your first job posting!
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{job.title}</div>
                      <div className="text-sm text-gray-500">{job.code}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {job.departmentId?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {job.employmentType?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {job.applicationsCount || 0}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      <button className="text-gray-600 hover:text-gray-900">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No applications found.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{app.firstName} {app.lastName}</div>
                      <div className="text-sm text-gray-500">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {app.jobPostingId?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5, 6, 7].map((stage) => (
                          <div
                            key={stage}
                            className={`w-6 h-1 mr-1 rounded ${
                              stage <= app.stage ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      <button className="text-green-600 hover:text-green-900">Advance</button>
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

export default Recruitment;
