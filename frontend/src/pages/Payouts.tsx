import React, { useState, useEffect } from 'react';
import {
  HiCurrencyDollar,
  HiClock,
  HiCheck,
  HiX,
  HiRefresh,
  HiFilter,
  HiEye,
  HiPlay,
  HiExclamation,
  HiCog,
  HiUserGroup,
  HiCreditCard,
  HiCheckCircle,
  HiXCircle,
  HiClipboardCheck,
  HiPlus,
} from 'react-icons/hi';
import {
  getPayoutConfig,
  getPayoutBatches,
  getPayoutBatchDetails,
  createPayoutBatch,
  approveBatch,
  rejectBatch,
  processBatch,
  cancelBatch,
  getPayouts,
  retryPayout,
  getPayoutStats,
  syncFundAccounts,
} from '../services/payoutService';
import type { PayoutConfig, PayoutBatch, Payout } from '../services/payoutService';
import { useAppSelector } from '../hooks/useAppDispatch';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  approved: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  initiated: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  reversed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const Payouts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'batches' | 'payouts' | 'settings'>('batches');
  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [batchPayouts, setBatchPayouts] = useState<Payout[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);
  const canApprove = user?.role === 'tenant_admin' || user?.role === 'hr' || user?.role === 'super_admin';

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear, statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [configData, batchesData, statsData] = await Promise.all([
        getPayoutConfig(),
        getPayoutBatches({
          month: selectedMonth,
          year: selectedYear,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        }),
        getPayoutStats({ month: selectedMonth, year: selectedYear }),
      ]);
      setConfig(configData);
      setBatches(batchesData.batches || []);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load payout data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const data = await getPayouts({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setPayouts(data.payouts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    setIsProcessing(true);
    try {
      await createPayoutBatch({
        month: selectedMonth,
        year: selectedYear,
      });
      setSuccessMessage('Payout batch created successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create payout batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveBatch = async (batchId: string) => {
    setIsProcessing(true);
    try {
      await approveBatch(batchId);
      setSuccessMessage('Batch approved successfully');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectBatch = async (batchId: string) => {
    const comment = prompt('Please provide a reason for rejection:');
    if (!comment) return;

    setIsProcessing(true);
    try {
      await rejectBatch(batchId, comment);
      setSuccessMessage('Batch rejected');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to process this payout batch? This will initiate bank transfers.')) {
      return;
    }

    setIsProcessing(true);
    try {
      await processBatch(batchId);
      setSuccessMessage('Batch processing started');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to process batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to cancel this batch?')) {
      return;
    }

    setIsProcessing(true);
    try {
      await cancelBatch(batchId);
      setSuccessMessage('Batch cancelled');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewBatch = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    try {
      const data = await getPayoutBatchDetails(batch._id);
      setBatchPayouts(data.payouts || []);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch details');
    }
  };

  const handleRetryPayout = async (payoutId: string) => {
    setIsProcessing(true);
    try {
      await retryPayout(payoutId);
      setSuccessMessage('Payout retry initiated');
      if (selectedBatch) {
        const data = await getPayoutBatchDetails(selectedBatch._id);
        setBatchPayouts(data.payouts || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retry payout');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncFundAccounts = async () => {
    setIsProcessing(true);
    try {
      const result = await syncFundAccounts();
      setSuccessMessage(`Sync completed. Created: ${result.created}, Skipped: ${result.skipped}`);
    } catch (err: any) {
      setError(err.message || 'Failed to sync fund accounts');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (!config?.hasCredentials && activeTab !== 'settings') {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <HiExclamation className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Payouts Not Configured</h3>
          <p className="text-yellow-600 mb-4">
            Please configure your Razorpay Payouts credentials to enable salary disbursement.
          </p>
          <button
            onClick={() => setActiveTab('settings')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
          >
            Configure Payouts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salary Payouts</h1>
          <p className="text-gray-600">Manage salary disbursements to employees</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSyncFundAccounts}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <HiRefresh className={`w-5 h-5 ${isProcessing ? 'animate-spin' : ''}`} />
            Sync Bank Accounts
          </button>
          <button
            onClick={handleCreateBatch}
            disabled={isProcessing}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <HiPlus className="w-5 h-5" />
            Create Payout Batch
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Payouts</p>
              <p className="text-2xl font-bold">{stats?.totalPayouts || 0}</p>
            </div>
            <HiCurrencyDollar className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(stats?.totalAmount || 0)}</p>
            </div>
            <HiCreditCard className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.byStatus?.find((s: any) => s.status === 'completed')?.count || 0}
              </p>
            </div>
            <HiCheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.byStatus?.find((s: any) => s.status === 'failed')?.count || 0}
              </p>
            </div>
            <HiXCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('batches')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'batches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiUserGroup className="w-5 h-5 inline-block mr-2" />
              Payout Batches
            </button>
            <button
              onClick={() => { setActiveTab('payouts'); loadPayouts(); }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'payouts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiCurrencyDollar className="w-5 h-5 inline-block mr-2" />
              Individual Payouts
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <HiCog className="w-5 h-5 inline-block mr-2" />
              Settings
            </button>
          </nav>
        </div>

        {/* Filters */}
        {activeTab !== 'settings' && (
          <div className="p-4 border-b border-gray-200 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <HiFilter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {monthNames.map((name, index) => (
                  <option key={index} value={index + 1}>{name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading...</p>
            </div>
          ) : activeTab === 'batches' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No payout batches found for this period
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{batch.batchNumber}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(batch.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {monthNames[batch.month - 1]} {batch.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {batch.totalEmployees}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatCurrency(batch.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[batch.status]}`}>
                            {batch.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">{batch.successfulPayouts}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-yellow-600">{batch.pendingPayouts}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-red-600">{batch.failedPayouts}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewBatch(batch)}
                              className="p-2 text-gray-500 hover:text-blue-600"
                              title="View Details"
                            >
                              <HiEye className="w-5 h-5" />
                            </button>
                            {batch.status === 'pending_approval' && canApprove && (
                              <>
                                <button
                                  onClick={() => handleApproveBatch(batch._id)}
                                  disabled={isProcessing}
                                  className="p-2 text-green-500 hover:text-green-700"
                                  title="Approve"
                                >
                                  <HiCheck className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleRejectBatch(batch._id)}
                                  disabled={isProcessing}
                                  className="p-2 text-red-500 hover:text-red-700"
                                  title="Reject"
                                >
                                  <HiX className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            {(batch.status === 'draft' || batch.status === 'approved') && (
                              <button
                                onClick={() => handleProcessBatch(batch._id)}
                                disabled={isProcessing}
                                className="p-2 text-blue-500 hover:text-blue-700"
                                title="Process Payouts"
                              >
                                <HiPlay className="w-5 h-5" />
                              </button>
                            )}
                            {['draft', 'pending_approval', 'approved'].includes(batch.status) && (
                              <button
                                onClick={() => handleCancelBatch(batch._id)}
                                disabled={isProcessing}
                                className="p-2 text-gray-500 hover:text-red-600"
                                title="Cancel"
                              >
                                <HiX className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'payouts' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No payouts found
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {payout.employee.firstName} {payout.employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{payout.employee.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payout.bankDetails.bankName}</div>
                          <div className="text-sm text-gray-500">
                            {payout.bankDetails.accountNumber} | {payout.bankDetails.ifscCode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{payout.payoutMethod}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[payout.status]}`}>
                            {payout.status.toUpperCase()}
                          </span>
                          {payout.failureReason && (
                            <p className="text-xs text-red-500 mt-1">{payout.failureReason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payout.utr || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {payout.status === 'failed' && payout.retryCount < 3 && (
                            <button
                              onClick={() => handleRetryPayout(payout._id)}
                              disabled={isProcessing}
                              className="p-2 text-blue-500 hover:text-blue-700"
                              title="Retry"
                            >
                              <HiRefresh className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <PayoutSettings config={config} onUpdate={loadData} />
          )}
        </div>
      </div>

      {/* Batch Details Modal */}
      {isModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">Batch: {selectedBatch.batchNumber}</h3>
                    <p className="text-sm text-gray-500">
                      {monthNames[selectedBatch.month - 1]} {selectedBatch.year}
                    </p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <HiX className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedBatch.totalAmount)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-green-600">Successful</p>
                    <p className="text-lg font-bold text-green-700">{selectedBatch.successfulPayouts}</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-lg font-bold text-yellow-700">{selectedBatch.pendingPayouts}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-600">Failed</p>
                    <p className="text-lg font-bold text-red-700">{selectedBatch.failedPayouts}</p>
                  </div>
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Bank</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {batchPayouts.map((payout) => (
                      <tr key={payout._id}>
                        <td className="px-4 py-2">
                          <div className="text-sm font-medium">{payout.employee.firstName} {payout.employee.lastName}</div>
                          <div className="text-xs text-gray-500">{payout.employee.employeeCode}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {payout.bankDetails.bankName} - {payout.bankDetails.accountNumber}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">{formatCurrency(payout.amount)}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[payout.status]}`}>
                            {payout.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">{payout.utr || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Component
const PayoutSettings: React.FC<{ config: PayoutConfig | null; onUpdate: () => void }> = ({ config, onUpdate }) => {
  const [formData, setFormData] = useState({
    razorpayAccountId: config?.razorpayAccountId || '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    webhookSecret: '',
    payoutMode: config?.payoutMode || 'manual',
    scheduledDay: config?.scheduledDay || 1,
    scheduledTime: config?.scheduledTime || '10:00',
    requireApproval: config?.requireApproval ?? true,
    minApprovers: config?.minApprovers || 1,
    notifyEmployeeOnPayout: config?.notifyEmployeeOnPayout ?? true,
    notifyHROnFailure: config?.notifyHROnFailure ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { updatePayoutConfig, updatePayoutCredentials } = await import('../services/payoutService');

      // Update credentials if provided
      if (formData.razorpayKeyId && formData.razorpayKeySecret) {
        await updatePayoutCredentials({
          razorpayAccountId: formData.razorpayAccountId,
          razorpayKeyId: formData.razorpayKeyId,
          razorpayKeySecret: formData.razorpayKeySecret,
          webhookSecret: formData.webhookSecret,
        });
      }

      // Update config
      await updatePayoutConfig({
        payoutMode: formData.payoutMode as any,
        scheduledDay: formData.scheduledDay,
        scheduledTime: formData.scheduledTime,
        requireApproval: formData.requireApproval,
        minApprovers: formData.minApprovers,
        notifyEmployeeOnPayout: formData.notifyEmployeeOnPayout,
        notifyHROnFailure: formData.notifyHROnFailure,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully' });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsSaving(true);
    try {
      const { testPayoutConnection } = await import('../services/payoutService');
      const result = await testPayoutConnection();
      setMessage({ type: 'success', text: `Connection successful! Balance: ${result.currency} ${result.balance}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Connection failed' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Razorpay Credentials */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Razorpay X Credentials</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={formData.razorpayAccountId}
              onChange={(e) => setFormData({ ...formData, razorpayAccountId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Your Razorpay X Account Number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key ID</label>
            <input
              type="password"
              value={formData.razorpayKeyId}
              onChange={(e) => setFormData({ ...formData, razorpayKeyId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder={config?.hasCredentials ? '••••••••' : 'rzp_live_...'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Secret</label>
            <input
              type="password"
              value={formData.razorpayKeySecret}
              onChange={(e) => setFormData({ ...formData, razorpayKeySecret: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder={config?.hasCredentials ? '••••••••' : 'Enter secret'}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret (Optional)</label>
            <input
              type="password"
              value={formData.webhookSecret}
              onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="For webhook signature verification"
            />
          </div>
        </div>
        {config?.hasCredentials && (
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isSaving}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Test Connection
          </button>
        )}
      </div>

      {/* Workflow Settings */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Payout Workflow</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payout Mode</label>
            <select
              value={formData.payoutMode}
              onChange={(e) => setFormData({ ...formData, payoutMode: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="manual">Manual - HR triggers payouts</option>
              <option value="automatic">Automatic - Trigger when payroll is processed</option>
              <option value="scheduled">Scheduled - Run on specific day</option>
            </select>
          </div>
          {formData.payoutMode === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.scheduledDay}
                  onChange={(e) => setFormData({ ...formData, scheduledDay: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requireApproval"
              checked={formData.requireApproval}
              onChange={(e) => setFormData({ ...formData, requireApproval: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="requireApproval" className="text-sm text-gray-700">
              Require approval before processing payouts
            </label>
          </div>
          {formData.requireApproval && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Approvers</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.minApprovers}
                onChange={(e) => setFormData({ ...formData, minApprovers: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notifyEmployee"
              checked={formData.notifyEmployeeOnPayout}
              onChange={(e) => setFormData({ ...formData, notifyEmployeeOnPayout: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="notifyEmployee" className="text-sm text-gray-700">
              Notify employees when payout is completed
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notifyHR"
              checked={formData.notifyHROnFailure}
              onChange={(e) => setFormData({ ...formData, notifyHROnFailure: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="notifyHR" className="text-sm text-gray-700">
              Notify HR when payout fails
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
};

export default Payouts;
