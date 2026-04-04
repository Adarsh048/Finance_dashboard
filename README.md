# 💼 Finance Dashboard — HNI Ledger System

A modern, high-performance financial dashboard built with **React**, designed to simulate a premium wealth management interface for **high-net-worth individuals (HNI)**.

This project emphasizes **clean UI, smooth interactions, and real-time financial insights**, with strong attention to usability and scalable structure.

---

## 🚀 Overview

This is a **single-page financial analytics platform** that enables users to:

* Track transactions (income & expenses)
* Analyze financial trends
* Generate reports
* Manage data with role-based access
* Export financial records

> ⚡ Built using mock data + localStorage to simulate a real-world system (no backend required)

---

## ✨ Key Features

### 📊 Dashboard (Overview)

* Net balance calculation
* Monthly inflow vs outflow stats
* 14-day financial trend visualization
* Expense category breakdown (pie chart)

---

### 📒 Ledger (Transactions)

* Clean transaction listing
* Search by merchant/category

**Filters:**

* Type (income/expense)
* Category

**Sorting:**

* Date
* Amount

**Actions:**

* View details
* Edit (Admin only)
* Delete (Admin only)

---

### 📈 Analytics (Intelligence)

* Spending trends
* Top category
* Largest transaction

**Time Filters:**

* 7 Days

* 1 Month

* 3 Months

* Spend velocity graph

---

### 📑 Reports (Statements)

* Generate financial summaries

**Filters:**

* Time period
* Transaction type

**Export Formats:**

* CSV (Spreadsheet-friendly)
* JSON (Developer-friendly)

---

## 🧠 Smart UI Features

* Command palette (**Ctrl / Cmd + K**)
* Dark / Light mode toggle
* Role switching (**Admin ↔ Viewer**)
* Drawer-based editing UI
* Loading states & skeletons

---

## 🏗️ Architecture

### 1. Utilities

* Currency & date formatting
* CSV / JSON export
* Helper functions

### 2. Data Engine

* Mock transaction generator
* LocalStorage persistence
* Safe read/write handling

### 3. State Management

* Global state using **useReducer**
* Context API (**AppContext**)

**Core Actions:**

* `INIT_DATA`
* `UPDATE_TXN`
* `DELETE_TXN`
* `TOGGLE_DARK`
* `NAVIGATE`

---

### 4. UI Components

* Reusable components (Button, Cards, etc.)
* Micro-interactions & transitions

### 5. Pages

* Dashboard
* Transactions
* Analytics
* Reports

### 6. App Shell

* Sidebar navigation
* Top bar

**Global Overlays:**

* Command palette
* Role switch loader
* Transaction drawer

---

## 🛠️ Tech Stack

* React (Hooks + Context API)
* Recharts (Data visualization)
* Lucide Icons
* Tailwind CSS
* LocalStorage

---

## ⚙️ Installation & Setup

```bash
# Clone the repo
git clone <your-repo-url>

# Navigate into project
cd finance-dashboard

# Install dependencies
npm install

# Run the app
npm run dev
```

---

## 📁 Data Handling

* Transactions are generated on first load
* Stored in **localStorage**

**Keys used:**

* `fin_transactions_hni_v1` → Transactions
* `fin_dark` → Theme preference

---

## 🔐 Roles & Permissions

| Role   | Access                             |
| ------ | ---------------------------------- |
| Admin  | Full access (edit, delete, export) |
| Viewer | Read-only access                   |

> Role switching includes a loading overlay for realism

---

## 📤 Export Feature

Users can export financial data:

* CSV → Spreadsheet-friendly
* JSON → Developer-friendly

> Implemented using the Blob API (client-side)

---

## 🎯 Design Philosophy

* Minimal, distraction-free UI
* Data-first layout
* Smooth micro-interactions
* SaaS-level polish
* Clear information hierarchy

---

## ⚠️ Notes

* Frontend-only project (no backend/API)
* Data is not persistent across devices
* Built for UI/UX exploration

---

## 📌 Future Improvements

* Backend integration (Node.js / Firebase)
* Authentication system
* Real-time sync
* AI-powered insights
* Multi-user support

---

## 👨‍💻 Author

Built as part of a modern frontend project focusing on:

* SaaS design patterns
* Financial UI systems
* Scalable frontend architecture
