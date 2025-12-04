import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, List, ListItem,
  ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
  Add, HealthAndSafety, LocalHospital, Savings, FitnessCenter, Edit, Delete,
  CheckCircle, Schedule, Visibility,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Benefits: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const benefitPlans = [
    { id: 1, name: 'Premium Health Plan', type: 'health', coverage: 'Family', premium: 450, enrolled: 156, icon: <HealthAndSafety /> },
    { id: 2, name: 'Basic Health Plan', type: 'health', coverage: 'Individual', premium: 200, enrolled: 89, icon: <LocalHospital /> },
    { id: 3, name: '401(k) Retirement', type: 'retirement', matchPct: '6%', enrolled: 234, icon: <Savings /> },
    { id: 4, name: 'Wellness Program', type: 'wellness', benefit: '$500/year', enrolled: 178, icon: <FitnessCenter /> },
  ];

  const enrollments = [
    { id: 1, employee: 'John Smith', plan: 'Premium Health Plan', status: 'active', startDate: '2024-01-01', dependents: 3 },
    { id: 2, employee: 'Jane Doe', plan: '401(k) Retirement', status: 'active', startDate: '2023-06-01', contribution: '8%' },
    { id: 3, employee: 'Mike Brown', plan: 'Basic Health Plan', status: 'pending', startDate: '2024-02-01', dependents: 0 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Benefits Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Add Plan
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle2">Total Enrolled</Typography>
              <Typography variant="h4">657</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle2">Active Plans</Typography>
              <Typography variant="h4">12</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle2">Pending Enrollments</Typography>
              <Typography variant="h4">23</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Typography variant="subtitle2">Monthly Cost</Typography>
              <Typography variant="h4">$45,230</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Benefit Plans" />
          <Tab label="Enrollments" />
          <Tab label="Open Enrollment" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {benefitPlans.map((plan) => (
              <Grid item xs={12} md={6} lg={3} key={plan.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{plan.icon}</Avatar>
                      <Box>
                        <Typography variant="h6">{plan.name}</Typography>
                        <Chip label={plan.type} size="small" />
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <List dense>
                      {plan.coverage && (
                        <ListItem>
                          <ListItemText primary="Coverage" secondary={plan.coverage} />
                        </ListItem>
                      )}
                      {plan.premium && (
                        <ListItem>
                          <ListItemText primary="Monthly Premium" secondary={`$${plan.premium}`} />
                        </ListItem>
                      )}
                      {plan.matchPct && (
                        <ListItem>
                          <ListItemText primary="Company Match" secondary={plan.matchPct} />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemText primary="Enrolled" secondary={`${plan.enrolled} employees`} />
                      </ListItem>
                    </List>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <Button size="small" startIcon={<Edit />}>Edit</Button>
                      <Button size="small" startIcon={<Visibility />}>View</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{enrollment.employee[0]}</Avatar>
                      {enrollment.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{enrollment.plan}</TableCell>
                  <TableCell>{enrollment.startDate}</TableCell>
                  <TableCell>
                    {enrollment.dependents !== undefined && `${enrollment.dependents} dependents`}
                    {enrollment.contribution && `${enrollment.contribution} contribution`}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={enrollment.status}
                      color={enrollment.status === 'active' ? 'success' : 'warning'}
                      size="small"
                      icon={enrollment.status === 'active' ? <CheckCircle /> : <Schedule />}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Edit /></IconButton>
                    <IconButton size="small"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>Open Enrollment Period</Typography>
            <Typography color="textSecondary" gutterBottom>
              November 1 - November 30, 2024
            </Typography>
            <Chip label="Not Active" color="default" sx={{ mt: 2 }} />
          </Box>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Benefit Plan</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Plan Name" margin="normal" />
          <TextField select fullWidth label="Plan Type" margin="normal">
            <MenuItem value="health">Health Insurance</MenuItem>
            <MenuItem value="dental">Dental</MenuItem>
            <MenuItem value="vision">Vision</MenuItem>
            <MenuItem value="retirement">Retirement</MenuItem>
            <MenuItem value="wellness">Wellness</MenuItem>
          </TextField>
          <TextField fullWidth label="Description" margin="normal" multiline rows={3} />
          <TextField fullWidth label="Monthly Premium" type="number" margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Benefits;
