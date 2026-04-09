import express, { type Request, type Response } from 'express';
import cors from 'cors';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Database Connection ---
const isLive = !!process.env.DATABASE_URL;
let db: any;

const initializeDatabase = async () => {
  if (isLive) {
    console.log('☁️ Connecting to PostgreSQL...');
    db = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    console.log('🏠 Connecting to local SQLite...');
    const sqlite3 = (await import('sqlite3')).default;
    const sqliteDB = new sqlite3.Database('./registration.db');
    db = {
      query: (text: string, params: any[]) => new Promise((resolve, reject) => {
        sqliteDB.all(text.replace(/\$/g, '?'), params, (err, rows) => {
          if (err) reject(err);
          else resolve({ rows });
        });
      }),
      run: (text: string, params: any[]) => new Promise((resolve, reject) => {
        sqliteDB.run(text.replace(/\$/g, '?'), params, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      })
    };
  }

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      fullname TEXT NOT NULL,
      role TEXT NOT NULL,
      organization TEXT NOT NULL,
      province TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      email_address TEXT NOT NULL,
      gender TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
  
  if (isLive) await db.query(createTableQuery);
  else await db.run(createTableQuery, []);
};

initializeDatabase().catch(err => console.error('Database Initialization Error:', err));

// --- Email Configuration (Resend) ---
const resend = new Resend(process.env.RESEND_API_KEY);

const sendConfirmationEmail = async (email: string, fullname: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ EMAIL ERROR: Missing RESEND_API_KEY environment variable.');
    return;
  }

  try {
    console.log(`Attempting to send email via Resend to ${email}...`);
    const { data, error } = await resend.emails.send({
      from: 'ZITF CEIRD <onboarding@resend.dev>', // Resend default for free accounts
      to: email,
      subject: 'ZITF CEIRD Attendance Register Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #003366; text-align: center;">Registration Successful</h2>
          <p>Dear <strong>${fullname}</strong>,</p>
          <p>Thank you, you have successfully registered the <strong>ZITF CEIRD Attendance register</strong>.</p>
          <p>Your details have been recorded. We look forward to seeing you there!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888; text-align: center;">&copy; 2026 ZITF - CEIRD.</p>
        </div>`,
    });

    if (error) {
      console.error('❌ RESEND ERROR:', error);
    } else {
      console.log(`✅ Email successfully sent via Resend! ID: ${data?.id}`);
    }
  } catch (error: any) {
    console.error('❌ UNEXPECTED EMAIL ERROR:', error.message);
  }
};

// Helper to escape CSV values
const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

// --- API Routes ---
app.post('/api/register', async (req: Request, res: Response) => {
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;
  if (!fullname || !role || !organization || !province || !phone_number || !email_address || !gender) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  const id = uuidv4();
  const date = new Date().toISOString();
  
  try {
    const query = 'INSERT INTO registrations (id, fullname, role, organization, province, phone_number, email_address, gender, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    const params = [id, fullname, role, organization, province, phone_number, email_address, gender, date];
    
    if (isLive) await db.query(query, params);
    else await db.run(query, params);
    
    sendConfirmationEmail(email_address, fullname);
    res.status(201).json({ message: 'Registration successful!', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/registrations', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM registrations ORDER BY created_at DESC', []);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/register/:id', async (req, res) => {
  const { id } = req.params;
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;
  try {
    const query = 'UPDATE registrations SET fullname=$1, role=$2, organization=$3, province=$4, phone_number=$5, email_address=$6, gender=$7 WHERE id=$8';
    const params = [fullname, role, organization, province, phone_number, email_address, gender, id];
    
    if (isLive) await db.query(query, params);
    else await db.run(query, params);
    
    res.json({ message: 'Updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/register/:id', async (req, res) => {
  try {
    const query = 'DELETE FROM registrations WHERE id=$1';
    if (isLive) await db.query(query, [req.params.id]);
    else await db.run(query, [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export/csv', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM registrations ORDER BY created_at DESC', []);
    let csv = 'ID,Full Name,Role,Organization,Province,Phone Number,Email Address,Gender,Created At\n';
    result.rows.forEach((r: any) => {
      csv += `${r.id},${escapeCSV(r.fullname)},${escapeCSV(r.role)},${escapeCSV(r.organization)},${escapeCSV(r.province)},${escapeCSV(r.phone_number)},${escapeCSV(r.email_address)},${escapeCSV(r.gender)},${r.created_at}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=ZITF_Registrations.csv');
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).send('Error generating CSV');
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  if (!process.env.RESEND_API_KEY) console.warn('⚠️ RESEND_API_KEY is missing');
  else console.log('✅ Resend email service configured');
});
