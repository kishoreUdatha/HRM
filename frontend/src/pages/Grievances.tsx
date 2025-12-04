import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stepper,
  Step, StepLabel, Alert, FormControlLabel, Switch,
} from '@mui/material';
import {
  Add, Report, Search, Assignment, CheckCircle, Schedule, Warning,
  Visibility, Flag, ArrowForward, Security,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Grievances: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const grievances = [
    { id: 1, caseNumber: 'GRV-2024-00012', category: 'workplace_safety', severity: 'high', status: 'investigating', reporter: 'Anonymous', assignedTo: 'HR Team', date: '2024-01-15' },
    { id: 2, caseNumber: 'GRV-2024-00011', category: 'management', severity: 'medium', status: 'pending_action', reporter: 'John Smith', assignedTo: 'Sarah Wilson', date: '2024-01-14' },
    { id: 3, caseNumber: 'GRV-2024-00010', category: 'discrimination', severity: 'critical', status: 'escalated', reporter: 'Anonymous', assignedTo: 'Legal Team', date: '2024-01-12' },
    { id: 4, caseNumber: 'GRV-2024-00009', category: 'work_environment', severity: 'low', status: 'resolved', reporter: 'Jane Doe', assignedTo: 'Mike Brown', date: '2024-01-10' },
  ];

  const pipelineSteps = ['Submitted', 'Under Review', 'Investigating', 'Pending Action', 'Resolved', 'Closed'];

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'submitted': return 0;
      case 'under_review': return 1;
      case 'investigating': return 2;
      case 'pending_action': return 3;
      case 'resolved': return 4;
      case 'closed': return 5;
      case 'escalated': return 3;
      default: return 0;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': case 'closed': return 'success';
      case 'investigating': return 'info';
      case 'pending_action': return 'warning';
      case 'escalated': return 'error';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Grievance Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Report Grievance
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} icon={<Security />}>
        All grievances are handled with strict confidentiality. Anonymous reporting is available.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Report /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Open Cases</Typography>
                  <Typography variant="h5">8</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><Search /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Under Investigation</Typography>
                  <Typography variant="h5">3</Typography>
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
                  <Typography color="textSecondary" variant="body2">Resolved This Month</Typography>
                  <Typography variant="h5">12</Typography>
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
                  <Typography color="textSecondary" variant="body2">Avg Resolution Time</Typography>
                  <Typography variant="h5">5.2 days</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Cases" />
          <Tab label="My Cases" />
          <Tab label="Assigned to Me" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Case Number</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grievances.map((grievance) => (
                <TableRow key={grievance.id}>
                  <TableCell>
                    <Chip label={grievance.caseNumber} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{getCategoryLabel(grievance.category)}</TableCell>
                  <TableCell>
                    <Chip
                      label={grievance.severity}
                      color={getSeverityColor(grievance.severity)}
                      size="small"
                      icon={<Flag />}
                    />
                  </TableCell>
                  <TableCell>
                    {grievance.reporter === 'Anonymous' ? (
                      <Chip label="Anonymous" size="small" variant="outlined" icon={<Security />} />
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{grievance.reporter[0]}</Avatar>
                        {grievance.reporter}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{grievance.assignedTo}</TableCell>
                  <TableCell>{grievance.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={grievance.status.replace('_', ' ')}
                      color={getStatusColor(grievance.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><ArrowForward /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Report sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No cases submitted by you</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
              Report a Grievance
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No cases assigned to you</Typography>
          </Box>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Grievance</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Your report will be handled with strict confidentiality. You may choose to remain anonymous.
          </Alert>

          <FormControlLabel
            control={<Switch checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />}
            label="Submit Anonymously"
            sx={{ mb: 2 }}
          />

          <TextField select fullWidth label="Category" margin="normal" required>
            <MenuItem value="harassment">Harassment</MenuItem>
            <MenuItem value="discrimination">Discrimination</MenuItem>
            <MenuItem value="workplace_safety">Workplace Safety</MenuItem>
            <MenuItem value="policy_violation">Policy Violation</MenuItem>
            <MenuItem value="management">Management Issues</MenuItem>
            <MenuItem value="compensation">Compensation</MenuItem>
            <MenuItem value="work_environment">Work Environment</MenuItem>
            <MenuItem value="interpersonal">Interpersonal Conflict</MenuItem>
            <MenuItem value="ethics">Ethics Concern</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>

          <TextField select fullWidth label="Severity" margin="normal" required>
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </TextField>

          <TextField fullWidth label="Subject" margin="normal" required />

          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={4}
            required
            helperText="Please provide as much detail as possible"
          />

          <TextField
            fullWidth
            label="Incident Date"
            type="date"
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <TextField fullWidth label="Incident Location" margin="normal" />

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Case Progress</Typography>
            <Stepper activeStep={0} alternativeLabel>
              {pipelineSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Grievances;
