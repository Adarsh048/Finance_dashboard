💼 Finance Dashboard (HNI Ledger System)

A modern, high-performance financial dashboard built with React, designed to simulate a premium wealth management interface for high-net-worth individuals (HNI).

This project focuses on clean UI, smooth interactions, and real-time financial insights with a strong emphasis on usability and structure.

🚀 Overview

This application is a single-page financial analytics platform that allows users to:

Track transactions (income & expenses)
Analyze financial trends
Generate reports
Manage data with role-based access
Export financial records

It uses mock data generation and local storage to simulate a real-world financial system without requiring a backend.

✨ Key Features
📊 Dashboard (Overview)
Net balance calculation
Monthly inflow vs outflow stats
14-day financial trend visualization
Expense category breakdown (pie chart)
📒 Ledger (Transactions)
View all transactions in a clean list
Search by merchant/category
Filter by:
Type (income/expense)
Category
Sort by date or amount
Click any transaction to:
View details
Edit (admin only)
Delete (admin only)
📈 Analytics (Intelligence)
Dynamic insights like:
Spending trends
Top category
Largest transaction
Time range filtering (7D / 1M / 3M)
Spend velocity graph
📑 Reports (Statements)
Generate financial summaries
Filter by:
Time period
Transaction type
Export data as:
CSV
JSON
🧠 Smart UI Features
Command palette (Ctrl/Cmd + K)
Dark / Light mode toggle
Role switching (Admin ↔ Viewer)
Drawer-based editing UI
Loading states & skeletons
🏗️ Architecture

The app is structured into logical sections:

1. Utilities
Currency & date formatting
Data export (CSV/JSON)
Helper functions
2. Data Engine
Mock transaction generator
LocalStorage persistence
Safe read/write handling
3. State Management
Global state via useReducer
Context API (AppContext)
Centralized actions:
INIT_DATA
UPDATE_TXN
DELETE_TXN
TOGGLE_DARK
NAVIGATE
4. UI Components
Reusable components like Button
Micro-interactions and transitions
5. Pages
Dashboard
Transactions
Analytics
Reports
6. App Shell
Sidebar navigation
Top bar
Global overlays:
Command palette
Role switch loader
Transaction drawer
🛠️ Tech Stack
React (Hooks + Context API)
Recharts – Data visualization
Lucide Icons – Clean icon set
Tailwind CSS (utility-first styling)
LocalStorage – Persistence layer
⚙️ Installation & Setup
# Clone the repo
git clone <your-repo-url>

# Navigate into project
cd finance-dashboard

# Install dependencies
npm install

# Run the app
npm run dev
📁 Data Handling
Transactions are generated using a mock engine on first load
Stored in localStorage

Key used:

fin_transactions_hni_v1

Dark mode preference:

fin_dark
🔐 Roles & Permissions
Role	Access
Admin	Full access (edit, delete, export)
Viewer	Read-only access

Role switching is simulated with a loading overlay for realism.

📤 Export Feature

Users can export financial data:

CSV → Spreadsheet-friendly
JSON → Developer-friendly

Handled entirely on the client side using Blob API.

🎯 Design Philosophy
Minimal, distraction-free UI
Data-first layout
Smooth transitions and micro-interactions
SaaS-level polish
Clear information hierarchy
⚠️ Notes
This is a frontend-only project (no backend/API)
Data is not persistent across browsers/devices
Designed for demonstration and UI/UX exploration
📌 Future Improvements
Backend integration (Node.js / Firebase)
Authentication system
Real-time data sync
Advanced analytics (AI insights)
Multi-user support
👨‍💻 Author

Built as part of a modern frontend project focusing on real-world SaaS design patterns and financial UI systems.
