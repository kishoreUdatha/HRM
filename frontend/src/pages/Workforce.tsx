import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, LinearProgress,
} from '@mui/material';
import {
  Add, People, TrendingUp, Assessment, Timeline, Visibility, Edit,
  AccountTree, Work, PersonAdd, Warning,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Workforce: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const positions = [
    { id: 1, title: 'Software Engineer', code: 'ENG-001', department: 'Engineering', budgeted: 25, filled: 22, vacant: 3, salaryMin: 80000, salaryMax: 150000 },
    { id: 2, title: 'Product Manager', code: 'PM-001', department: 'Product', budgeted: 8, filled: 7, vacant: 1, salaryMin: 100000, salaryMax: 180000 },
    { id: 3, title: 'UX Designer', code: 'DSN-001', department: 'Design', budgeted: 6, filled: 6, vacant: 0, salaryMin: 70000, salaryMax: 130000 },
    { id: 4, title: 'Sales Representative', code: 'SLS-001', department: 'Sales', budgeted: 15, filled: 12, vacant: 3, salaryMin: 50000, salaryMax: 90000 },
  ];

  const successionPlans = [
    { id: 1, position: 'VP of Engineering', incumbent: 'John Smith', riskLevel: 'high', vacancyRisk: 'near_term', successors: 2 },
    { id: 2, position: 'Head of Product', incumbent: 'Jane Doe', riskLevel: 'medium', vacancyRisk: 'long_term', successors: 3 },
    { id: 3, position: 'CFO', incumbent: 'Mike Brown', riskLevel: 'critical', vacancyRisk: 'imminent', successors: 1 },
    { id: 4, position: 'CTO', incumbent: 'Sarah Wilson', riskLevel: 'low', vacancyRisk: 'none', successors: 4 },
  ];

  const headcountPlans = [
    { id: 1, name: 'FY2024 Engineering Growth', fiscalYear: 2024, department: 'Engineering', currentHeadcount: 45, plannedHires: 15, status: 'approved' },
    { id: 2, name: 'FY2024 Sales Expansion', fiscalYear: 2024, department: 'Sales', currentHeadcount: 25, plannedHires: 10, status: 'active' },
    { id: 3, name: 'FY2025 Product Team', fiscalYear: 2025, department: 'Product', currentHeadcount: 12, plannedHires: 5, status: 'draft' },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getVacancyRiskLabel = (risk: string) => {
    switch (risk) {
      case 'imminent': return 'Imminent (< 6 months)';
      case 'near_term': return 'Near Term (6-12 months)';
      case 'long_term': return 'Long Term (1-2 years)';
      case 'none': return 'No Risk';
      default: return risk;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Workforce Planning</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<AccountTree />}>Org Chart</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            New Plan
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><People /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Headcount</Typography>
                  <Typography variant="h5">256</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}><Work /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Open Positions</Typography>
                  <Typography variant="h5">18</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><PersonAdd /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Planned Hires (FY)</Typography>
                  <Typography variant="h5">45</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}><Warning /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">High Risk Positions</Typography>
                  <Typography variant="h5">4</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Positions" icon={<Work />} iconPosition="start" />
          <Tab label="Succession Planning" icon={<Timeline />} iconPosition="start" />
          <Tab label="Headcount Plans" icon={<Assessment />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Position</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Headcount</TableCell>
                <TableCell>Salary Range</TableCell>
                <TableCell>Fill Rate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell>{position.title}</TableCell>
                  <TableCell>
                    <Chip label={position.code} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{position.department}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {position.filled} / {position.budgeted}
                        {position.vacant > 0 && (
                          <Chip label={`${position.vacant} vacant`} size="small" color="warning" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    ${position.salaryMin.toLocaleString()} - ${position.salaryMax.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ width: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(position.filled / position.budgeted) * 100}
                        sx={{ flexGrow: 1 }}
                        color={position.filled === position.budgeted ? 'success' : 'primary'}
                      />
                      <Typography variant="body2">
                        {Math.round((position.filled / position.budgeted) * 100)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><Edit /></IconButton>
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
                <TableCell>Position</TableCell>
                <TableCell>Current Incumbent</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Vacancy Risk</TableCell>
                <TableCell>Ready Successors</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {successionPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.position}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{plan.incumbent[0]}</Avatar>
                      {plan.incumbent}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={plan.riskLevel} color={getRiskColor(plan.riskLevel)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getVacancyRiskLabel(plan.vacancyRisk)}
                      variant="outlined"
                      size="small"
                      color={plan.vacancyRisk === 'imminent' ? 'error' : plan.vacancyRisk === 'near_term' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${plan.successors} candidates`}
                      color={plan.successors >= 3 ? 'success' : plan.successors >= 2 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><Edit /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {headcountPlans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6">{plan.name}</Typography>
                        <Chip label={`FY${plan.fiscalYear}`} size="small" sx={{ mt: 1 }} />
                      </Box>
                      <Chip
                        label={plan.status}
                        color={plan.status === 'active' ? 'success' : plan.status === 'approved' ? 'info' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {plan.department}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Current</Typography>
                        <Typography variant="h6">{plan.currentHeadcount}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUp color="success" />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Planned</Typography>
                        <Typography variant="h6" color="success.main">+{plan.plannedHires}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button size="small" startIcon={<Visibility />}>View</Button>
                      <Button size="small" startIcon={<Edit />}>Edit</Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Headcount Plan</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Plan Name" margin="normal" />
          <TextField select fullWidth label="Fiscal Year" margin="normal">
            <MenuItem value="2024">FY 2024</MenuItem>
            <MenuItem value="2025">FY 2025</MenuItem>
            <MenuItem value="2026">FY 2026</MenuItem>
          </TextField>
          <TextField select fullWidth label="Department" margin="normal">
            <MenuItem value="eng">Engineering</MenuItem>
            <MenuItem value="product">Product</MenuItem>
            <MenuItem value="sales">Sales</MenuItem>
            <MenuItem value="marketing">Marketing</MenuItem>
            <MenuItem value="hr">Human Resources</MenuItem>
          </TextField>
          <TextField fullWidth label="Current Headcount" type="number" margin="normal" />
          <TextField fullWidth label="Planned Hires" type="number" margin="normal" />
          <TextField fullWidth label="Budget Amount" type="number" margin="normal" InputProps={{ startAdornment: '$' }} />
          <TextField fullWidth label="Assumptions" margin="normal" multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Create Plan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Workforce;
