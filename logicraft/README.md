# LogiCraft

LogiCraft is a React and Vite logistics operations dashboard backed by Django
and MySQL.

## Start the application

Set up MySQL and Django by following [backend/README.md](./backend/README.md).
Create a MySQL database named `logicraft` and set its connection credentials
in `backend/.env` (copy `backend/.env.example`).

Start Django in one terminal from `backend`:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 8001
```

Start Vite in another terminal from this directory:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Its `/api` proxy forwards requests to
Django. The initial migration imports the demo collections into MySQL, and
frontend changes are persisted there. Existing browser data is retained and
synced when the frontend starts.

See [backend/README.md](./backend/README.md) for API details and backend setup.
See [CODEBASE.md](./CODEBASE.md) for the application architecture and source
file guide.

Updated README for the version control assignment.
