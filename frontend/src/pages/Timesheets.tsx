import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, LinearProgress,
} from '@mui/material';
import {
  Add, Timer, PlayArrow, Stop, Send, CheckCircle, Schedule, AccessTime,
  Assignment, TrendingUp,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Timesheets: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentWeekData = [
    { project: 'Project Alpha', hours: [8, 8, 7, 8, 6, 0, 0], total: 37 },
    { project: 'Project Beta', hours: [0, 0, 1, 0, 2, 0, 0], total: 3 },
    { project: 'Internal Meeting', hours: [0.5, 0.5, 0.5, 0.5, 0.5, 0, 0], total: 2.5 },
  ];

  const pendingTimesheets = [
    { id: 1, employee: 'John Smith', week: 'Jan 15 - Jan 21', hours: 42, status: 'submitted' },
    { id: 2, employee: 'Jane Doe', week: 'Jan 15 - Jan 21', hours: 40, status: 'submitted' },
    { id: 3, employee: 'Mike Brown', week: 'Jan 15 - Jan 21', hours: 45, status: 'pending' },
  ];

  const projects = [
    { id: 1, name: 'Project Alpha', client: 'Acme Corp', budget: 200, used: 156, members: 5 },
    { id: 2, name: 'Project Beta', client: 'Tech Inc', budget: 100, used: 45, members: 3 },
    { id: 3, name: 'Internal Tools', client: 'Internal', budget: 50, used: 32, members: 2 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Timesheets</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={timerRunning ? 'contained' : 'outlined'}
            color={timerRunning ? 'error' : 'primary'}
            startIcon={timerRunning ? <Stop /> : <PlayArrow />}
            onClick={() => setTimerRunning(!timerRunning)}
          >
            {timerRunning ? 'Stop Timer' : 'Start Timer'}
          </Button>
          <Button variant="contained" startIcon={<Send />}>Submit Week</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Timer /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">This Week</Typography>
                  <Typography variant="h5">42.5 hrs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}><TrendingUp /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Utilization</Typography>
                  <Typography variant="h5">85%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><Assignment /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Active Projects</Typography>
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
                <Avatar sx={{ bgcolor: 'warning.main' }}><AccessTime /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Overtime</Typography>
                  <Typography variant="h5">2.5 hrs</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="My Timesheet" />
          <Tab label="Pending Approvals" />
          <Tab label="Projects" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Project</TableCell>
                {weekDays.map((day) => (
                  <TableCell key={day} align="center">{day}</TableCell>
                ))}
                <TableCell align="center">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentWeekData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.project}</TableCell>
                  {row.hours.map((hours, idx) => (
                    <TableCell key={idx} align="center">
                      <TextField
                        size="small"
                        type="number"
                        defaultValue={hours}
                        sx={{ width: 60 }}
                        inputProps={{ min: 0, max: 24, step: 0.5 }}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Chip label={`${row.total} hrs`} color="primary" size="small" />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell><strong>Daily Total</strong></TableCell>
                {weekDays.map((_, idx) => (
                  <TableCell key={idx} align="center">
                    <strong>
                      {currentWeekData.reduce((sum, row) => sum + row.hours[idx], 0)}
                    </strong>
                  </TableCell>
                ))}
                <TableCell align="center">
                  <Chip
                    label={`${currentWeekData.reduce((sum, row) => sum + row.total, 0)} hrs`}
                    color="success"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
              Add Project
            </Button>
            <Button variant="contained" startIcon={<Send />}>Submit Timesheet</Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Week</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingTimesheets.map((ts) => (
                <TableRow key={ts.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{ts.employee[0]}</Avatar>
                      {ts.employee}
                    </Box>
                  </TableCell>
                  <TableCell>{ts.week}</TableCell>
                  <TableCell>{ts.hours} hrs</TableCell>
                  <TableCell>
                    <Chip
                      label={ts.status}
                      color={ts.status === 'submitted' ? 'warning' : 'default'}
                      size="small"
                      icon={ts.status === 'submitted' ? <Schedule /> : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="success" startIcon={<CheckCircle />}>Approve</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid item xs={12} md={4} key={project.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{project.name}</Typography>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {project.client}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Budget Usage</Typography>
                        <Typography variant="body2">{project.used}/{project.budget} hrs</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(project.used / project.budget) * 100}
                        color={project.used / project.budget > 0.9 ? 'error' : 'primary'}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2 }}>{project.members} team members</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Project to Timesheet</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Project" margin="normal">
            <MenuItem value="1">Project Gamma</MenuItem>
            <MenuItem value="2">Support Tasks</MenuItem>
            <MenuItem value="3">Training</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Timesheets;
