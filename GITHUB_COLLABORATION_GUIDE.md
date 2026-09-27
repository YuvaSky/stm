# 🤝 GitHub Team Collaboration & Invitation Guide

This guide explains how to invite developers, manage repository access permissions, and collaborate effectively on the **SECUREPRINT (stm)** codebase using GitHub.

---

## 📩 1. How to Invite New Developers to GitHub

Follow these steps to invite team members to this repository:

### Step 1: Open GitHub Repository Settings
1. Log in to your GitHub account.
2. Open your repository: `https://github.com/YuvaSky/stm`.
3. Click the **Settings** tab (located on the far right of the top navigation bar).

### Step 2: Navigate to Collaborators
1. In the left-hand menu, under the **Access** section, click **Collaborators**.
2. If prompted, re-enter your GitHub password or 2FA code to confirm access.

### Step 3: Add Collaborators
1. Click the green **Add people** button.
2. Type the developer's **GitHub Username**, **Full Name**, or **Email Address**.
3. Select their profile from the dropdown list.
4. Click **Add [username] to this repository**.

### Step 4: Share Invitation Link
* An automated email will be sent by GitHub to the developer.
* Alternatively, copy the invitation link shown on the screen and send it directly to them.
* Direct invitation acceptance link: `https://github.com/YuvaSky/stm/invitations`.

---

## 🔑 2. Setting Up Permissions & Roles

Depending on whether your repository is in a personal GitHub account or a GitHub Organization:

* **Write Access (Default)**: Invited collaborators can clone, pull, push commits directly to branches, and open/review Pull Requests.
* **Admin Access**: Can add other collaborators, manage webhooks, and modify repository settings.

---

## 🚀 3. Workflow for New Developers Joining the Project

When a new developer joins the repository, they should execute the following commands to get started:

```bash
# 1. Clone the project
git clone https://github.com/YuvaSky/stm.git
cd stm

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..
cd super-admin && npm install && cd ..

# 3. Create a feature branch before making changes
git checkout -b feature/new-feature-name

# 4. Push updates to GitHub
git add .
git commit -m "Add new feature description"
git push -u origin feature/new-feature-name
```

---

## 🛠️ 4. Quick Server Commands

| Task | Command |
| :--- | :--- |
| **Backend REST Server** | `node backend/server.js` |
| **Shopkeeper & Customer App** | `cd frontend && npx vite --port 3001 --host` |
| **Super Admin SaaS Console** | `cd super-admin && npx vite --port 3003 --host` |
