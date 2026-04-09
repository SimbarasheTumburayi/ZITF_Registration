import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

interface RegistrationData {
  id: string;
  fullname: string;
  role: string;
  organization: string;
  province: string;
  phone_number: string;
  email_address: string;
  gender: string;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- Registration Form Component ---
function RegistrationForm() {
  const [formData, setFormData] = useState({
    fullname: '',
    role: '',
    organization: '',
    province: '',
    phone_number: '',
    email_address: '',
    gender: '',
  });

  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: null, message: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/register`, formData);
      setStatus({ type: 'success', message: response.data.message });
      setFormData({
        fullname: '',
        role: '',
        organization: '',
        province: '',
        phone_number: '',
        email_address: '',
        gender: '',
      });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed. Please try again.';
      setStatus({ type: 'error', message });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const qrUrl = window.location.origin;

  return (
    <div className="registration-container">
      <header className="registration-header">
        <div className="logo-container">
          <img src="/zitf-logo.png" alt="ZITF Logo" className="brand-logo" />
          <img 
            src="https://ceird.ac.zw/assets/img/logo.png" 
            alt="CEIRD Logo" 
            className="brand-logo" 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        <h1>ZITF 2026 Registration</h1>
        <p>Zimbabwe International Trade Fair Participant Registration</p>
      </header>

      <form className="registration-form no-print" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullname">Full Name</label>
          <input type="text" id="fullname" name="fullname" value={formData.fullname} onChange={handleChange} required placeholder="Enter your full name" />
        </div>
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <input type="text" id="role" name="role" value={formData.role} onChange={handleChange} required placeholder="e.g. Exhibitor, Visitor" />
        </div>
        <div className="form-group">
          <label htmlFor="organization">Organization</label>
          <input type="text" id="organization" name="organization" value={formData.organization} onChange={handleChange} required placeholder="Your company or organization" />
        </div>
        <div className="form-group">
          <label htmlFor="province">Province</label>
          <input type="text" id="province" name="province" value={formData.province} onChange={handleChange} required placeholder="e.g. Bulawayo, Harare" />
        </div>
        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input type="tel" id="phone_number" name="phone_number" value={formData.phone_number} onChange={handleChange} required placeholder="+263..." />
        </div>
        <div className="form-group">
          <label htmlFor="email_address">Email Address</label>
          <input type="email" id="email_address" name="email_address" value={formData.email_address} onChange={handleChange} required placeholder="example@domain.com" />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
            <option value="" disabled>Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button type="submit" className="submit-btn">Register Now</button>
        {status.message && <div className={`status-message ${status.type}`}>{status.message}</div>}
      </form>

      <div className="qr-section">
        <h3>Mobile Registration</h3>
        <div className="qr-display">
          <QRCodeSVG value={qrUrl} size={200} />
        </div>
        <p>Scan to register on your phone</p>
        <div className="qr-actions no-print">
          <button onClick={handlePrint} className="print-btn">Print QR Flyer</button>
          <Link to="/qr" className="view-qr-btn">View Large QR</Link>
        </div>
      </div>

      <footer className="registration-footer no-print">
        <p>&copy; 2026 Zimbabwe International Trade Fair. All rights reserved.</p>
        <Link to="/admin" className="admin-link">Admin Access</Link>
      </footer>
    </div>
  );
}

// --- Large QR Code Page Component ---
function QRCodePage() {
  const qrUrl = window.location.origin;
  const navigate = useNavigate();

  return (
    <div className="large-qr-container">
      <div className="large-qr-content">
        <div className="logo-container">
          <img src="/zitf-logo.png" alt="ZITF Logo" className="brand-logo" />
          <img 
            src="https://ceird.ac.zw/assets/img/logo.png" 
            alt="CEIRD Logo" 
            className="brand-logo" 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        <h1>Scan to Register</h1>
        <div className="magnified-qr">
          <QRCodeSVG value={qrUrl} size={500} />
        </div>
        <p>ZITF 2026 Registration</p>
        <button onClick={() => navigate('/')} className="back-btn no-print">Back to Form</button>
      </div>
    </div>
  );
}

// --- Admin Dashboard Component ---
function AdminDashboard() {
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<RegistrationData>({
    id: '',
    fullname: '',
    role: '',
    organization: '',
    province: '',
    phone_number: '',
    email_address: '',
    gender: '',
    created_at: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/registrations`);
      setRegistrations(response.data);
    } catch (error) {
      console.error('Failed to fetch registrations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    window.open(`${API_BASE_URL}/api/export/csv`, '_blank');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this registration?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/register/${id}`);
        fetchRegistrations();
      } catch (error) {
        alert('Failed to delete registration');
      }
    }
  };

  const startEdit = (reg: RegistrationData) => {
    setEditingId(reg.id);
    setEditData(reg);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/register/${editingId}`, editData);
      setEditingId(null);
      fetchRegistrations();
    } catch (error) {
      alert('Failed to update registration');
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={handleDownloadCSV} className="csv-btn">Download CSV</button>
          <button onClick={() => navigate('/')} className="back-btn">Back</button>
        </div>
      </header>

      {loading ? (
        <p>Loading registrations...</p>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Province</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg.id}>
                  {editingId === reg.id ? (
                    <>
                      <td><input name="fullname" value={editData.fullname} onChange={handleEditChange} /></td>
                      <td><input name="role" value={editData.role} onChange={handleEditChange} /></td>
                      <td><input name="organization" value={editData.organization} onChange={handleEditChange} /></td>
                      <td><input name="province" value={editData.province} onChange={handleEditChange} /></td>
                      <td><input name="phone_number" value={editData.phone_number} onChange={handleEditChange} /></td>
                      <td><input name="email_address" value={editData.email_address} onChange={handleEditChange} /></td>
                      <td>
                        <select name="gender" value={editData.gender} onChange={handleEditChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={saveEdit} className="save-btn">Save</button>
                        <button onClick={() => setEditingId(null)} className="cancel-btn">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{reg.fullname}</td>
                      <td>{reg.role}</td>
                      <td>{reg.organization}</td>
                      <td>{reg.province}</td>
                      <td>{reg.phone_number}</td>
                      <td>{reg.email_address}</td>
                      <td>{reg.gender}</td>
                      <td>
                        <button onClick={() => startEdit(reg)} className="edit-btn">Edit</button>
                        <button onClick={() => handleDelete(reg.id)} className="delete-btn">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Main App with Routing ---
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RegistrationForm />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/qr" element={<QRCodePage />} />
      </Routes>
    </Router>
  );
}

export default App;
