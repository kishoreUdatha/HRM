import { useState, useEffect } from 'react';
import api from '../services/api';

interface PerformanceReview {
  _id: string;
  employeeId: { _id: string; firstName: string; lastName: string; employeeId: string };
  reviewerId: { _id: string; firstName: string; lastName: string };
  period: { startDate: string; endDate: string };
  type: string;
  status: string;
  selfRating?: number;
  managerRating?: number;
  finalRating?: number;
  completedAt?: string;
}

const Performance = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalReviews: number;
    byStatus: Record<string, number>;
    averageRating: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        api.get('/employees/performance/reviews'),
        api.get('/employees/performance/stats'),
      ]);
      setReviews(reviewsRes.data.data.reviews || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      self_review: 'bg-yellow-100 text-yellow-800',
      manager_review: 'bg-blue-100 text-blue-800',
      calibration: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Performance Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Create Review Cycle
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Reviews</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalReviews}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.completed || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600">
              {(stats.byStatus?.self_review || 0) + (stats.byStatus?.manager_review || 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Average Rating</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.averageRating ? stats.averageRating.toFixed(1) : '-'}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No performance reviews found. Create a review cycle to get started!
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {review.employeeId?.firstName} {review.employeeId?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{review.employeeId?.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {review.reviewerId?.firstName} {review.reviewerId?.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(review.period?.startDate).toLocaleDateString()} -{' '}
                      {new Date(review.period?.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {review.type?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      {renderStars(review.finalRating || review.managerRating)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(review.status)}`}>
                        {review.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      {review.status !== 'completed' && (
                        <button className="text-green-600 hover:text-green-900">Continue</button>
                      )}
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

export default Performance;
