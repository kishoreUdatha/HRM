import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Table, TableBody,
  TableCell, TableHead, TableRow, Tabs, Tab, Avatar, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import {
  Add, Laptop, Smartphone, Monitor, Keyboard, Headset, Badge, Build,
  Assignment, CheckCircle, Schedule, Visibility, Edit, SwapHoriz,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Assets: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const assets = [
    { id: 1, tag: 'LAP-001', name: 'MacBook Pro 14"', category: 'laptop', status: 'assigned', assignedTo: 'John Smith', condition: 'good', value: 2499 },
    { id: 2, tag: 'LAP-002', name: 'Dell XPS 15', category: 'laptop', status: 'available', assignedTo: null, condition: 'excellent', value: 1899 },
    { id: 3, tag: 'MON-001', name: 'LG 27" 4K', category: 'monitor', status: 'assigned', assignedTo: 'Jane Doe', condition: 'good', value: 450 },
    { id: 4, tag: 'PHN-001', name: 'iPhone 15 Pro', category: 'mobile', status: 'assigned', assignedTo: 'Mike Brown', condition: 'excellent', value: 1199 },
    { id: 5, tag: 'HST-001', name: 'Jabra Evolve2', category: 'headset', status: 'maintenance', assignedTo: null, condition: 'fair', value: 299 },
  ];

  const assetRequests = [
    { id: 1, employee: 'Sarah Wilson', type: 'laptop', model: 'MacBook Pro', reason: 'New hire equipment', status: 'pending', date: '2024-01-15' },
    { id: 2, employee: 'Tom Harris', type: 'monitor', model: '27" 4K Monitor', reason: 'Additional display', status: 'approved', date: '2024-01-14' },
    { id: 3, employee: 'Lisa Chen', type: 'headset', model: 'Any', reason: 'WFH setup', status: 'fulfilled', date: '2024-01-10' },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'laptop': return <Laptop />;
      case 'mobile': return <Smartphone />;
      case 'monitor': return <Monitor />;
      case 'keyboard': return <Keyboard />;
      case 'headset': return <Headset />;
      case 'access_card': return <Badge />;
      default: return <Build />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'assigned': return 'primary';
      case 'maintenance': return 'warning';
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'fulfilled': return 'success';
      case 'retired': return 'error';
      default: return 'default';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Asset Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Assignment />}>Request Asset</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
            Add Asset
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}><Laptop /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Total Assets</Typography>
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
                <Avatar sx={{ bgcolor: 'success.main' }}><CheckCircle /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Available</Typography>
                  <Typography variant="h5">42</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}><SwapHoriz /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">Assigned</Typography>
                  <Typography variant="h5">198</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}><Build /></Avatar>
                <Box>
                  <Typography color="textSecondary" variant="body2">In Maintenance</Typography>
                  <Typography variant="h5">16</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="All Assets" />
          <Tab label="Asset Requests" />
          <Tab label="Maintenance" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset Tag</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Condition</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Chip label={asset.tag} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCategoryIcon(asset.category)}
                      {asset.name}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{asset.category}</TableCell>
                  <TableCell>
                    {asset.assignedTo ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{asset.assignedTo[0]}</Avatar>
                        {asset.assignedTo}
                      </Box>
                    ) : (
                      <Typography color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={asset.condition} color={getConditionColor(asset.condition)} size="small" />
                  </TableCell>
                  <TableCell>${asset.value.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={asset.status} color={getStatusColor(asset.status)} size="small" />
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
                <TableCell>Employee</TableCell>
                <TableCell>Asset Type</TableCell>
                <TableCell>Model/Preference</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assetRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar>{request.employee[0]}</Avatar>
                      {request.employee}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{request.type}</TableCell>
                  <TableCell>{request.model}</TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      color={getStatusColor(request.status)}
                      size="small"
                      icon={request.status === 'pending' ? <Schedule /> : <CheckCircle />}
                    />
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <>
                        <Button size="small" color="success">Approve</Button>
                        <Button size="small" color="error">Reject</Button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <Button size="small" color="primary">Fulfill</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Build sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Maintenance Schedule</Typography>
            <Typography color="textSecondary" gutterBottom>
              Track and manage asset maintenance schedules
            </Typography>
            <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }}>
              Schedule Maintenance
            </Button>
          </Box>
        </TabPanel>
      </Card>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Asset</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Asset Tag" margin="normal" />
          <TextField fullWidth label="Asset Name" margin="normal" />
          <TextField select fullWidth label="Category" margin="normal">
            <MenuItem value="laptop">Laptop</MenuItem>
            <MenuItem value="desktop">Desktop</MenuItem>
            <MenuItem value="mobile">Mobile</MenuItem>
            <MenuItem value="monitor">Monitor</MenuItem>
            <MenuItem value="keyboard">Keyboard</MenuItem>
            <MenuItem value="headset">Headset</MenuItem>
            <MenuItem value="access_card">Access Card</MenuItem>
            <MenuItem value="furniture">Furniture</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <TextField fullWidth label="Serial Number" margin="normal" />
          <TextField fullWidth label="Purchase Price" type="number" margin="normal" InputProps={{ startAdornment: '$' }} />
          <TextField fullWidth label="Purchase Date" type="date" margin="normal" InputLabelProps={{ shrink: true }} />
          <TextField select fullWidth label="Condition" margin="normal">
            <MenuItem value="excellent">Excellent</MenuItem>
            <MenuItem value="good">Good</MenuItem>
            <MenuItem value="fair">Fair</MenuItem>
            <MenuItem value="poor">Poor</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Assets;
