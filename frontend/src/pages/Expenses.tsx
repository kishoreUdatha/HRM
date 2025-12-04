import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  Add, Receipt, Flight, Restaurant, LocalTaxi, AttachMoney, Visibility,
  CheckCircle, Cancel, Schedule, Upload,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Expenses: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const expenses = [
    { id: 1, employee: 'John Smith', category: 'Travel', description: 'Flight to NYC', amount: 450, date: '2024-01-15', status: 'pending', icon: <Flight /> },
    { id: 2, employee: 'Jane Doe', category: 'Meals', description: 'Client dinner', amount: 120, date: '2024-01-14', status: 'approved', icon: <Restaurant /> },
    { id: 3, employee: 'Mike Brown', category: 'Transport', description: 'Uber rides', amount: 85, date: '2024-01-13', status: 'approved', icon: <LocalTaxi /> },
    { id: 4, employee: 'Sarah Wilson', category: 'Travel', description: 'Hotel stay', amount: 320, date: '2024-01-12', status: 'rejected', icon: <Flight /> },
  ];

  const expenseReports = [
    { id: 1, employee: 'John Smith', title: 'January Business Trip', total: 1250, items: 5, status: 'submitted', date: '2024-01-20' },
    { id: 2, employee: 'Jane Doe', title: 'Q4 Client Meetings', total: 890, items: 8, status: 'approved', date: '2024-01-18' },
    { id: 3, employee: 'Mike Brown', title: 'Conference Expenses', total: 2100, items: 12, status: 'processing', date: '2024-01-15' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': case 'submitted': case 'processing': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Schedule />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Expense Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Upload />}>Upload Receipt</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
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
                  <Typography variant="h5">$4,250</Typography>
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
                  <Typography variant="h5">$12,890</Typography>
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
                  <Typography variant="h5">156</Typography>
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
                  <Typography variant="h5">8</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Individual Expenses" />
          <Tab label="Expense Reports" />
          <Tab label="Travel Requests" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{expense.employee[0]}</Avatar>
                      {expense.employee}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {expense.icon}
                      {expense.category}
                    </Box>
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={expense.status}
                      color={getStatusColor(expense.status)}
                      size="small"
                      icon={getStatusIcon(expense.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    {expense.status === 'pending' && (
                      <>
                        <IconButton size="small" color="success"><CheckCircle /></IconButton>
                        <IconButton size="small" color="error"><Cancel /></IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Report Title</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total Amount</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenseReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{report.employee[0]}</Avatar>
                      {report.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{report.title}</TableCell>
                  <TableCell>{report.items} items</TableCell>
                  <TableCell>${report.total.toFixed(2)}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <Chip label={report.status} color={getStatusColor(report.status)} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Flight sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No pending travel requests</Typography>
            <Button variant="contained" startIcon={<Add />}>Create Travel Request</Button>
          </Box>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Category" margin="normal">
            <MenuItem value="travel">Travel</MenuItem>
            <MenuItem value="meals">Meals & Entertainment</MenuItem>
            <MenuItem value="transport">Transportation</MenuItem>
            <MenuItem value="supplies">Office Supplies</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField fullWidth label="Description" margin="normal" />
          <TextField fullWidth label="Amount" type="number" margin="normal" InputProps={{ startAdornment: '$' }} />
          <TextField fullWidth label="Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
          <Button variant="outlined" fullWidth startIcon={<Upload />} sx={{ mt: 2 }}>
            Upload Receipt
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
