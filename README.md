
<center>
<img src="public/icon-with-text-white.svg" width="300" style=" padding: 8px; margin-bottom:10px;"/>
</center>

# 🚀 OpenSyte
An open source all-in-one business management software.


## 🛠️ Installation

Follow these steps to set up the project on your local machine:

### 1. Clone the repository

```bash
git clone <repository-url>
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

