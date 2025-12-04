import { useState, useEffect } from 'react';
import api from '../services/api';

interface Document {
  _id: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  accessLevel: string;
  version: number;
  uploadedBy: { _id: string; firstName: string; lastName: string };
  createdAt: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { value: 'all', label: 'All Documents' },
    { value: 'personal', label: 'Personal' },
    { value: 'employment', label: 'Employment' },
    { value: 'policy', label: 'Policy' },
    { value: 'training', label: 'Training' },
    { value: 'performance', label: 'Performance' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'legal', label: 'Legal' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, searchQuery]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/employees/documents?${params}`);
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('document') || mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📽️';
    return '📎';
  };

  const getAccessBadge = (level: string) => {
    const colors: Record<string, string> = {
      public: 'bg-green-100 text-green-800',
      department: 'bg-blue-100 text-blue-800',
      manager: 'bg-yellow-100 text-yellow-800',
      hr_only: 'bg-red-100 text-red-800',
      employee_only: 'bg-purple-100 text-purple-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-4">📁</div>
          <p>No documents found. Upload your first document!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <div key={doc._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{getFileIcon(doc.mimeType)}</div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccessBadge(doc.accessLevel)}`}>
                    {doc.accessLevel?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-gray-900 truncate" title={doc.name}>
                  {doc.name}
                </h3>
                {doc.description && (
                  <p className="text-sm text-gray-500 mt-1 truncate">{doc.description}</p>
                )}
                <div className="mt-4 space-y-1 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="capitalize">{doc.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(doc.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>v{doc.version}</span>
                  </div>
                </div>
              </div>
              <div className="border-t px-4 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <button className="text-blue-600 hover:text-blue-900 text-sm">View</button>
                  <button className="text-green-600 hover:text-green-900 text-sm">Download</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
