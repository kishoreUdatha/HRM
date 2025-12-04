import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Grid, Tabs, Tab, Avatar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, List, ListItem, ListItemAvatar, ListItemText, Rating, LinearProgress,
} from '@mui/material';
import {
  Add, EmojiEvents, ThumbUp, Cake, WorkspacePremium, Poll, Celebration,
  Favorite, Star, TrendingUp, Comment,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>
);

const Engagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

  const recognitions = [
    { id: 1, from: 'John Smith', to: 'Jane Doe', badge: 'Team Player', message: 'Great collaboration on the project!', date: '2024-01-15', likes: 12 },
    { id: 2, from: 'Mike Brown', to: 'Sarah Wilson', badge: 'Innovation', message: 'Amazing solution to the performance issue!', date: '2024-01-14', likes: 8 },
    { id: 3, from: 'Lisa Chen', to: 'Tom Harris', badge: 'Customer Hero', message: 'Excellent customer service!', date: '2024-01-13', likes: 15 },
  ];

  const celebrations = [
    { id: 1, type: 'birthday', employee: 'John Smith', date: 'Jan 20', icon: <Cake /> },
    { id: 2, type: 'anniversary', employee: 'Jane Doe', date: 'Jan 22', years: 5, icon: <Celebration /> },
    { id: 3, type: 'birthday', employee: 'Mike Brown', date: 'Jan 25', icon: <Cake /> },
  ];

  const surveys = [
    { id: 1, name: 'Q1 Pulse Survey', responses: 180, total: 250, status: 'active', endDate: '2024-01-31' },
    { id: 2, name: 'Annual Engagement Survey', responses: 245, total: 250, status: 'completed', endDate: '2023-12-15' },
    { id: 3, name: 'Remote Work Feedback', responses: 120, total: 250, status: 'draft', endDate: null },
  ];

  const leaderboard = [
    { rank: 1, employee: 'Sarah Wilson', points: 2450, badges: 12 },
    { rank: 2, employee: 'Tom Harris', points: 2100, badges: 10 },
    { rank: 3, employee: 'Jane Doe', points: 1850, badges: 8 },
    { rank: 4, employee: 'John Smith', points: 1720, badges: 7 },
    { rank: 5, employee: 'Mike Brown', points: 1580, badges: 6 },
  ];

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Team Player': return 'primary';
      case 'Innovation': return 'secondary';
      case 'Customer Hero': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Employee Engagement</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenDialog(true)}>
          Give Recognition
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmojiEvents sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Recognitions This Month</Typography>
                  <Typography variant="h4">156</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Engagement Score</Typography>
                  <Typography variant="h4">78%</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Points Awarded</Typography>
                  <Typography variant="h4">45,200</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Celebration sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Upcoming Celebrations</Typography>
                  <Typography variant="h4">8</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
              <Tab label="Recognition Wall" icon={<ThumbUp />} iconPosition="start" />
              <Tab label="Surveys" icon={<Poll />} iconPosition="start" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <List>
                {recognitions.map((rec) => (
                  <ListItem key={rec.id} alignItems="flex-start" divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{rec.from[0]}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography component="span" fontWeight="bold">{rec.from}</Typography>
                          <Typography component="span" color="textSecondary">recognized</Typography>
                          <Typography component="span" fontWeight="bold">{rec.to}</Typography>
                          <Chip label={rec.badge} color={getBadgeColor(rec.badge)} size="small" icon={<WorkspacePremium />} />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="textPrimary" gutterBottom>
                            "{rec.message}"
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                            <Typography variant="caption" color="textSecondary">{rec.date}</Typography>
                            <Button size="small" startIcon={<Favorite />}>{rec.likes}</Button>
                            <Button size="small" startIcon={<Comment />}>Comment</Button>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <List>
                {surveys.map((survey) => (
                  <ListItem key={survey.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: survey.status === 'active' ? 'success.main' : 'grey.400' }}>
                        <Poll />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={survey.name}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(survey.responses / survey.total) * 100}
                              sx={{ width: 150 }}
                            />
                            <Typography variant="body2">{survey.responses}/{survey.total} responses</Typography>
                          </Box>
                          {survey.endDate && (
                            <Typography variant="caption" color="textSecondary">
                              {survey.status === 'active' ? 'Ends' : 'Ended'}: {survey.endDate}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={survey.status}
                      color={survey.status === 'active' ? 'success' : survey.status === 'completed' ? 'default' : 'warning'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <EmojiEvents sx={{ mr: 1, verticalAlign: 'middle' }} />
                Leaderboard
              </Typography>
              <List dense>
                {leaderboard.map((user) => (
                  <ListItem key={user.rank}>
                    <ListItemAvatar>
                      <Avatar sx={{
                        bgcolor: user.rank === 1 ? 'warning.main' : user.rank === 2 ? 'grey.400' : user.rank === 3 ? 'brown' : 'grey.200',
                        width: 32, height: 32, fontSize: 14
                      }}>
                        {user.rank}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.employee}
                      secondary={`${user.points} pts • ${user.badges} badges`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Celebration sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upcoming Celebrations
              </Typography>
              <List dense>
                {celebrations.map((item) => (
                  <ListItem key={item.id}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: item.type === 'birthday' ? 'secondary.main' : 'primary.main' }}>
                        {item.icon}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.employee}
                      secondary={
                        item.type === 'birthday'
                          ? `Birthday on ${item.date}`
                          : `${item.years} Year Anniversary on ${item.date}`
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Give Recognition</DialogTitle>
        <DialogContent>
          <TextField select fullWidth label="Recognize" margin="normal">
            <MenuItem value="1">Jane Doe</MenuItem>
            <MenuItem value="2">Mike Brown</MenuItem>
            <MenuItem value="3">Sarah Wilson</MenuItem>
          </TextField>
          <TextField select fullWidth label="Badge" margin="normal">
            <MenuItem value="team">Team Player</MenuItem>
            <MenuItem value="innovation">Innovation</MenuItem>
            <MenuItem value="customer">Customer Hero</MenuItem>
            <MenuItem value="leadership">Leadership</MenuItem>
            <MenuItem value="mentor">Mentor</MenuItem>
          </TextField>
          <TextField fullWidth label="Message" margin="normal" multiline rows={3} placeholder="What did they do great?" />
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Points to Award</Typography>
            <Rating value={3} max={5} />
            <Typography variant="caption" color="textSecondary"> × 10 points</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>Send Recognition</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Engagement;
