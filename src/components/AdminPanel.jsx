import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import './AdminPanel.css';

const AdminPanel = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/applications');
      const result = await response.json();
      
      if (result.success) {
        setSubmissions(result.data);
      } else {
        console.error('Failed to fetch submissions:', result.message);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         submission.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || submission.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        const updatedSubmissions = submissions.map(sub => 
          sub.id === id ? { ...sub, status: newStatus } : sub
        );
        setSubmissions(updatedSubmissions);
        if (selectedSubmission?.id === id) {
          setSelectedSubmission({ ...selectedSubmission, status: newStatus });
        }
      } else {
        alert('Failed to update status: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const deleteSubmission = async (id) => {
    if (window.confirm('Are you sure you want to delete this submission?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/applications/${id}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
          const updatedSubmissions = submissions.filter(sub => sub.id !== id);
          setSubmissions(updatedSubmissions);
          if (selectedSubmission?.id === id) {
            setSelectedSubmission(null);
          }
        } else {
          alert('Failed to delete submission: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting submission:', error);
        alert('Error deleting submission. Please try again.');
      }
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Father Name', 'Email', 'Phone', 'Position', 'Experience', 'Status', 'Submitted Date'],
      ...submissions.map(sub => [
        sub.full_name,
        sub.father_name || '',
        sub.email,
        sub.phone,
        sub.position,
        sub.experience,
        sub.status || 'pending',
        new Date(sub.submitted_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Analytics functions
  const getStatusDistribution = () => {
    const statusCounts = submissions.reduce((acc, sub) => {
      const status = sub.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'pending' ? '#ffa726' : 
             status === 'reviewed' ? '#42a5f5' : 
             status === 'shortlisted' ? '#66bb6a' : '#ef5350'
    }));
  };

  const getApplicationsOverTime = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyCounts = last30Days.map(date => {
      const count = submissions.filter(sub => 
        new Date(sub.submitted_at).toISOString().split('T')[0] === date
      ).length;
      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        applications: count
      };
    });

    return dailyCounts;
  };

  const getEducationDistribution = () => {
    const educationCounts = {};
    
    submissions.forEach(sub => {
      if (sub.educations && sub.educations.length > 0) {
        sub.educations.forEach(edu => {
          const level = edu.education || 'Not specified';
          educationCounts[level] = (educationCounts[level] || 0) + 1;
        });
      }
    });

    return Object.entries(educationCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([education, count]) => ({
        education: education.length > 20 ? education.substring(0, 20) + '...' : education,
        count
      }));
  };

  const getPositionDistribution = () => {
    const positionCounts = submissions.reduce((acc, sub) => {
      const position = sub.position || 'Not specified';
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(positionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([position, count]) => ({
        position: position.length > 25 ? position.substring(0, 25) + '...' : position,
        count
      }));
  };

  const getExperienceDistribution = () => {
    const experienceCounts = submissions.reduce((acc, sub) => {
      const experience = sub.experience || 'Not specified';
      acc[experience] = (acc[experience] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(experienceCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([experience, count]) => ({
        experience,
        count
      }));
  };

  const getAnalyticsStats = () => {
    const total = submissions.length;
    const pending = submissions.filter(sub => (sub.status || 'pending') === 'pending').length;
    const reviewed = submissions.filter(sub => sub.status === 'reviewed').length;
    const shortlisted = submissions.filter(sub => sub.status === 'shortlisted').length;
    const rejected = submissions.filter(sub => sub.status === 'rejected').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayApplications = submissions.filter(sub => 
      new Date(sub.submitted_at).toISOString().split('T')[0] === today
    ).length;

    const thisWeek = submissions.filter(sub => {
      const subDate = new Date(sub.submitted_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return subDate >= weekAgo;
    }).length;

    return {
      total,
      pending,
      reviewed,
      shortlisted,
      rejected,
      todayApplications,
      thisWeek
    };
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>Admin Panel - Job Applications</h1>
        <div className="header-actions">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
              onClick={() => setActiveTab('applications')}
            >
              📋 Applications ({submissions.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              📊 Analytics
            </button>
          </div>
          {activeTab === 'applications' && (
            <button onClick={exportToCSV} className="export-btn">
              📥 Export to CSV
            </button>
          )}
        </div>
      </header>

      <div className="admin-container">
        {activeTab === 'applications' ? (
          <>
            {/* Left Sidebar - List of Submissions */}
            <div className="submissions-list">
              <div className="search-filter">
                <input
                  type="text"
                  placeholder="Search by name, email, position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="submissions-items">
                {loading ? (
                  <div className="no-submissions">Loading applications...</div>
                ) : filteredSubmissions.length === 0 ? (
                  <div className="no-submissions">No applications found</div>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <div
                      key={submission.id}
                      className={`submission-item ${selectedSubmission?.id === submission.id ? 'active' : ''}`}
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <div className="submission-header">
                        <h3>{submission.full_name}</h3>
                        <span className={`status-badge ${submission.status || 'pending'}`}>
                          {submission.status || 'pending'}
                        </span>
                      </div>
                      <p className="submission-info">{submission.position}</p>
                      <p className="submission-date">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel - Submission Details */}
            <div className="submission-details">
              {selectedSubmission ? (
                <>
                  <div className="details-header">
                    <h2>{selectedSubmission.full_name}</h2>
                    <div className="action-buttons">
                      <select
                        value={selectedSubmission.status || 'pending'}
                        onChange={(e) => updateStatus(selectedSubmission.id, e.target.value)}
                        className="status-dropdown"
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button 
                        onClick={() => deleteSubmission(selectedSubmission.id)}
                        className="delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <div className="details-content">
                    {/* Personal Information */}
                    <section className="detail-section">
                      <h3>Personal Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Full Name:</label>
                          <span>{selectedSubmission.full_name}</span>
                        </div>
                        <div className="detail-item">
                          <label>Father Name:</label>
                          <span>{selectedSubmission.father_name || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Email:</label>
                          <span>{selectedSubmission.email}</span>
                        </div>
                        <div className="detail-item">
                          <label>Phone:</label>
                          <span>{selectedSubmission.phone}</span>
                        </div>
                      </div>
                    </section>

                    {/* Address Information */}
                    <section className="detail-section">
                      <h3>Address Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item full-width">
                          <label>Permanent Address:</label>
                          <span>{selectedSubmission.permanent_address || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>City:</label>
                          <span>{selectedSubmission.permanent_city || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>State:</label>
                          <span>{selectedSubmission.permanent_state || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Country:</label>
                          <span>{selectedSubmission.permanent_country || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div className="detail-item full-width">
                          <label>Current Address:</label>
                          <span>{selectedSubmission.current_address || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>City:</label>
                          <span>{selectedSubmission.current_city || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>State:</label>
                          <span>{selectedSubmission.current_state || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Country:</label>
                          <span>{selectedSubmission.current_country || 'N/A'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Education Details */}
                    <section className="detail-section">
                      <h3>Education Details</h3>
                      {selectedSubmission.educations && selectedSubmission.educations.length > 0 ? (
                        selectedSubmission.educations.map((edu, index) => (
                          <div key={index} className="education-item">
                            <h4>Education {index + 1}</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <label>Level:</label>
                                <span>{edu.education || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Stream:</label>
                                <span>{edu.stream || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Course:</label>
                                <span>{edu.course || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Branch:</label>
                                <span>{edu.branch || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>School/College:</label>
                                <span>{edu.school_name || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Percentage:</label>
                                <span>{edu.percentage || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Year:</label>
                                <span>{edu.passing_year || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No education details provided</p>
                      )}
                    </section>

                    {/* Job Details */}
                    <section className="detail-section">
                      <h3>Job Details</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Position Applied:</label>
                          <span>{selectedSubmission.position || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Experience:</label>
                          <span>{selectedSubmission.experience || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Availability:</label>
                          <span>{selectedSubmission.availability || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Expected Salary:</label>
                          <span>{selectedSubmission.expected_salary || 'N/A'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Work Experience */}
                    <section className="detail-section">
                      <h3>Work Experience</h3>
                      {selectedSubmission.is_fresher ? (
                        <p>Fresher - No work experience</p>
                      ) : selectedSubmission.work_experiences && selectedSubmission.work_experiences.length > 0 ? (
                        selectedSubmission.work_experiences.map((exp, index) => (
                          <div key={index} className="experience-item">
                            <h4>Experience {index + 1}</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <label>Company:</label>
                                <span>{exp.company || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Job Title:</label>
                                <span>{exp.job_title || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Start Date:</label>
                                <span>{exp.start_date || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>End Date:</label>
                                <span>{exp.currently_working ? 'Present' : exp.end_date || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Department:</label>
                                <span>{exp.department || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <label>Freelancing:</label>
                                <span>{exp.freelancing || 'N/A'}</span>
                              </div>
                              <div className="detail-item full-width">
                                <label>Description:</label>
                                <span>{exp.description || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No work experience provided</p>
                      )}
                    </section>

                    {/* Additional Information */}
                    <section className="detail-section">
                      <h3>Additional Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item full-width">
                          <label>Cover Letter:</label>
                          <span>{selectedSubmission.cover_letter || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>LinkedIn:</label>
                          <span>{selectedSubmission.linkedin || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Portfolio:</label>
                          <span>{selectedSubmission.portfolio || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Resume:</label>
                          <span>{selectedSubmission.resume_path ? '✓ Uploaded' : 'Not uploaded'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Aadhar Card:</label>
                          <span>{selectedSubmission.aadhar_card_path ? '✓ Uploaded' : 'Not uploaded'}</span>
                        </div>
                        <div className="detail-item">
                          <label>PAN Card:</label>
                          <span>{selectedSubmission.pan_card_path ? '✓ Uploaded' : 'Not uploaded'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Passport:</label>
                          <span>{selectedSubmission.passport_path ? '✓ Uploaded' : 'Not uploaded'}</span>
                        </div>
                      </div>
                    </section>

                    {/* Submission Info */}
                    <section className="detail-section">
                      <h3>Submission Information</h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Submitted On:</label>
                          <span>{new Date(selectedSubmission.submitted_at).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <label>Application ID:</label>
                          <span>{selectedSubmission.id}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <h2>Select an application to view details</h2>
                  <p>Choose from the list on the left</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Analytics Dashboard */
          <div className="analytics-dashboard">
            {loading ? (
              <div className="loading-analytics">Loading analytics...</div>
            ) : (
              <>
                {/* Statistics Cards */}
                <div className="stats-cards">
                  {(() => {
                    const stats = getAnalyticsStats();
                    return (
                      <>
                        <div className="stat-card">
                          <h3>Total Applications</h3>
                          <div className="stat-value">{stats.total}</div>
                        </div>
                        <div className="stat-card">
                          <h3>Pending Review</h3>
                          <div className="stat-value pending">{stats.pending}</div>
                        </div>
                        <div className="stat-card">
                          <h3>Reviewed</h3>
                          <div className="stat-value reviewed">{stats.reviewed}</div>
                        </div>
                        <div className="stat-card">
                          <h3>Shortlisted</h3>
                          <div className="stat-value shortlisted">{stats.shortlisted}</div>
                        </div>
                        <div className="stat-card">
                          <h3>Rejected</h3>
                          <div className="stat-value rejected">{stats.rejected}</div>
                        </div>
                        <div className="stat-card">
                          <h3>Today</h3>
                          <div className="stat-value">{stats.todayApplications}</div>
                        </div>
                        <div className="stat-card">
                          <h3>This Week</h3>
                          <div className="stat-value">{stats.thisWeek}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Charts Grid */}
                <div className="charts-grid">
                  {/* Status Distribution Pie Chart */}
                  <div className="chart-container">
                    <h3>Application Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getStatusDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getStatusDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Applications Over Time */}
                  <div className="chart-container">
                    <h3>Applications Over Last 30 Days</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getApplicationsOverTime()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="applications" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Education Distribution */}
                  <div className="chart-container">
                    <h3>Education Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getEducationDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="education" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Position Distribution */}
                  <div className="chart-container">
                    <h3>Position Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getPositionDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="position" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Experience Distribution */}
                  <div className="chart-container full-width">
                    <h3>Experience Level Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getExperienceDistribution()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="experience" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ff7300" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
