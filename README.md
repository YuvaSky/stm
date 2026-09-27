# 🖨️ SECUREPRINT (stm) - SaaS Print Shop & Document Management System

A high-performance, SaaS-based secure document printing platform featuring real-time Socket.io print queues, automatic customer QR code generation, local silent print spooling, document retention auto-purging, and a dedicated Super Admin SaaS Console.

---

## 🎭 2-Role System Architecture

The software is structured around **2 main system roles**:

1. 👑 **ADMIN (Super Admin)**:
   * **Portal URL**: `http://localhost:3003/`
   * **Scope**: Central management of registered shopkeepers, revenue & print order analytics, printer hardware registry, pricing matrix, document retention auto-purge timers, and user access controls.

2. 🏬 **SHOPKEEPER (Print Counter Staff / Store Owner)**:
   * **Portal URL**: `http://localhost:3001/`
   * **Scope**: Real-time print queue management, automatic unique counter QR code generation, customer upload link sharing (`http://<IP>:3001/?shop=<SHOP_ID>`), 1-click counter standee poster printing, and local silent print agent integration.

---

## 📁 Single Monorepo Repository Structure

```
stm/ (Single Repository: https://github.com/YuvaSky/stm)
├── backend/          # Express API Server + Socket.io + MongoDB Models (Port 5000)
├── frontend/         # Customer Document Upload & Shopkeeper Counter Portal (Port 3001)
├── super-admin/      # Standalone SaaS Super Admin Console (Port 3003)
└── print-agent/      # Local Node.js Silent Print Agent for Windows Spooler
```

---

## 👥 How to Invite Developers / Collaborators on GitHub

Follow these steps to invite team members to this GitHub repository so they can clone, contribute, and manage the project with you:

### Step 1: Open GitHub Repository Settings
1. Go to your GitHub repository: `https://github.com/YuvaSky/stm`.
2. Click on the **Settings** tab in the top repository menu bar.

### Step 2: Add Collaborator
1. In the left sidebar, click **Collaborators** (under *Access*).
2. Click the green **Add people** button.
3. Search for the developer's **GitHub username**, **full name**, or **email address**.
4. Select their profile and click **Add [username] to this repository**.

### Step 3: Accept Invitation
1. The invited developer will receive an email invitation and a notification on GitHub.
2. Direct them to accept the invitation at: `https://github.com/YuvaSky/stm/invitations`.
3. Once accepted, they have full clone and commit access!

---

## 💻 Developer Setup Guide (For New Team Members)

Once a developer accepts your GitHub invitation, they can follow these steps to run the complete project locally:

### 1. Clone Repository
```bash
git clone https://github.com/YuvaSky/stm.git
cd stm
```

### 2. Install Dependencies
```bash
# Install root & backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install super-admin dependencies
cd super-admin && npm install && cd ..
```

### 3. Start Local Environment

Open **3 terminal windows** or tabs:

* **Terminal 1 (Backend API - Port 5000)**:
  ```bash
  node backend/server.js
  ```
  *(Default seed Super Admin account created automatically: `7777777777` / `developer123`)*

* **Terminal 2 (Shopkeeper & Customer Frontend - Port 3001)**:
  ```bash
  cd frontend
  npx vite --port 3001 --host
  ```

* **Terminal 3 (Super Admin Portal - Port 3003)**:
  ```bash
  cd super-admin
  npx vite --port 3003 --host
  ```

---

## 🌐 Default Ports & Access Points

| Component | Port | Local URL | Privileges |
| :--- | :--- | :--- | :--- |
| **Backend REST API** | `5000` | `http://localhost:5000/api/health` | REST + Socket.io Server |
| **Super Admin Console** | `3003` | `http://localhost:3003/` | Super Admin SaaS Operations |
| **Shopkeeper & Customer App** | `3001` | `http://localhost:3001/` | Counter Staff & Customer Upload |

---

## 📄 Production Build Commands

```bash
# Build Frontend App
cd frontend && npx vite build

# Build Super Admin Console
cd super-admin && npx vite build
```
