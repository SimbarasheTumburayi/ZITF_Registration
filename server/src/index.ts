import express, { type Request, type Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 5000;
const CSV_FILE_PATH = path.join(process.cwd(), 'registrations.csv');

app.use(cors());
app.use(express.json());

// Initialize CSV file with headers if it doesn't exist
if (!fs.existsSync(CSV_FILE_PATH)) {
  const headers = 'ID,Full Name,Role,Organization,Province,Phone Number,Email Address,Gender,Created At\n';
  fs.writeFileSync(CSV_FILE_PATH, headers);
}

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendConfirmationEmail = async (email: string, fullname: string) => {
  const mailOptions = {
    from: `"ZITF CEIRD" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'ZITF CEIRD Attendance Register Confirmation',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #003366; text-align: center;">Registration Successful</h2>
        <p>Dear <strong>${fullname}</strong>,</p>
        <p>Thank you, you have successfully registered the <strong>ZITF CEIRD Attendance register</strong>.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Event Details:</strong></p>
          <p style="margin: 5px 0;">Zimbabwe International Trade Fair 2026</p>
          <p style="margin: 5px 0;">CEIRD Innovation Hub</p>
          <p style="margin: 5px 0;">Venue: Bulawayo Exhibition Centre</p>
        </div>
        <p>Your details have been securely recorded. We look forward to seeing you there!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">
          &copy; 2026 Zimbabwe International Trade Fair - CEIRD. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${email}`);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
};

// --- Database & CSV Helpers ---
const db = new sqlite3.Database('./registration.db', (err) => {
  if (err) console.error('Database Connection Error:', err.message);
  else console.log('Connected to SQLite.');
});

db.run(`CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  fullname TEXT NOT NULL,
  role TEXT NOT NULL,
  organization TEXT NOT NULL,
  province TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email_address TEXT NOT NULL,
  gender TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

const syncCSV = () => {
  db.all('SELECT * FROM registrations ORDER BY created_at DESC', (err, rows: any[]) => {
    if (err) return console.error('CSV Sync Error:', err.message);
    let csv = 'ID,Full Name,Role,Organization,Province,Phone Number,Email Address,Gender,Created At\n';
    rows.forEach(r => {
      csv += `${r.id},${escapeCSV(r.fullname)},${escapeCSV(r.role)},${escapeCSV(r.organization)},${escapeCSV(r.province)},${escapeCSV(r.phone_number)},${escapeCSV(r.email_address)},${escapeCSV(r.gender)},${r.created_at}\n`;
    });
    fs.writeFileSync(CSV_FILE_PATH, csv);
  });
};

// --- API Routes ---
app.post('/api/register', (req: Request, res: Response) => {
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;
  if (!fullname || !role || !organization || !province || !phone_number || !email_address || !gender) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const id = uuidv4();
  const date = new Date().toISOString();
  db.run('INSERT INTO registrations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    [id, fullname, role, organization, province, phone_number, email_address, gender, date], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    syncCSV();
    sendConfirmationEmail(email_address, fullname);
    res.status(201).json({ message: 'Registration successful!', id });
  });
});

app.get('/api/registrations', (req, res) => {
  db.all('SELECT * FROM registrations ORDER BY created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/register/:id', (req, res) => {
  const { id } = req.params;
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;
  db.run('UPDATE registrations SET fullname=?, role=?, organization=?, province=?, phone_number=?, email_address=?, gender=? WHERE id=?', 
    [fullname, role, organization, province, phone_number, email_address, gender, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    syncCSV();
    res.json({ message: 'Updated successfully' });
  });
});

app.delete('/api/register/:id', (req, res) => {
  db.run('DELETE FROM registrations WHERE id=?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    syncCSV();
    res.json({ message: 'Deleted successfully' });
  });
});

app.get('/api/export/csv', (req, res) => {
  if (fs.existsSync(CSV_FILE_PATH)) res.download(CSV_FILE_PATH);
  else res.status(404).send('Not found');
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) console.warn('⚠️ Email credentials missing');
  else console.log('✅ Email service ready');
});
