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

// --- Email Configuration ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail App Password
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
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${email}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};

// --- Database & CSV Helpers ---
// (The rest of the database and CSV logic remains the same...)

// Registration Endpoint (Create)
app.post('/api/register', (req: Request, res: Response) => {
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;

  if (!fullname || !role || !organization || !province || !phone_number || !email_address || !gender) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  const stmt = db.prepare('INSERT INTO registrations (id, fullname, role, organization, province, phone_number, email_address, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  stmt.run(id, fullname, role, organization, province, phone_number, email_address, gender, createdAt, function(err: Error | null) {
    if (err) {
      console.error('Error inserting registration:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    syncCSV();
    sendConfirmationEmail(email_address, fullname); // Send the email
    res.status(201).json({ message: 'Registration successful!', id });
  });
  stmt.finalize();
});

// Update Registration
app.put('/api/register/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fullname, role, organization, province, phone_number, email_address, gender } = req.body;

  const stmt = db.prepare('UPDATE registrations SET fullname = ?, role = ?, organization = ?, province = ?, phone_number = ?, email_address = ?, gender = ? WHERE id = ?');
  
  stmt.run(fullname, role, organization, province, phone_number, email_address, gender, id, function(err: Error | null) {
    if (err) {
      console.error('Error updating registration:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    syncCSV();
    res.json({ message: 'Registration updated successfully!' });
  });
  stmt.finalize();
});

// Delete Registration
app.delete('/api/register/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.run('DELETE FROM registrations WHERE id = ?', id, function(err: Error | null) {
    if (err) {
      console.error('Error deleting registration:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    syncCSV();
    res.json({ message: 'Registration deleted successfully!' });
  });
});

// List Registrations (Admin Endpoint)
app.get('/api/registrations', (req: Request, res: Response) => {
  db.all('SELECT * FROM registrations ORDER BY created_at DESC', (err: Error | null, rows: any[]) => {
    if (err) {
      console.error('Error fetching registrations:', err.message);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    res.json(rows);
  });
});

// Export to CSV Endpoint
app.get('/api/export/csv', (req: Request, res: Response) => {
  if (!fs.existsSync(CSV_FILE_PATH)) {
    return res.status(404).json({ error: 'No registrations found.' });
  }
  res.download(CSV_FILE_PATH, 'ZITF_Registrations.csv');
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Email Configuration Check
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ WARNING: EMAIL_USER or EMAIL_PASS environment variables are missing.');
    console.warn('Emails will not be sent until these are configured on Render.');
  } else {
    console.log('✅ Email service is configured and ready.');
  }
});
