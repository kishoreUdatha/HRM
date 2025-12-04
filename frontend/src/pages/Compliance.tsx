import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, LinearProgress,
  Alert, List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
} from '@mui/material';
import {
  Add, Policy, School, Description, Warning, CheckCircle, Schedule,
  Visibility, Download, Assignment, VerifiedUser, Gavel,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Compliance: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const policies = [
    { id: 1, name: 'Code of Conduct', version: '2.1', status: 'published', acknowledged: 245, total: 250, dueDate: '2024-02-28' },
    { id: 2, name: 'Data Privacy Policy', version: '1.3', status: 'published', acknowledged: 248, total: 250, dueDate: '2024-02-28' },
    { id: 3, name: 'Anti-Harassment Policy', version: '1.0', status: 'draft', acknowledged: 0, total: 250, dueDate: null },
    { id: 4, name: 'Remote Work Policy', version: '1.2', status: 'published', acknowledged: 220, total: 250, dueDate: '2024-03-15' },
  ];

  const trainings = [
    { id: 1, name: 'Security Awareness', type: 'mandatory', completion: 92, dueDate: '2024-01-31', status: 'active' },
    { id: 2, name: 'GDPR Compliance', type: 'mandatory', completion: 88, dueDate: '2024-02-15', status: 'active' },
    { id: 3, name: 'Workplace Safety', type: 'mandatory', completion: 100, dueDate: '2024-01-15', status: 'completed' },
    { id: 4, name: 'Diversity & Inclusion', type: 'recommended', completion: 65, dueDate: null, status: 'active' },
  ];

  const workPermits = [
    { id: 1, employee: 'Alex Chen', type: 'H1B Visa', expiryDate: '2024-06-30', status: 'valid', daysRemaining: 165 },
    { id: 2, employee: 'Maria Rodriguez', type: 'Work Permit', expiryDate: '2024-03-15', status: 'expiring', daysRemaining: 60 },
    { id: 3, employee: 'John Kim', type: 'Green Card', expiryDate: '2028-09-20', status: 'valid', daysRemaining: 1700 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': case 'active': case 'valid': return 'success';
      case 'draft': return 'default';
      case 'expiring': return 'warning';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Compliance Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Add Policy
        </Button>
      </Box>

      <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
        <strong>Action Required:</strong> 5 employees have not acknowledged the Code of Conduct policy. Due date: Feb 28, 2024
      </Alert>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Policy /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Active Policies</Typography>
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
                <Avatar sx={{ bgcolor: 'success.main' }}><VerifiedUser /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Compliance Rate</Typography>
                  <Typography variant="h5">94%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><School /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Training Completion</Typography>
                  <Typography variant="h5">87%</Typography>
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
                  <Typography color="textSecondary" variant="body2">Permits Expiring</Typography>
                  <Typography variant="h5">2</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Policies" icon={<Gavel />} iconPosition="start" />
          <Tab label="Training" icon={<School />} iconPosition="start" />
          <Tab label="Work Permits" icon={<Assignment />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Policy Name</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Acknowledgement</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Description color="primary" />
                      {policy.name}
                    </Box>
                  </TableCell>
                  <TableCell>v{policy.version}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(policy.acknowledged / policy.total) * 100}
                        sx={{ width: 100 }}
                      />
                      <Typography variant="body2">
                        {policy.acknowledged}/{policy.total}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{policy.dueDate || '-'}</TableCell>
                  <TableCell>
                    <Chip label={policy.status} color={getStatusColor(policy.status)} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><Download /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <List>
            {trainings.map((training) => (
              <ListItem key={training.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: training.type === 'mandatory' ? 'error.main' : 'info.main' }}>
                    <School />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={training.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Chip label={training.type} size="small" variant="outlined" />
                      {training.dueDate && <Typography variant="body2">Due: {training.dueDate}</Typography>}
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                  <Box sx={{ width: 100 }}>
                    <LinearProgress variant="determinate" value={training.completion} />
                  </Box>
                  <Typography variant="body2">{training.completion}%</Typography>
                </Box>
                <ListItemSecondaryAction>
                  <Chip
                    label={training.status}
                    color={getStatusColor(training.status)}
                    size="small"
                    icon={training.status === 'completed' ? <CheckCircle /> : <Schedule />}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Permit Type</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Days Remaining</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workPermits.map((permit) => (
                <TableRow key={permit.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{permit.employee[0]}</Avatar>
                      {permit.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{permit.type}</TableCell>
                  <TableCell>{permit.expiryDate}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${permit.daysRemaining} days`}
                      color={permit.daysRemaining < 90 ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={permit.status} color={getStatusColor(permit.status)} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Policy</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Policy Name" margin="normal" />
          <TextField select fullWidth label="Category" margin="normal">
            <MenuItem value="hr">HR Policy</MenuItem>
            <MenuItem value="security">Security Policy</MenuItem>
            <MenuItem value="compliance">Compliance</MenuItem>
            <MenuItem value="it">IT Policy</MenuItem>
          </TextField>
          <TextField fullWidth label="Description" margin="normal" multiline rows={3} />
          <TextField fullWidth label="Acknowledgement Due Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Compliance;
