import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  Tooltip,
  MenuItem,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Title
} from 'chart.js';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend, Title);

const API_BASE_URL = 'http://localhost:5000';

const AdminManagement = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('reason');
  const [studentStats, setStudentStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStudentStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/od-requests/admin/student-stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudentStats(response.data);
      setStatsLoading(false);
    } catch (err) {
      console.error('Error fetching student stats:', err);
      setError(err.response?.data?.message || 'Failed to fetch student statistics');
      setStatsLoading(false);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/od-requests/admin/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.response?.data?.message || 'Failed to fetch requests');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudentStats();
    fetchAllRequests();
  }, []);

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchFieldChange = (event) => {
    setSearchField(event.target.value);
  };

  const filteredRequests = requests.filter(request => {
    if (!searchQuery) return true;
    const searchValue = searchQuery.toLowerCase();
    switch (searchField) {
      case 'student':
        return request.student?.name?.toLowerCase().includes(searchValue);
      case 'regno':
        return request.student?.registerNo?.toLowerCase().includes(searchValue);
      case 'event':
        return request.eventName?.toLowerCase().includes(searchValue);
      case 'year':
        // Match both numeric and ordinal (e.g., '3', '3rd', 'third')
        const yearStr = (request.year || '').toLowerCase();
        return yearStr.includes(searchValue) ||
          (searchValue === '1st' && yearStr === '1') ||
          (searchValue === '2nd' && yearStr === '2') ||
          (searchValue === '3rd' && yearStr === '3') ||
          (searchValue === '4th' && yearStr === '4');
      case 'academicYear':
        // Check eventDate year, startDate year, or endDate year
        const eventYear = request.eventDate ? new Date(request.eventDate).getFullYear().toString() : '';
        const startYear = request.startDate ? new Date(request.startDate).getFullYear().toString() : '';
        const endYear = request.endDate ? new Date(request.endDate).getFullYear().toString() : '';
        return (
          eventYear.includes(searchValue) ||
          startYear.includes(searchValue) ||
          endYear.includes(searchValue)
        );
      default:
        return true;
    }
  });

  const handleForwardToHod = async (requestId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/od-requests/${requestId}/forward-to-hod`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAllRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to forward request to HOD');
    }
  };

  const getTimeElapsed = (timestamp) => {
    if (!timestamp) return 'N/A';
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved_by_advisor':
        return 'success';
      case 'approved_by_hod':
        return 'success';
      case 'rejected':
        return 'error';
      case 'forwarded_to_admin':
        return 'warning';
      case 'forwarded_to_hod':
        return 'info';
      default:
        return 'default';
    }
  };

  // Calculate OD requests per year (from eventDate, startDate, or endDate)
  const odRequestsByYear = {};
  requests.forEach(req => {
    let year = '';
    if (req.eventDate) year = new Date(req.eventDate).getFullYear();
    else if (req.startDate) year = new Date(req.startDate).getFullYear();
    else if (req.endDate) year = new Date(req.endDate).getFullYear();
    if (year) {
      odRequestsByYear[year] = (odRequestsByYear[year] || 0) + 1;
    }
  });
  const odYears = Object.keys(odRequestsByYear).sort();
  const odCounts = odYears.map(y => odRequestsByYear[y]);

  // Pie chart for OD status (approved, rejected, pending, etc.)
  const statusCounts = requests.reduce((acc, req) => {
    const status = req.status?.replace(/_/g, ' ') || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statusLabels = Object.keys(statusCounts);
  const statusData = statusLabels.map(label => statusCounts[label]);
  const statusColors = ['#4caf50', '#f44336', '#ff9800', '#2196f3', '#9c27b0', '#607d8b'];

  const statusChartData = {
    labels: statusLabels,
    datasets: [
      {
        data: statusData,
        backgroundColor: statusColors,
        borderWidth: 1,
      },
    ],
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'OD Requests by Status',
        font: {
          size: 16
        }
      }
    }
  };

  const chartData = {
    labels: odYears.map(y => `Year ${y}`),
    datasets: [
      {
        data: odCounts,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'OD Requests by Year',
        font: {
          size: 16
        }
      }
    }
  };

  // PDF download handler
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('OD Requests', 14, 18);
    const tableColumn = [
      'Student Name',
      'Roll Number',
      'Department',
      'Event',
      'Date',
      'Reason',
      'Faculty Advisor',
      'Status',
      'Time Elapsed',
    ];
    const tableRows = filteredRequests.map(request => [
      request.student?.name || 'N/A',
      request.student?.registerNo || 'N/A',
      request.department || 'N/A',
      request.eventName || 'N/A',
      request.eventDate ? new Date(request.eventDate).toLocaleDateString() : 'N/A',
      request.reason || 'N/A',
      request.classAdvisor?.name || 'N/A',
      request.status?.replace(/_/g, ' '),
      getTimeElapsed(request.lastStatusChangeAt || request.createdAt),
    ]);
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 24 });
    doc.save('od-requests.pdf');
  };

  if (loading || statsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Admin Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              OD Requests by Year
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              {odYears.length > 0 ? (
                <Pie data={chartData} options={chartOptions} />
              ) : (
                <Alert severity="info">No OD request data available</Alert>
              )}
            </Box>
            {/* Statistics summary below the pie chart */}
            <Box sx={{ mt: 2 }}>
              {odYears.length > 0 ? (
                odYears.map((year, idx) => (
                  <Typography key={year} variant="body1" gutterBottom>
                    {`Year ${year}`}: {odCounts[idx]}
                  </Typography>
                ))
              ) : (
                <Alert severity="info">No statistics available</Alert>
              )}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              OD Requests by Status
            </Typography>
            <Box sx={{ height: 300, position: 'relative' }}>
              {statusLabels.length > 0 ? (
                <Pie data={statusChartData} options={statusChartOptions} />
              ) : (
                <Alert severity="info">No OD request status data available</Alert>
              )}
            </Box>
            {/* Statistics summary below the pie chart */}
            <Box sx={{ mt: 2 }}>
              {statusLabels.length > 0 ? (
                statusLabels.map((label, idx) => (
                  <Typography key={label} variant="body1" gutterBottom>
                    {label}: {statusCounts[label]}
                  </Typography>
                ))
              ) : (
                <Alert severity="info">No statistics available</Alert>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        All OD Requests
      </Typography>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleDownloadPDF}
        >
          Download PDF
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            select
            fullWidth
            value={searchField}
            onChange={handleSearchFieldChange}
            variant="outlined"
          >
            <MenuItem value="student">Search by Student Name</MenuItem>
            <MenuItem value="regno">Search by Register Number</MenuItem>
            <MenuItem value="year">Search by Year (e.g., 3rd, 2nd)</MenuItem>
            <MenuItem value="academicYear">Search by Academic Year (e.g., 2023)</MenuItem>
            <MenuItem value="event">Search by Event</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {filteredRequests.length === 0 ? (
        <Alert severity="info">No OD requests found.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell>Roll Number</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Faculty Advisor</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time Elapsed</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.student?.name || 'N/A'}</TableCell>
                  <TableCell>{request.student?.registerNo || 'N/A'}</TableCell>
                  <TableCell>{request.department || 'N/A'}</TableCell>
                  <TableCell>{request.eventName || 'N/A'}</TableCell>
                  <TableCell>
                    {request.eventDate ? new Date(request.eventDate).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={request.reason || 'No reason provided'}>
                      <Typography noWrap style={{ maxWidth: 200 }}>
                        {request.reason || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{request.classAdvisor?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status?.replace(/_/g, ' ') || 'N/A'}
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>
                    {getTimeElapsed(request.lastStatusChangeAt || request.createdAt)}
                  </TableCell>
                  <TableCell>
                    {request.status === 'forwarded_to_admin' && (
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleForwardToHod(request._id)}
                      >
                        Forward to HOD
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminManagement; 