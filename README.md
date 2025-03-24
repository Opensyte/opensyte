<p align="center">
  <img src="public/icon-with-text-white.svg" width="300" style=" padding: 8px; margin-bottom:10px;"/>
</p>

# 🚀 OpenSyte
An open source all-in-one business management software.

## 🛠️ Installation

Follow these steps to set up the project on your local machine:

### 1. Fork and clone the repository

1. **Fork the repository**
   - Visit the [OpenSyte repository](https://github.com/opensyte/opensyte)
   - Click on the "Fork" button in the upper right corner
   - Follow the prompts to create a fork in your GitHub account
2. **Clone your fork**
```bash
git clone https://github.com/your-username/opensyte.git
cd opensyte
```

### 2. Install dependencies

```bash
bun install
```

### 3. Environment Setup

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update the database credentials in the `.env` file if needed.

### 4. Start up a database

For Linux/macOS users:

```bash
./start-database.sh
```

<details>
<summary><b>📌 Windows Users: Click here for database setup instructions</b></summary>

To run the database on Windows:

1. **Install WSL (Windows Subsystem for Linux)**
   - Follow the official guide: [Microsoft WSL Installation](https://learn.microsoft.com/en-us/windows/wsl/install)

2. **Install a container platform**
   - Option 1: [Docker Desktop for Windows](https://docs.docker.com/docker-for-windows/install/)
   - Option 2: [Podman Desktop](https://podman.io/getting-started/installation)

3. **Open WSL (type this command inside a windows terminal inside the project folder)**
   ```
   wsl
   ```

> ⚠️ **Note**: Make sure Docker/Podman service is running before executing the script.

</details>

### 5. Set up the database schema

```bash
bun run db:push
```

### 6. Start the development server

```bash
bun run dev
```

Your app should now be running at [http://localhost:3000](http://localhost:3000)! 🎉

## 🗺️ Features Roadmap

OpenSyte aims to be an all-in-one business management solution with the following features:

| Feature | Status | Description |
|---------|--------|-------------|
| **Customer Relationship Management (CRM)** | | |
| Contact and Lead Management | ❌ Not implemented | Store and organize customer details, track leads |
| Sales Pipeline Tracking | ❌ Not implemented | Visualize and manage your sales process with stages |
| Customer Interaction History | ❌ Not implemented | Log emails, calls, and meetings for each customer |
| Task Management | ❌ Not implemented | Assign and track sales-related tasks |
| Analytics and Reporting | ❌ Not implemented | Gain insights into sales performance and forecasts |
| **Project Management** | | |
| Task Creation and Assignment | ❌ Not implemented | Break down projects into tasks with deadlines |
| Visual Tools (Gantt/Kanban) | ❌ Not implemented | Use Gantt charts and Kanban boards for tracking |
| Resource Management | ❌ Not implemented | Allocate team members to specific tasks |
| Time Tracking | ❌ Not implemented | Record time spent on tasks |
| Collaboration Features | ❌ Not implemented | Enable comments and file attachments within tasks |
| **Finance and Accounting** | | |
| Invoicing and Billing | ❌ Not implemented | Create, send, and automate invoices |
| Expense Tracking | ❌ Not implemented | Log and categorize expenses |
| Financial Reporting | ❌ Not implemented | Generate financial statements |
| Bank Integration | ❌ Not implemented | Sync with bank accounts |
| Multi-Currency Support | ❌ Not implemented | Handle transactions in different currencies |
| **Collaboration Tools** | | |
| Real-Time Chat | ❌ Not implemented | Communicate with your team |
| Video Conferencing | ❌ Not implemented | Host built-in video meetings |
| Document Sharing and Editing | ❌ Not implemented | Collaborate on documents |
| Shared Calendars | ❌ Not implemented | Schedule with team-wide visibility |
| Notifications | ❌ Not implemented | Stay updated with alerts |
| **Human Resources (HR) Management** | | |
| Employee Database | ❌ Not implemented | Store employee profiles |
| Payroll Management | ❌ Not implemented | Automate salary calculations |
| Performance Tracking | ❌ Not implemented | Record employee reviews and goals |
| Time-Off Management | ❌ Not implemented | Track vacation and attendance |
| Onboarding/Offboarding | ❌ Not implemented | Streamline processes for hiring/departures |
| **Marketing Automation** | | |
| Email Campaigns | ❌ Not implemented | Design and send bulk emails |
| Social Media Management | ❌ Not implemented | Schedule posts across platforms |
| Lead Nurturing | ❌ Not implemented | Automate follow-ups with leads |
| Analytics | ❌ Not implemented | Measure campaign success |

Want to contribute? Check out our [issues page](https://github.com/opensyte/opensyte/issues) to see what features we're currently working on!

## 📚 Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the development server |
| `bun run build` | Build the application for production |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run format:write` | Format code with Prettier |
| `bun run db:push` | Push the Prisma schema to the database |
| `bun run db:studio` | Open Prisma Studio to manage your database |

## 🧩 Technology Stack

- **Framework**: [Next.js](https://nextjs.org)
- **Database**: [Prisma](https://prisma.io)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com)
- **API**: [tRPC](https://trpc.io)
- **Runtime**: [Bun](https://bun.sh)

## 🚢 Deployment

Follow these deployment guides for:
- [Vercel](https://create.t3.gg/en/deployment/vercel)
- [Netlify](https://create.t3.gg/en/deployment/netlify)
- [Docker](https://create.t3.gg/en/deployment/docker)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

