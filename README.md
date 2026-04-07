# ZITF 2026 Registration Platform

A full-stack registration platform for the Zimbabwe International Trade Fair (ZITF) 2026. This application allows participants to register for the event by providing their personal and professional details.

## 🚀 Features
- **Clean Registration Form:** User-friendly interface for capturing participant data.
- **Real-time Validation:** Client-side and server-side validation for data integrity.
- **Data Persistence:** Stores registration records in a local SQLite database.
- **Admin API:** Endpoint to retrieve all registrations for administrative purposes.
- **Modern Tech Stack:** Built with React, TypeScript, and Express.

## 🛠️ Technology Stack
- **Frontend:** React (TypeScript), Vite, Axios, Vanilla CSS.
- **Backend:** Node.js, Express (TypeScript), `tsx` (execution).
- **Database:** SQLite3.
- **Utilities:** `uuid` for unique identifiers, `cors` for cross-origin requests.

## 📁 Project Structure
```text
ZITF_Registration/
├── client/                # React Frontend
│   ├── src/
│   │   ├── App.tsx       # Main registration form component
│   │   ├── App.css       # Custom styling for the platform
│   │   └── main.tsx      # Entry point
│   └── package.json
├── server/                # Express Backend
│   ├── src/
│   │   └── index.ts      # Server logic and API endpoints
│   ├── registration.db    # SQLite database (auto-generated)
│   ├── package.json
│   └── tsconfig.json
└── README.md              # Project documentation
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18 or higher)
- npm (Node Package Manager)

### 1. Backend Setup
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
The frontend will start on `http://localhost:5173`. Open this URL in your browser to access the registration form.

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/register` | Register a new participant. |
| `GET` | `/api/registrations` | List all registered participants (Admin). |

### Sample Registration Payload
```json
{
  "fullname": "John Doe",
  "role": "Exhibitor",
  "organization": "Tech Corp",
  "province": "Harare",
  "phone_number": "+263123456789",
  "email_address": "john@techcorp.com",
  "gender": "Male"
}
```

## 📋 Data Fields
The platform collects the following information:
- **Full Name**
- **Role** (e.g., Exhibitor, Visitor, Delegate)
- **Organization**
- **Province**
- **Phone Number**
- **Email Address**
- **Gender**

## 📄 License
© 2026 Zimbabwe International Trade Fair. All rights reserved.
