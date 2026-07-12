import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Briefcase, FileText, LayoutDashboard, Search, Upload, LogOut, CheckCircle, 
  XCircle, Clock, AlertCircle, RefreshCw, Send, Plus, Trash2, Award, 
  FileCheck, Sparkles, BookOpen, User as UserIcon, LogIn
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL 
  ? (import.meta.env.VITE_API_URL.endsWith('/api/v1') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1`)
  : 'http://localhost:8000/api/v1';

// Setup local Axios config
const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bridgesmart_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('bridgesmart_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('bridgesmart_user') || 'null'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSandbox, setIsSandbox] = useState(false);

  // Authentication State
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard & Application Data State
  const [stats, setStats] = useState({
    total_applied: 0,
    pending: 0,
    rejected: 0,
    interviews: 0,
    average_match_score: 0.0,
    applications: []
  });
  const [logs, setLogs] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Resume State
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [parsedProfile, setParsedProfile] = useState(null);
  const [resumeText, setResumeText] = useState('');

  // Job Search State
  const [searchKeywords, setSearchKeywords] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchRemote, setSearchRemote] = useState(false);
  const [searchingJobs, setSearchingJobs] = useState(false);
  const [jobResults, setJobResults] = useState([]);
  
  // Application details/Action state
  const [activeJobId, setActiveJobId] = useState(null);
  const [matchingJobId, setMatchingJobId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applyMessage, setApplyMessage] = useState(null);
  const [applyThreshold, setApplyThreshold] = useState(70);

  // Fallback Mock Data for sandbox mode
  const mockStats = {
    total_applied: 14,
    pending: 4,
    rejected: 8,
    interviews: 2,
    average_match_score: 84.5,
    applications: [
      {
        id: 101,
        status: "applied",
        applied_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        match_score: 88,
        cover_letter: "Mock cover letter...",
        job: { id: 1, title: "Senior Python Developer", company: "Indeed LLC", location: "Austin, TX", work_type: "Remote" }
      },
      {
        id: 102,
        status: "interview",
        applied_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        match_score: 92,
        cover_letter: "Mock cover letter...",
        job: { id: 4, title: "Full Stack Software Engineer", company: "JPMorgan Chase & Co.", location: "New York, NY", work_type: "Hybrid" }
      },
      {
        id: 103,
        status: "pending",
        applied_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        match_score: 74,
        cover_letter: "Mock cover letter...",
        job: { id: 2, title: "React Frontend Engineer", company: "TechFetch Services", location: "San Jose, CA", work_type: "Hybrid" }
      },
      {
        id: 104,
        status: "rejected",
        applied_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        match_score: 81,
        cover_letter: "Mock cover letter...",
        job: { id: 3, title: "Systems Analyst", company: "Infosys Ltd", location: "Dallas, TX", work_type: "Onsite" }
      }
    ]
  };

  const mockLogs = [
    { id: 1, action: "Upload Resume", details: "Uploaded resume_johndoe.pdf. Extracted 8 key skills.", timestamp: new Date().toISOString() },
    { id: 2, action: "Search Jobs", details: "Searched keywords: 'Python Developer', Location: 'Remote'. Found 10 matching jobs.", timestamp: new Date(Date.now() - 100000).toISOString() },
    { id: 3, action: "Match Job", details: "Matched resume against 'Senior Python Developer' at Indeed. Match Score: 88%.", timestamp: new Date(Date.now() - 250000).toISOString() },
    { id: 4, action: "Apply Job", details: "Automated application submitted for Indeed. API execution: Success.", timestamp: new Date(Date.now() - 300000).toISOString() },
  ];

  const mockProfile = {
    name: "John Doe",
    email: "johndoe@gmail.com",
    phone: "+1 (555) 019-2834",
    skills: ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "AWS", "Git", "JavaScript", "HTML", "CSS"],
    experience: [
      { role: "Software Engineer", company: "TechCorp Solutions", duration: "2022 - Present", description: "Built microservices using FastAPI and Django. Deployed docker containers to AWS ECS." },
      { role: "Junior Developer", company: "WebStart Inc", duration: "2020 - 2022", description: "Developed responsive frontend applications in React and integrated REST APIs." }
    ],
    education: [
      { degree: "Bachelor of Science in Computer Science", institution: "University of Texas", year: "2020" }
    ],
    projects: [
      { name: "BridgeSmart Platform", description: "Full-stack job application automation service with Celery and Redis background workers." }
    ]
  };

  const mockJobs = [
    { id: 1, portal_id: 1, title: "Senior Python Developer", company: "Indeed LLC", location: "Austin, TX", salary: "$130k - $160k", work_type: "Remote", description: "We are seeking a Senior Python Developer with experience in FastAPI, PostgreSQL, and building RESTful APIs. You will work on optimizing job recommendation algorithms." },
    { id: 2, portal_id: 2, title: "React Frontend Engineer", company: "TechFetch Services", location: "San Jose, CA", salary: "$110k - $130k", work_type: "Hybrid", description: "Looking for a React developer to design high-performance user interfaces. Experience with Tailwind CSS, state management, Vite, and responsive layouts is required." },
    { id: 3, portal_id: 3, title: "Systems Analyst", company: "Infosys Ltd", location: "Dallas, TX", salary: "$90k - $110k", work_type: "Onsite", description: "Responsibilities include requirement analysis, database design, and integrating third-party APIs. Strong understanding of SQL, Python, or Java." },
    { id: 4, portal_id: 4, title: "Full Stack Software Engineer", company: "JPMorgan Chase & Co.", location: "New York, NY", salary: "$140k - $180k", work_type: "Hybrid", description: "Join our global technology team to build secure, cloud-native financial applications. Required skills include Java, Python, Spring Boot, React, and Docker." },
    { id: 5, portal_id: 5, title: "DevOps Engineer", company: "Capgemini SE", location: "Chicago, IL", salary: "$120k - $150k", work_type: "Remote", description: "Deploy, maintain, and optimize infrastructure. Skills: Kubernetes, Docker, Terraform, GitHub Actions, AWS." }
  ];

  // Try checking connection on startup
  useEffect(() => {
    if (token) {
      fetchDashboardData();
      fetchParsedProfile();
    }
  }, [token, isSandbox]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    if (isSandbox) {
      setTimeout(() => {
        const dummyToken = 'sandbox-token-12345';
        const dummyUser = { email, full_name: 'Sandbox User' };
        localStorage.setItem('bridgesmart_token', dummyToken);
        localStorage.setItem('bridgesmart_user', JSON.stringify(dummyUser));
        setToken(dummyToken);
        setUser(dummyUser);
        setAuthLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('bridgesmart_token', access_token);
      localStorage.setItem('bridgesmart_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
    } catch (err) {
      console.error(err);
      setAuthError(err.response?.data?.detail || 'Authentication failed. Make sure the backend server is running, or enable Sandbox Mode.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (isSandbox) {
      setTimeout(() => {
        setAuthMode('login');
        setAuthLoading(false);
      }, 500);
      return;
    }

    try {
      await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        full_name: fullName
      });
      setAuthMode('login');
      setEmail('');
      setPassword('');
      alert('Registration successful! Please login.');
    } catch (err) {
      console.error(err);
      setAuthError(err.response?.data?.detail || 'Registration failed. Check backend endpoints.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    if (isSandbox) {
      const dummyToken = 'google-sandbox-token-999';
      const dummyUser = { email: 'google_user@gmail.com', full_name: 'Google Sandbox User' };
      localStorage.setItem('bridgesmart_token', dummyToken);
      localStorage.setItem('bridgesmart_user', JSON.stringify(dummyUser));
      setToken(dummyToken);
      setUser(dummyUser);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/auth/google-login-url`);
      // Simulating redirect for local test
      window.location.href = `${API_BASE}/auth/callback?code=simulated_code_12345`;
    } catch (err) {
      // Fallback redirect simulation directly
      alert('Google OAuth endpoint unreachable. Redirecting to mock callback flow...');
      window.location.href = `${API_BASE}/auth/callback?code=fallback_mock_code`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('bridgesmart_token');
    localStorage.removeItem('bridgesmart_user');
    setToken('');
    setUser(null);
    setStats({
      total_applied: 0,
      pending: 0,
      rejected: 0,
      interviews: 0,
      average_match_score: 0.0,
      applications: []
    });
    setParsedProfile(null);
    setJobResults([]);
  };

  const fetchDashboardData = async () => {
    setLoadingStats(true);
    if (isSandbox) {
      setStats(mockStats);
      setLogs(mockLogs);
      setLoadingStats(false);
      return;
    }

    try {
      const dashRes = await api.get('/dashboard');
      const logRes = await api.get('/dashboard/logs');
      setStats(dashRes.data);
      setLogs(logRes.data);
    } catch (err) {
      console.error("Dashboard error. Switching to Sandbox.", err);
      setIsSandbox(true);
      setStats(mockStats);
      setLogs(mockLogs);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchParsedProfile = async () => {
    if (isSandbox) {
      setParsedProfile(mockProfile);
      return;
    }

    try {
      const res = await api.get('/resume/parsed');
      if (res.data.parsed) {
        setParsedProfile(res.data.profile);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) return;

    setUploadingResume(true);
    if (isSandbox) {
      setTimeout(() => {
        setParsedProfile(mockProfile);
        setUploadingResume(false);
        alert('Resume uploaded successfully (Sandbox Mode)!');
      }, 1500);
      return;
    }

    const formData = new FormData();
    formData.append('file', resumeFile);

    try {
      const res = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setParsedProfile(res.data.parsed_json);
      alert('Resume parsed successfully with AI!');
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Resume upload failed.');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleJobSearch = async (e) => {
    e?.preventDefault();
    setSearchingJobs(true);
    setJobResults([]);

    if (isSandbox) {
      setTimeout(() => {
        const filtered = mockJobs.filter(job => {
          if (searchKeywords && !job.title.toLowerCase().includes(searchKeywords.toLowerCase()) && !job.description.toLowerCase().includes(searchKeywords.toLowerCase())) {
            return false;
          }
          if (searchLocation && !job.location.toLowerCase().includes(searchLocation.toLowerCase())) {
            return false;
          }
          if (searchRemote && !job.work_type.toLowerCase().includes('remote')) {
            return false;
          }
          return true;
        });
        setJobResults(filtered);
        setSearchingJobs(false);
      }, 800);
      return;
    }

    try {
      const res = await api.post('/jobs/search', {
        keywords: searchKeywords,
        location: searchLocation,
        remote: searchRemote
      });
      setJobResults(res.data);
    } catch (err) {
      console.error(err);
      alert('Job search failed.');
    } finally {
      setSearchingJobs(false);
    }
  };

  const handleCalculateMatch = async (jobId) => {
    setMatchingJobId(jobId);
    setMatchingLoading(true);
    setMatchData(null);
    setCoverLetter('');

    if (isSandbox) {
      setTimeout(() => {
        const matchedJob = mockJobs.find(j => j.id === jobId);
        // compute mock score
        let score = 75;
        if (matchedJob.title.includes('Python')) score = 88;
        if (matchedJob.title.includes('React')) score = 82;
        
        setMatchData({
          score: score,
          gaps: ["Kubernetes", "CI/CD Orchestration", "Redux Toolkit"],
          suggestions: [
            "Include your docker build instructions in your experiences details.",
            "List specific AWS solutions you deployed.",
            "Review Python list comprehension details on your projects list."
          ],
          explanation: `Strong match on core programming technologies. Gaps identified in cloud-native deployment orchestrations.`
        });
        setMatchingLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await api.post('/resume/match', { job_id: jobId });
      setMatchData(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to match resume.');
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleGenerateCoverLetter = async (jobId) => {
    setCoverLetterLoading(true);
    setCoverLetter('');

    if (isSandbox) {
      setTimeout(() => {
        const matchedJob = mockJobs.find(j => j.id === jobId);
        setCoverLetter(`Dear Hiring Manager,

I am writing to express my strong interest in the ${matchedJob.title} role at ${matchedJob.company}. My profile matches your required stack (FastAPI, React, SQL, cloud configurations). I would love to discuss how I can add value.

Sincerely,
Sandbox User`);
        setCoverLetterLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await api.post('/cover-letter', { job_id: jobId, tone: "professional" });
      setCoverLetter(res.data.cover_letter);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Cover letter generation failed.');
    } finally {
      setCoverLetterLoading(false);
    }
  };

  const handleApplyJob = async (jobId) => {
    setApplyingJobId(jobId);
    setApplyMessage(null);

    if (isSandbox) {
      setTimeout(() => {
        setApplyMessage({
          success: true,
          message: "Application processed successfully (Sandbox). Status: applied. External ID: BS-IND-48293"
        });
        setApplyingJobId(null);
        // Add to mock stats list
        const matchedJob = mockJobs.find(j => j.id === jobId);
        const newApp = {
          id: Math.floor(Math.random() * 1000),
          status: "applied",
          applied_at: new Date().toISOString(),
          match_score: matchData ? matchData.score : 80,
          cover_letter: coverLetter || "Generated cover letter...",
          job: matchedJob
        };
        setStats(prev => ({
          ...prev,
          total_applied: prev.total_applied + 1,
          applications: [newApp, ...prev.applications]
        }));
      }, 1500);
      return;
    }

    try {
      const res = await api.post(`/jobs/apply?threshold=${applyThreshold}`, { job_id: jobId });
      setApplyMessage({
        success: true,
        message: `Application submitted! Status: ${res.data.status}. Match Score: ${res.data.match_score}%.`
      });
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setApplyMessage({
        success: false,
        message: err.response?.data?.detail || 'Application failed.'
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  // Process data for charts
  const statusPieData = [
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Interviews', value: stats.interviews, color: '#10b981' },
    { name: 'Applied', value: Math.max(0, stats.total_applied - stats.pending - stats.rejected - stats.interviews), color: '#3b82f6' }
  ].filter(d => d.value > 0);

  // Line/Area Chart data from historical applications
  const areaData = stats.applications
    .map(app => ({
      date: new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: app.match_score || 70,
    }))
    .reverse();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="glass sticky top-0 z-40 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">BridgeSmart</h1>
            <p className="text-xs text-slate-400">AI Job Application Automation Platform</p>
          </div>
        </div>

        {token && (
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm text-slate-300">
              <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20">
                <UserIcon className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">{user?.full_name || user?.email}</p>
                <p className="text-[10px] text-slate-400">{isSandbox ? 'Sandbox Mode' : 'Connected to API'}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              className="flex items-center space-x-2 px-3.py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        {token && (
          <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-2 bg-slate-900/30">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-brand-500/10 border border-brand-500/25 text-brand-300 shadow-md shadow-brand-500/5' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('resume')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'resume' 
                  ? 'bg-brand-500/10 border border-brand-500/25 text-brand-300 shadow-md shadow-brand-500/5' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <FileText className="w-4.5 h-4.5" />
              <span>Resume Management</span>
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'jobs' 
                  ? 'bg-brand-500/10 border border-brand-500/25 text-brand-300 shadow-md shadow-brand-500/5' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Search className="w-4.5 h-4.5" />
              <span>Job Operations & Apply</span>
            </button>

            {/* Sandbox Toggle indicator */}
            <div className="pt-8 border-t border-slate-800/50 mt-6 px-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isSandbox} 
                  onChange={() => {
                    setIsSandbox(!isSandbox);
                    alert(`Switched to ${!isSandbox ? 'Sandbox (Mock)' : 'Connected Backend API'} Mode.`);
                  }}
                  className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500" 
                />
                <span className="text-xs text-slate-400 font-medium">Use Sandbox (Mock) Mode</span>
              </label>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Check this if backend connection fails or API keys are missing.
              </p>
            </div>
          </aside>
        )}

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {!token ? (
            /* AUTHENTICATION CONTAINER */
            <div className="max-w-md mx-auto my-12 p-8 glass rounded-2xl shadow-xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-pink-500"></div>
              
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto border border-brand-500/25 mb-4 animate-float">
                  <Briefcase className="w-6 h-6 text-brand-400" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">Welcome to BridgeSmart</h2>
                <p className="text-sm text-slate-400 mt-2">Log in or create a developer account to automate your applications</p>
              </div>

              {authError && (
                <div className="p-3 mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm placeholder-slate-600 transition-all outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="jane.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm placeholder-slate-600 transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-all outline-none cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{authLoading ? 'Signing In...' : authMode === 'login' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              </form>

              {/* OAuth Google Separator */}
              <div className="relative my-6 text-center">
                <hr className="border-slate-800" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-950 px-3 text-xs text-slate-500">OR REGISTER WITH</span>
              </div>

              <button
                onClick={handleGoogleOAuth}
                type="button"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-all outline-none cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-1.14 2.78-2.4 3.62v3.02h3.87c2.26-2.08 3.58-5.14 3.58-8.49z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.87-3.02c-1.08.72-2.48 1.16-4.09 1.16-3.15 0-5.82-2.13-6.77-5.01H1.24v3.12C3.21 21.2 7.37 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.23 14.22c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.54H1.24C.45 8.18 0 10.01 0 12s.45 3.82 1.24 5.46l3.99-3.24z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 7.37 0 3.21 2.8 1.24 6.54l3.99 3.24c.95-2.88 3.62-5.03 6.77-5.03z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-8 text-center text-xs">
                {authMode === 'login' ? (
                  <p className="text-slate-400">
                    Don't have an account?{' '}
                    <button onClick={() => setAuthMode('register')} className="text-brand-400 hover:text-brand-300 font-semibold underline">Register here</button>
                  </p>
                ) : (
                  <p className="text-slate-400">
                    Already have an account?{' '}
                    <button onClick={() => setAuthMode('login')} className="text-brand-400 hover:text-brand-300 font-semibold underline">Log in here</button>
                  </p>
                )}
              </div>

              <div className="mt-6 p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl">
                <label className="flex items-center space-x-2 text-xs text-slate-400 font-medium cursor-pointer justify-center">
                  <input 
                    type="checkbox" 
                    checked={isSandbox} 
                    onChange={() => setIsSandbox(!isSandbox)}
                    className="rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-brand-500" 
                  />
                  <span>Enable Sandbox (Bypass Backend Connection)</span>
                </label>
              </div>
            </div>
          ) : (
            /* AUTHENTICATED VIEWS */
            <div>
              {/* TAB 1: DASHBOARD VIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Dashboard Metrics Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight">Dashboard Overview</h2>
                      <p className="text-sm text-slate-400">Track and monitor your auto-applied job submissions</p>
                    </div>
                    <button 
                      onClick={fetchDashboardData}
                      disabled={loadingStats}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
                    >
                      <RefreshCw className={`w-4 h-4 text-slate-300 ${loadingStats ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="p-5 glass rounded-2xl flex items-center justify-between relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Total Applications</span>
                        <h3 className="text-3xl font-extrabold text-white">{stats.total_applied}</h3>
                      </div>
                      <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
                        <Briefcase className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 glass rounded-2xl flex items-center justify-between relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Pending/Review</span>
                        <h3 className="text-3xl font-extrabold text-amber-400">{stats.pending}</h3>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 glass rounded-2xl flex items-center justify-between relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Interviews</span>
                        <h3 className="text-3xl font-extrabold text-emerald-400">{stats.interviews}</h3>
                      </div>
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 glass rounded-2xl flex items-center justify-between relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Rejected</span>
                        <h3 className="text-3xl font-extrabold text-rose-500">{stats.rejected}</h3>
                      </div>
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                        <XCircle className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-5 glass rounded-2xl flex items-center justify-between relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider">Avg Match Score</span>
                        <h3 className="text-3xl font-extrabold text-purple-400">{stats.average_match_score}%</h3>
                      </div>
                      <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Graphs section */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Area Chart: Score Distribution */}
                    <div className="lg:col-span-2 p-6 glass rounded-2xl space-y-4">
                      <h4 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Historical Application ATS Match Scores</h4>
                      <div className="h-64">
                        {areaData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaData}>
                              <defs>
                                <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#707eff" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#707eff" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                              <YAxis stroke="#94a3b8" fontSize={11} domain={[50, 100]} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                              <Area type="monotone" dataKey="score" stroke="#707eff" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                            No application match data available yet. Add applications to visualize.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Pie Chart */}
                    <div className="p-6 glass rounded-2xl space-y-4 flex flex-col justify-between">
                      <h4 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Application Stages</h4>
                      <div className="h-48 flex items-center justify-center">
                        {statusPieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={statusPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {statusPieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-slate-500 text-sm">No statuses found.</div>
                        )}
                      </div>
                      
                      {/* Legend */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {statusPieData.map((entry, index) => (
                          <div key={index} className="flex items-center space-x-2 text-slate-300">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span>{entry.name}: {entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Applications Timeline Table & Audit Logs */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Applications Table */}
                    <div className="lg:col-span-2 p-6 glass rounded-2xl space-y-4">
                      <h4 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Recent System Actions & Submissions</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                              <th className="py-3 px-4">Job Title / Company</th>
                              <th className="py-3 px-4">Portal</th>
                              <th className="py-3 px-4">ATS Match</th>
                              <th className="py-3 px-4">Applied Date</th>
                              <th className="py-3 px-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50 text-sm">
                            {stats.applications.map((app) => (
                              <tr key={app.id} className="hover:bg-slate-900/30 transition">
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-200">{app.job.title}</div>
                                  <div className="text-xs text-slate-400">{app.job.company}</div>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-300">
                                  {app.job.portal_name || 'Indeed'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                    app.match_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-400'
                                  }`}>
                                    {app.match_score}%
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-400">
                                  {new Date(app.applied_at).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                                    app.status === 'applied' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' :
                                    app.status === 'interview' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    app.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {app.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {stats.applications.length === 0 && (
                              <tr>
                                <td colSpan="5" className="text-center py-6 text-slate-500">
                                  No applications filed yet. Visit Job Operations to apply.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Audit Logs */}
                    <div className="p-6 glass rounded-2xl space-y-4">
                      <h4 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Compliance Audit Logs</h4>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {logs.map((log) => (
                          <div key={log.id} className="p-3 bg-slate-900/50 border border-slate-800/40 rounded-xl space-y-1 text-xs">
                            <div className="flex items-center justify-between text-slate-400">
                              <span className="font-semibold text-slate-300">{log.action}</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-400 leading-normal">{log.details}</p>
                          </div>
                        ))}
                        {logs.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-xs">No audit logs stored yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RESUME MANAGEMENT VIEW */}
              {activeTab === 'resume' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Resume Management</h2>
                    <p className="text-sm text-slate-400">Upload and structure your candidate profile details with AI extraction</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Resume Upload Box */}
                    <div className="p-6 glass rounded-2xl space-y-4 h-fit">
                      <h3 className="font-semibold text-slate-200 text-base flex items-center space-x-2">
                        <Upload className="w-5 h-5 text-brand-400" />
                        <span>Upload Document</span>
                      </h3>
                      
                      <form onSubmit={handleResumeUpload} className="space-y-4">
                        <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center hover:border-brand-500 transition-all relative">
                          <input 
                            type="file" 
                            accept=".pdf,.docx"
                            onChange={(e) => setResumeFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                          <p className="text-sm text-slate-300 font-semibold">
                            {resumeFile ? resumeFile.name : 'Select PDF or DOCX file'}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Supported formats: PDF, DOCX (Max 5MB)</p>
                        </div>

                        <button
                          type="submit"
                          disabled={!resumeFile || uploadingResume}
                          className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
                        >
                          {uploadingResume ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Parsing Profile with AI...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Analyze & Parse Resume</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Extracted Profile Details View */}
                    <div className="lg:col-span-2 p-6 glass rounded-2xl space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <h3 className="font-bold text-slate-200 text-lg flex items-center space-x-2">
                          <FileCheck className="w-5 h-5 text-brand-400" />
                          <span>Structured ATS Candidate Profile</span>
                        </h3>
                        {parsedProfile && (
                          <span className="text-xs px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-full font-medium">
                            AI Synced
                          </span>
                        )}
                      </div>

                      {parsedProfile ? (
                        <div className="space-y-6 text-sm">
                          {/* Core details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Full Name</span>
                              <span className="font-semibold text-slate-200">{parsedProfile.name || 'Not Provided'}</span>
                            </div>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Email Address</span>
                              <span className="font-semibold text-slate-200">{parsedProfile.email || 'Not Provided'}</span>
                            </div>
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Phone Number</span>
                              <span className="font-semibold text-slate-200">{parsedProfile.phone || 'Not Provided'}</span>
                            </div>
                          </div>

                          {/* Skills badge */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Extracted Professional Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedProfile.skills?.map((skill, idx) => (
                                <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-xs font-medium text-slate-300 rounded-lg transition">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Experience Timeline */}
                          <div className="space-y-3">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Experience Timeline</span>
                            <div className="space-y-3 relative border-l border-slate-800 pl-4 ml-1">
                              {parsedProfile.experience?.map((exp, idx) => (
                                <div key={idx} className="relative space-y-1">
                                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 bg-brand-500 rounded-full border-2 border-slate-950"></div>
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-semibold text-slate-200 text-sm">{exp.role}</h5>
                                    <span className="text-xs text-slate-400">{exp.duration}</span>
                                  </div>
                                  <p className="text-xs text-slate-300 font-medium">{exp.company}</p>
                                  <p className="text-xs text-slate-400 leading-relaxed mt-1">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Projects */}
                          {parsedProfile.projects?.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Projects</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {parsedProfile.projects?.map((proj, idx) => (
                                  <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                                    <h6 className="font-semibold text-slate-200">{proj.name}</h6>
                                    <p className="text-xs text-slate-400 leading-normal">{proj.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Education */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Academic Credentials</span>
                            {parsedProfile.education?.map((edu, idx) => (
                              <div key={idx} className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-200 text-xs">{edu.degree}</p>
                                  <p className="text-[11px] text-slate-400">{edu.institution}</p>
                                </div>
                                <span className="text-xs text-slate-400">{edu.year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-24 text-center space-y-3">
                          <BookOpen className="w-12 h-12 text-slate-700 mx-auto" />
                          <p className="text-slate-500 font-medium">No ATS profile generated yet.</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Upload your resume PDF/DOCX to trigger structured AI extraction and build your profile details.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: JOB OPERATIONS VIEW */}
              {activeTab === 'jobs' && (
                <div className="space-y-6">
                  {/* Title & Info */}
                  <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Job Operations & Apply</h2>
                    <p className="text-sm text-slate-400">Search matching jobs across 10 official portals and configure AI-applying thresholds</p>
                  </div>

                  {/* Configure Application Threshold */}
                  <div className="p-5 glass rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                        <Award className="w-4 h-4 text-purple-400" />
                        <span>ATS Score Automation Threshold</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        BridgeSmart will block automated applications if your profile match score falls below this value.
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 md:col-span-2">
                      <input 
                        type="range" 
                        min="50" 
                        max="95" 
                        value={applyThreshold}
                        onChange={(e) => setApplyThreshold(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500" 
                      />
                      <span className="text-lg font-bold text-brand-300 w-12 text-right">{applyThreshold}%</span>
                    </div>
                  </div>

                  {/* Search Query Form */}
                  <form onSubmit={handleJobSearch} className="p-6 glass rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Keywords: Python, React, DevOps" 
                        value={searchKeywords}
                        onChange={(e) => setSearchKeywords(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm placeholder-slate-600 transition-all outline-none"
                      />
                    </div>
                    
                    <div className="relative">
                      <Search className="w-4.5 h-4.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Location: Remote, New York" 
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl text-sm placeholder-slate-600 transition-all outline-none"
                      />
                    </div>

                    <div className="flex items-center pl-2">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={searchRemote} 
                          onChange={() => setSearchRemote(!searchRemote)}
                          className="rounded bg-slate-900 border-slate-800 text-brand-500 focus:ring-brand-500" 
                        />
                        <span className="text-sm text-slate-300 font-medium">Remote Work Only</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={searchingJobs}
                      className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer"
                    >
                      {searchingJobs ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Search Portals</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Split view: Search results & Application flow panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Jobs List */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider">Search Results</h3>
                      
                      <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-2">
                        {jobResults.map((job) => (
                          <div 
                            key={job.id} 
                            onClick={() => {
                              setActiveJobId(job.id);
                              setMatchData(null);
                              setCoverLetter('');
                              setApplyMessage(null);
                            }}
                            className={`p-5 glass rounded-2xl cursor-pointer transition text-left space-y-2 border ${
                              activeJobId === job.id ? 'border-brand-500 bg-brand-500/5 shadow-md shadow-brand-500/5' : 'border-slate-800/80 hover:border-slate-700/80'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-slate-100 text-base">{job.title}</h4>
                                <p className="text-xs text-slate-400">{job.company} • {job.location}</p>
                              </div>
                              
                              <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded bg-slate-900 border border-slate-800 text-slate-400">
                                {job.portal_name || 'Indeed'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {job.description}
                            </p>

                            <div className="flex items-center justify-between pt-2 text-xs font-semibold">
                              <span className="text-brand-300">{job.salary || 'Salary Undisclosed'}</span>
                              <span className="text-slate-500">{job.work_type}</span>
                            </div>
                          </div>
                        ))}

                        {jobResults.length === 0 && !searchingJobs && (
                          <div className="py-24 text-center bg-slate-900/20 border border-slate-900 rounded-2xl">
                            <Briefcase className="w-10 h-10 text-slate-800 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Enter search parameters above to fetch portal jobs.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match & Apply Operations Panel */}
                    <div className="p-6 glass rounded-2xl space-y-6 h-fit sticky top-24">
                      {activeJobId ? (
                        (() => {
                          const activeJob = jobResults.find(j => j.id === activeJobId) || mockJobs.find(j => j.id === activeJobId);
                          return (
                            <div className="space-y-6 text-left">
                              {/* Job Core */}
                              <div className="border-b border-slate-800 pb-4">
                                <h3 className="font-extrabold text-slate-100 text-lg leading-tight">{activeJob.title}</h3>
                                <p className="text-xs text-slate-400 mt-1">{activeJob.company} • {activeJob.location} • {activeJob.work_type}</p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-wrap gap-2.5">
                                <button
                                  onClick={() => handleCalculateMatch(activeJob.id)}
                                  disabled={matchingLoading}
                                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                                  <span>{matchingLoading ? 'Analyzing ATS...' : 'Calculate AI Match'}</span>
                                </button>

                                <button
                                  onClick={() => handleGenerateCoverLetter(activeJob.id)}
                                  disabled={coverLetterLoading}
                                  className="py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>{coverLetterLoading ? 'Writing...' : 'Draft Cover Letter'}</span>
                                </button>
                              </div>

                              {/* ATS analysis output */}
                              {matchData && (
                                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-300">ATS Match Scoring:</span>
                                    <span className={`text-sm px-2.5 py-0.5 rounded font-extrabold border ${
                                      matchData.score >= applyThreshold 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    }`}>
                                      {matchData.score}%
                                    </span>
                                  </div>

                                  <p className="text-slate-400 leading-normal">{matchData.explanation}</p>

                                  {matchData.gaps?.length > 0 && (
                                    <div className="space-y-1.5">
                                      <span className="font-bold text-slate-300 block">Missing Skills & Gaps:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {matchData.gaps.map((g, idx) => (
                                          <span key={idx} className="px-2 py-0.5 bg-rose-950/20 border border-rose-500/10 text-[10px] text-rose-300 rounded">
                                            {g}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {matchData.suggestions?.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="font-bold text-slate-300 block">ATS Resume Suggestions:</span>
                                      <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-normal">
                                        {matchData.suggestions.map((s, idx) => (
                                          <li key={idx}>{s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Cover Letter Panel */}
                              {coverLetter && (
                                <div className="space-y-2">
                                  <span className="text-xs font-bold text-slate-400 block">AI Tailored Cover Letter:</span>
                                  <textarea 
                                    value={coverLetter}
                                    onChange={(e) => setCoverLetter(e.target.value)}
                                    rows="7"
                                    className="w-full p-3.5 bg-slate-900 border border-slate-800 focus:border-brand-500 rounded-xl text-xs text-slate-300 outline-none resize-none font-mono"
                                  />
                                </div>
                              )}

                              {/* Apply submit action box */}
                              <div className="pt-4 border-t border-slate-850 space-y-4">
                                <button
                                  onClick={() => handleApplyJob(activeJob.id)}
                                  disabled={applyingJobId || (matchData && matchData.score < applyThreshold)}
                                  className="w-full py-3 px-4 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 transition cursor-pointer"
                                >
                                  {applyingJobId ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      <span>Executing Official API Application Flow...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4" />
                                      <span>Trigger Automated Apply</span>
                                    </>
                                  )}
                                </button>
                                
                                {matchData && matchData.score < applyThreshold && (
                                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start space-x-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                      Application blocked: Match score ({matchData.score}%) is below your configured automation threshold ({applyThreshold}%).
                                    </span>
                                  </div>
                                )}

                                {applyMessage && (
                                  <div className={`p-4 rounded-xl border text-xs leading-normal ${
                                    applyMessage.success 
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                  }`}>
                                    <div className="font-bold mb-1">{applyMessage.success ? 'Execution Success' : 'Execution Alert'}</div>
                                    <p>{applyMessage.message}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-32 text-center space-y-2">
                          <AlertCircle className="w-10 h-10 text-slate-800 mx-auto" />
                          <p className="text-slate-500 text-sm">Select a job post from the search results to configure AI matching and trigger automated applications.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Compliance banner */}
      <footer className="glass border-t border-slate-900 py-4 px-6 text-center text-[10px] text-slate-500 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
        <p>© 2026 BridgeSmart Platforms. Built with FastAPI, Celery, React & OpenAI API integrations.</p>
        <p className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Compliance check: Standard official API route v2 sandbox active</span>
        </p>
      </footer>
    </div>
  );
}
