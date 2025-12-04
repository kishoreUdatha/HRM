import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Button, Chip, Table, TableBody,
  TableCell, TableHead, TableRow, LinearProgress, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid,
} from '@mui/material';
import { Add, Visibility, CheckCircle, Schedule, Person } from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Onboarding: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const onboardingList = [
    { id: 1, employee: 'John Smith', position: 'Software Engineer', startDate: '2024-01-15', progress: 75, status: 'in_progress', buddy: 'Jane Doe' },
    { id: 2, employee: 'Sarah Johnson', position: 'Product Manager', startDate: '2024-01-20', progress: 30, status: 'in_progress', buddy: 'Mike Brown' },
    { id: 3, employee: 'Tom Wilson', position: 'Designer', startDate: '2024-01-08', progress: 100, status: 'completed', buddy: 'Lisa Chen' },
  ];

  const offboardingList = [
    { id: 1, employee: 'Alex Turner', position: 'Sales Rep', lastDay: '2024-02-15', progress: 50, status: 'in_progress', clearance: '3/5' },
    { id: 2, employee: 'Maria Garcia', position: 'HR Specialist', lastDay: '2024-02-28', progress: 20, status: 'pending', clearance: '1/5' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Onboarding & Offboarding</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          New Onboarding
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Active Onboardings</Typography>
              <Typography variant="h4">12</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Pending Tasks</Typography>
              <Typography variant="h4">28</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Active Offboardings</Typography>
              <Typography variant="h4">5</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Completed This Month</Typography>
              <Typography variant="h4">8</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Onboarding" icon={<Person />} iconPosition="start" />
          <Tab label="Offboarding" icon={<Schedule />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Buddy</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {onboardingList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{item.employee[0]}</Avatar>
                      {item.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.startDate}</TableCell>
                  <TableCell>{item.buddy}</TableCell>
                  <TableCell sx={{ width: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={item.progress} sx={{ flexGrow: 1 }} />
                      <Typography variant="body2">{item.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.status.replace('_', ' ')} color={getStatusColor(item.status)} size="small" />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small"><Visibility /></IconButton>
                    <IconButton size="small"><CheckCircle /></IconButton>
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
                <TableCell>Position</TableCell>
                <TableCell>Last Day</TableCell>
                <TableCell>Clearance</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offboardingList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{item.employee[0]}</Avatar>
                      {item.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{item.position}</TableCell>
                  <TableCell>{item.lastDay}</TableCell>
                  <TableCell>{item.clearance}</TableCell>
                  <TableCell sx={{ width: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={item.progress} sx={{ flexGrow: 1 }} />
                      <Typography variant="body2">{item.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={item.status.replace('_', ' ')} color={getStatusColor(item.status)} size="small" />
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
        <DialogTitle>Create New Onboarding</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Employee" margin="normal">
            <MenuItem value="1">New Hire 1</MenuItem>
            <MenuItem value="2">New Hire 2</MenuItem>
          </TextField>
          <TextField select fullWidth label="Onboarding Template" margin="normal">
            <MenuItem value="eng">Engineering Onboarding</MenuItem>
            <MenuItem value="sales">Sales Onboarding</MenuItem>
            <MenuItem value="general">General Onboarding</MenuItem>
          </TextField>
          <TextField select fullWidth label="Assign Buddy" margin="normal">
            <MenuItem value="1">Jane Doe</MenuItem>
            <MenuItem value="2">Mike Brown</MenuItem>
          </TextField>
          <TextField fullWidth label="Start Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Onboarding;
