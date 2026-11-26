# LogiCraft Django backend

The React/Vite application uses this Django API for persistent workspace data.
MySQL is the default database. Django migrations create the schema and seed the
workspace and model-backed order/shipment APIs with sample records from
`data/database.json` the first time a new database is initialized.

## Run locally

Create a MySQL database and user (or configure an existing MySQL account):

```sql
CREATE DATABASE logicraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'logicraft'@'localhost' IDENTIFIED BY 'change-this-password';
GRANT ALL PRIVILEGES ON logicraft.* TO 'logicraft'@'localhost';
```

From this directory, create `.env` from `.env.example` and set the MySQL
credentials. Then open a terminal and run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver 8001
```

The MySQL server must be running before `migrate` or `runserver`. MySQL
connection settings are `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`,
`MYSQL_HOST`, and `MYSQL_PORT`. Django uses MySQL by default. To explicitly
run the backend tests without MySQL, set
`DJANGO_DATABASE_ENGINE=sqlite` and `DJANGO_SQLITE_NAME=:memory:`.
In PowerShell, run:

```powershell
$env:DJANGO_DATABASE_ENGINE = "sqlite"
$env:DJANGO_SQLITE_NAME = ":memory:"
.\.venv\Scripts\python.exe manage.py test
```

In a second terminal, start the React app:

```powershell
cd ..\
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
Vite proxies `/api` requests to Django at `http://127.0.0.1:8001`. Set
`VITE_API_PROXY_TARGET` before starting Vite if Django is listening elsewhere.
The frontend keeps a browser cache for offline use and displays the backend
connection and save status.

## Django API

- `GET /api/health/` — backend health
- `GET /api/state/` — all persisted frontend collections
- `PUT /api/state/` — save one collection with
  `{"collection":"orders","data":[...]}`; `data` is a JSON array, except
  `settings`, which is a JSON object
- `GET /api/csrf/` — obtain a CSRF token for browser clients using the
  legacy order and shipment write endpoints
- `/api/orders/` and `/api/shipments/` — existing model-backed API routes

Workspace collections include orders, shipments, drivers, inventory, inbound
receipts, warehouse tasks and activity, conversations, notifications, invoices,
and settings. The workspace API preserves each frontend record's existing ID
and fields in MySQL's JSON column. The React app loads these collections from
Django at startup and saves frontend changes back to the API while retaining
the browser's local cache for offline use. The initial demo orders and
shipments are also seeded into the separate relational order/shipment tables
used by `/api/orders/` and `/api/shipments/`.

The separate `server.js` demo API is retained for compatibility, but the
React app connects to Django. This local development setup does not provide
user authentication or production deployment hardening.
