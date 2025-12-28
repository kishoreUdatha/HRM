import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert,
  CircularProgress, Snackbar, TablePagination, Tooltip, FormControl,
  InputLabel, Select, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  Add, Receipt, Flight, Restaurant, LocalTaxi, AttachMoney, Visibility,
  CheckCircle, Cancel, Schedule, Upload, Edit, Delete, Send, Refresh,
  Business, Hotel, Computer, MoreHoriz,
} from '@mui/icons-material';
import { expenseService } from '../services/expenseService';
import { useAppSelector } from '../hooks/useAppDispatch';
import type { Expense, ExpenseCategory, ExpenseReport, TravelRequest, CreateExpenseData, CreateTravelRequestData } from '../services/expenseService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const getCategoryIcon = (code: string) => {
  switch (code?.toLowerCase()) {
    case 'travel': return <Flight />;
    case 'meals': case 'food': return <Restaurant />;
    case 'transport': case 'transportation': return <LocalTaxi />;
    case 'accommodation': case 'hotel': return <Hotel />;
    case 'equipment': case 'supplies': return <Computer />;
    case 'office': return <Business />;
    default: return <MoreHoriz />;
  }
};

const Expenses: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenseReports, setExpenseReports] = useState<ExpenseReport[]>([]);
  const [travelRequests, setTravelRequests] = useState<TravelRequest[]>([]);
  const [stats, setStats] = useState({ totalPending: 0, totalApproved: 0, totalExpenses: 0, pendingReports: 0 });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [totalTravelRequests, setTotalTravelRequests] = useState(0);

  // Dialog states
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openTravelDialog, setOpenTravelDialog] = useState(false);
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
  const [selectedTravelRequest, setSelectedTravelRequest] = useState<TravelRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState<Partial<CreateExpenseData>>({
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
    amount: 0,
    paymentMethod: 'card',
    isBillable: false,
    notes: '',
  });

  const [travelForm, setTravelForm] = useState<Partial<CreateTravelRequestData>>({
    purpose: '',
    destination: '',
    startDate: '',
    endDate: '',
    estimatedBudget: 0,
  });

  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    selectedExpenses: [] as string[],
  });

  const { user } = useAppSelector((state) => state.auth);
  const employeeId = user?._id || '';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [categoriesData, expensesData, reportsData, travelData, statsData] = await Promise.all([
        expenseService.getCategories(),
        expenseService.getExpenses({ page: page + 1, limit: rowsPerPage }),
        expenseService.getExpenseReports({ page: 1, limit: 10 }),
        expenseService.getTravelRequests({ page: 1, limit: 10 }),
        expenseService.getExpenseStats().catch(() => ({ totalPending: 0, totalApproved: 0, totalExpenses: 0, pendingReports: 0 })),
      ]);

      setCategories(categoriesData);
      setExpenses(expensesData.data);
      setTotalExpenses(expensesData.pagination?.total || 0);
      setExpenseReports(reportsData.data);
      setTotalReports(reportsData.pagination?.total || 0);
      setTravelRequests(travelData.data);
      setTotalTravelRequests(travelData.pagination?.total || 0);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching expenses data:', err);
      setError(err.response?.data?.message || 'Failed to load expenses data');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const handleSeedCategories = async () => {
    try {
      setLoading(true);
      const result = await expenseService.seedCategories();
      setSuccess(`Created ${result.created.length} categories`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to seed categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateExpense = async () => {
    try {
      if (!employeeId) {
        setError('User session not found. Please login again.');
        return;
      }
      if (!expenseForm.categoryId || !expenseForm.description || !expenseForm.amount) {
        setError('Please fill in all required fields');
        return;
      }

      setLoading(true);
      const data: CreateExpenseData = {
        employeeId,
        categoryId: expenseForm.categoryId!,
        date: expenseForm.date || new Date().toISOString(),
        description: expenseForm.description!,
        merchant: expenseForm.merchant || '',
        amount: Number(expenseForm.amount),
        paymentMethod: expenseForm.paymentMethod,
        isBillable: expenseForm.isBillable,
        notes: expenseForm.notes,
      };

      if (isEditing && selectedExpense) {
        await expenseService.updateExpense(selectedExpense._id, data);
        setSuccess('Expense updated successfully');
      } else {
        await expenseService.createExpense(data);
        setSuccess('Expense created successfully');
      }

      setOpenExpenseDialog(false);
      resetExpenseForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      setLoading(true);
      await expenseService.deleteExpense(id);
      setSuccess('Expense deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setOpenViewDialog(true);
  };

  const handleEditExpense = (expense: Expense) => {
    const categoryId = typeof expense.categoryId === 'object' ? expense.categoryId._id : expense.categoryId;
    setExpenseForm({
      categoryId,
      date: expense.date.split('T')[0],
      description: expense.description,
      merchant: expense.merchant,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      isBillable: expense.isBillable,
      notes: expense.notes,
    });
    setSelectedExpense(expense);
    setIsEditing(true);
    setOpenExpenseDialog(true);
  };

  const handleCreateTravelRequest = async () => {
    try {
      if (!employeeId) {
        setError('User session not found. Please login again.');
        return;
      }
      if (!travelForm.purpose || !travelForm.destination || !travelForm.startDate || !travelForm.endDate) {
        setError('Please fill in all required fields');
        return;
      }

      setLoading(true);
      const data: CreateTravelRequestData = {
        employeeId,
        purpose: travelForm.purpose!,
        destination: travelForm.destination!,
        startDate: travelForm.startDate!,
        endDate: travelForm.endDate!,
        estimatedBudget: Number(travelForm.estimatedBudget) || 0,
      };

      await expenseService.createTravelRequest(data);
      setSuccess('Travel request created successfully');
      setOpenTravelDialog(false);
      resetTravelForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create travel request');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTravelRequest = async (id: string) => {
    try {
      setLoading(true);
      await expenseService.approveTravelRequest(id);
      setSuccess('Travel request approved');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve travel request');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpenseReport = async () => {
    try {
      if (!employeeId) {
        setError('User session not found. Please login again.');
        return;
      }
      if (!reportForm.title || reportForm.selectedExpenses.length === 0) {
        setError('Please enter a title and select at least one expense');
        return;
      }

      setLoading(true);
      await expenseService.createExpenseReport({
        employeeId,
        title: reportForm.title,
        description: reportForm.description,
        expenses: reportForm.selectedExpenses,
      });
      setSuccess('Expense report created successfully');
      setOpenReportDialog(false);
      resetReportForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create expense report');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (id: string) => {
    try {
      setLoading(true);
      await expenseService.submitExpenseReport(id);
      setSuccess('Expense report submitted for approval');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit expense report');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async (id: string) => {
    try {
      setLoading(true);
      await expenseService.approveExpenseReport(id);
      setSuccess('Expense report approved');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve expense report');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReport = async (id: string) => {
    const comments = window.prompt('Please enter rejection reason:');
    if (!comments) return;

    try {
      setLoading(true);
      await expenseService.rejectExpenseReport(id, comments);
      setSuccess('Expense report rejected');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject expense report');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    try {
      setUploadingReceipt(true);

      // For now, we'll create a data URL for the receipt
      // In production, this would upload to cloud storage and get back a URL
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          await expenseService.uploadReceipt(expenseId, dataUrl, file.name);
          setSuccess('Receipt uploaded successfully');
          fetchData();
          // Refresh the selected expense
          if (selectedExpense && selectedExpense._id === expenseId) {
            const updated = await expenseService.getExpenseById(expenseId);
            setSelectedExpense(updated);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to upload receipt');
        } finally {
          setUploadingReceipt(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploadingReceipt(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('Failed to upload receipt');
      setUploadingReceipt(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      categoryId: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      merchant: '',
      amount: 0,
      paymentMethod: 'card',
      isBillable: false,
      notes: '',
    });
    setSelectedExpense(null);
    setIsEditing(false);
  };

  const resetTravelForm = () => {
    setTravelForm({
      purpose: '',
      destination: '',
      startDate: '',
      endDate: '',
      estimatedBudget: 0,
    });
  };

  const resetReportForm = () => {
    setReportForm({
      title: '',
      description: '',
      selectedExpenses: [],
    });
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'approved': case 'reimbursed': return 'success';
      case 'pending': case 'submitted': case 'draft': return 'warning';
      case 'rejected': case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': case 'reimbursed': return <CheckCircle />;
      case 'rejected': case 'cancelled': return <Cancel />;
      default: return <Schedule />;
    }
  };

  const getEmployeeName = (employee: Expense['employeeId']) => {
    if (employee && typeof employee === 'object') {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return 'Unknown';
  };

  const getCategoryName = (category: Expense['categoryId']) => {
    if (category && typeof category === 'object') {
      return category.name;
    }
    if (typeof category === 'string') {
      const cat = categories.find(c => c._id === category);
      return cat?.name || 'Unknown';
    }
    return 'Unknown';
  };

  const getCategoryCode = (category: Expense['categoryId']) => {
    if (category && typeof category === 'object') {
      return category.code;
    }
    if (typeof category === 'string') {
      const cat = categories.find(c => c._id === category);
      return cat?.code || '';
    }
    return '';
  };

  if (loading && expenses.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={4000} onClose={() => setSuccess(null)}>
        <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expense Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} disabled={loading}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { resetExpenseForm(); setOpenExpenseDialog(true); }}>
            New Expense
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><AttachMoney /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Pending Approval</Typography>
                  <Typography variant="h5">${stats.totalPending?.toLocaleString() || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}><CheckCircle /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Approved This Month</Typography>
                  <Typography variant="h5">${stats.totalApproved?.toLocaleString() || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><Receipt /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Expenses</Typography>
                  <Typography variant="h5">{stats.totalExpenses || totalExpenses}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}><Schedule /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Pending Reports</Typography>
                  <Typography variant="h5">{stats.pendingReports || 0}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`Individual Expenses (${totalExpenses})`} />
          <Tab label={`Expense Reports (${totalReports})`} />
          <Tab label={`Travel Requests (${totalTravelRequests})`} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {expenses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>No expenses found</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => { resetExpenseForm(); setOpenExpenseDialog(true); }}>
                Add First Expense
              </Button>
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Receipts</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar>{getEmployeeName(expense.employeeId)[0]}</Avatar>
                          {getEmployeeName(expense.employeeId)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getCategoryIcon(getCategoryCode(expense.categoryId))}
                          {getCategoryName(expense.categoryId)}
                        </Box>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>${expense.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {expense.receipts && expense.receipts.length > 0 ? (
                          <Chip
                            label={`${expense.receipts.length}`}
                            color="success"
                            size="small"
                            icon={<Receipt />}
                          />
                        ) : (
                          <Chip
                            label="None"
                            color="default"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status}
                          color={getStatusColor(expense.status)}
                          size="small"
                          icon={getStatusIcon(expense.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View">
                          <IconButton size="small" onClick={() => handleViewExpense(expense)}>
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        {expense.status === 'draft' && (
                          <>
                            <Tooltip title="Upload Receipt">
                              <IconButton
                                size="small"
                                component="label"
                                color="primary"
                              >
                                <Upload />
                                <input
                                  type="file"
                                  hidden
                                  accept="image/*,application/pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleUploadReceipt(expense._id, file);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => handleEditExpense(expense)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDeleteExpense(expense._id)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={totalExpenses}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              />
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="outlined" startIcon={<Add />} onClick={() => { resetReportForm(); setOpenReportDialog(true); }}>
              Create Report
            </Button>
          </Box>
          {expenseReports.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>No expense reports</Typography>
              <Typography color="textSecondary" gutterBottom>Create a report to group expenses for approval</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Report Title</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenseReports.map((report) => (
                  <TableRow key={report._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar>
                          {report.employeeId && typeof report.employeeId === 'object' ? report.employeeId.firstName[0] : 'U'}
                        </Avatar>
                        {report.employeeId && typeof report.employeeId === 'object'
                          ? `${report.employeeId.firstName} ${report.employeeId.lastName}`
                          : 'Unknown'}
                      </Box>
                    </TableCell>
                    <TableCell>{report.title}</TableCell>
                    <TableCell>${report.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Chip label={report.status} color={getStatusColor(report.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => setSelectedReport(report)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {report.status === 'draft' && (
                        <Tooltip title="Submit">
                          <IconButton size="small" color="primary" onClick={() => handleSubmitReport(report._id)}>
                            <Send />
                          </IconButton>
                        </Tooltip>
                      )}
                      {report.status === 'submitted' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => handleApproveReport(report._id)}>
                              <CheckCircle />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" color="error" onClick={() => handleRejectReport(report._id)}>
                              <Cancel />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => { resetTravelForm(); setOpenTravelDialog(true); }}>
              Create Travel Request
            </Button>
          </Box>
          {travelRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Flight sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>No travel requests</Typography>
              <Typography color="textSecondary" gutterBottom>Submit a travel request for pre-approval</Typography>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Destination</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Est. Budget</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {travelRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar>
                          {request.employeeId && typeof request.employeeId === 'object' ? request.employeeId.firstName[0] : 'U'}
                        </Avatar>
                        {request.employeeId && typeof request.employeeId === 'object'
                          ? `${request.employeeId.firstName} ${request.employeeId.lastName}`
                          : 'Unknown'}
                      </Box>
                    </TableCell>
                    <TableCell>{request.purpose}</TableCell>
                    <TableCell>{request.destination}</TableCell>
                    <TableCell>
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${request.estimatedBudget?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      <Chip label={request.status} color={getStatusColor(request.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => setSelectedTravelRequest(request)}>
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {request.status === 'pending' && (
                        <Tooltip title="Approve">
                          <IconButton size="small" color="success" onClick={() => handleApproveTravelRequest(request._id)}>
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabPanel>
      </Card>

      {/* New/Edit Expense Dialog */}
      <Dialog open={openExpenseDialog} onClose={() => setOpenExpenseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        <DialogContent>
          {categories.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No expense categories found.
              <Button size="small" onClick={handleSeedCategories} sx={{ ml: 1 }}>
                Create Default Categories
              </Button>
            </Alert>
          ) : null}
          <FormControl fullWidth margin="normal">
            <InputLabel>Category *</InputLabel>
            <Select
              value={expenseForm.categoryId || ''}
              label="Category *"
              onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
              disabled={categories.length === 0}
            >
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getCategoryIcon(cat.code)}
                    {cat.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Description *"
            margin="normal"
            value={expenseForm.description || ''}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />
          <TextField
            fullWidth
            label="Merchant"
            margin="normal"
            value={expenseForm.merchant || ''}
            onChange={(e) => setExpenseForm({ ...expenseForm, merchant: e.target.value })}
          />
          <TextField
            fullWidth
            label="Amount *"
            type="number"
            margin="normal"
            value={expenseForm.amount || ''}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
            InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
          />
          <TextField
            fullWidth
            label="Date *"
            type="date"
            margin="normal"
            value={expenseForm.date || ''}
            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={expenseForm.paymentMethod || 'card'}
              label="Payment Method"
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="card">Personal Card</MenuItem>
              <MenuItem value="corporate_card">Corporate Card</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={expenseForm.isBillable || false}
                onChange={(e) => setExpenseForm({ ...expenseForm, isBillable: e.target.checked })}
              />
            }
            label="Billable to client"
          />
          <TextField
            fullWidth
            label="Notes"
            margin="normal"
            multiline
            rows={2}
            value={expenseForm.notes || ''}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExpenseDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateExpense} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : isEditing ? 'Update' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Expense Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Expense Details</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Category</Typography>
                  <Typography variant="body1">{getCategoryName(selectedExpense.categoryId)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Amount</Typography>
                  <Typography variant="body1">${selectedExpense.amount.toFixed(2)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Date</Typography>
                  <Typography variant="body1">{new Date(selectedExpense.date).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Status</Typography>
                  <Chip label={selectedExpense.status} color={getStatusColor(selectedExpense.status)} size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Description</Typography>
                  <Typography variant="body1">{selectedExpense.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Merchant</Typography>
                  <Typography variant="body1">{selectedExpense.merchant || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Payment Method</Typography>
                  <Typography variant="body1">{selectedExpense.paymentMethod}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Billable</Typography>
                  <Typography variant="body1">{selectedExpense.isBillable ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Receipts</Typography>
                  {selectedExpense.receipts && selectedExpense.receipts.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      {selectedExpense.receipts.map((receipt, idx) => (
                        <Chip key={idx} label={receipt.fileName} size="small" sx={{ mr: 1, mb: 1 }} />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                      No receipts uploaded
                    </Typography>
                  )}
                  {(selectedExpense.status === 'draft' || selectedExpense.status === 'submitted') && (
                    <Box sx={{ mt: 2 }}>
                      <input
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        id="receipt-upload"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && selectedExpense) {
                            handleUploadReceipt(selectedExpense._id, file);
                          }
                          e.target.value = '';
                        }}
                      />
                      <label htmlFor="receipt-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={uploadingReceipt ? <CircularProgress size={16} /> : <Upload />}
                          disabled={uploadingReceipt}
                          size="small"
                        >
                          {uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}
                        </Button>
                      </label>
                    </Box>
                  )}
                </Grid>
                {selectedExpense.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Notes</Typography>
                    <Typography variant="body1">{selectedExpense.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Travel Request Dialog */}
      <Dialog open={openTravelDialog} onClose={() => setOpenTravelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Travel Request</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Purpose *"
            margin="normal"
            value={travelForm.purpose || ''}
            onChange={(e) => setTravelForm({ ...travelForm, purpose: e.target.value })}
          />
          <TextField
            fullWidth
            label="Destination *"
            margin="normal"
            value={travelForm.destination || ''}
            onChange={(e) => setTravelForm({ ...travelForm, destination: e.target.value })}
          />
          <TextField
            fullWidth
            label="Start Date *"
            type="date"
            margin="normal"
            value={travelForm.startDate || ''}
            onChange={(e) => setTravelForm({ ...travelForm, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="End Date *"
            type="date"
            margin="normal"
            value={travelForm.endDate || ''}
            onChange={(e) => setTravelForm({ ...travelForm, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="Estimated Budget"
            type="number"
            margin="normal"
            value={travelForm.estimatedBudget || ''}
            onChange={(e) => setTravelForm({ ...travelForm, estimatedBudget: parseFloat(e.target.value) || 0 })}
            InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTravelDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTravelRequest} disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Expense Report Dialog */}
      <Dialog open={openReportDialog} onClose={() => setOpenReportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Expense Report</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Report Title *"
            margin="normal"
            value={reportForm.title || ''}
            onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={2}
            value={reportForm.description || ''}
            onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, mb: 1 }}>
            Select expenses to include:
          </Typography>
          {expenses.filter(e => e.status === 'draft').length === 0 ? (
            <Alert severity="info">No draft expenses available. Create expenses first.</Alert>
          ) : (
            expenses.filter(e => e.status === 'draft').map((expense) => (
              <FormControlLabel
                key={expense._id}
                control={
                  <Checkbox
                    checked={reportForm.selectedExpenses.includes(expense._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setReportForm({ ...reportForm, selectedExpenses: [...reportForm.selectedExpenses, expense._id] });
                      } else {
                        setReportForm({ ...reportForm, selectedExpenses: reportForm.selectedExpenses.filter(id => id !== expense._id) });
                      }
                    }}
                  />
                }
                label={`${expense.description} - $${expense.amount.toFixed(2)}`}
              />
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReportDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateExpenseReport} disabled={loading || reportForm.selectedExpenses.length === 0}>
            {loading ? <CircularProgress size={24} /> : 'Create Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
