# LogiCraft Codebase Guide

This document describes the application source, how its main pieces fit
together, and how to run and test them. The application project is the
`logicraft/` directory; dependency folders, build output, local databases, and
media binaries are not application source.

## What the application does

LogiCraft is a logistics operations dashboard. Its React interface includes
orders, shipments and tracking, drivers, warehouse inventory and tasks,
messages, invoices, analytics, and workspace settings. A public landing page
links to the dashboard. The frontend stores its working collections in browser
storage and synchronizes them with a Django API for persistence.

## Architecture and data flow

```text
Browser
  React/Vite UI
    localStorage collections
      src/api.js persistence and connection status
        /api/state/ (Django JSON workspace state)

  Django model API
    /api/orders/ and /api/shipments/
      relational Order and Shipment records

Optional legacy/demo process
  backend/server.js
    backend/data/database.json
```

The Vite development server proxies requests under `/api` to Django at
`http://127.0.0.1:8001` by default. Set `VITE_API_PROXY_TARGET` to use another
Django address.

The main dashboard UI uses the localStorage-backed workspace collections.
`src/api.js` loads backend state during startup, uses an existing browser cache
when one is present, and writes collection changes back to Django. Saves are
queued and batched; the UI exposes connecting, saving, connected, and offline
states and offers a retry action. The browser cache remains available if Django
cannot be reached.

The workspace-state API and the model-backed order/shipment API are distinct
storage surfaces. The former stores whole frontend collections in one JSON
field. The latter uses relational database models and is available to other
clients or legacy integrations; it is not the dashboard's primary data path.
Migrations seed demo workspace data and separate relational order/shipment
records.

## Frontend source map

| File | Responsibility |
| --- | --- |
| `index.html` | Vite HTML entry point, root element, page title, and favicon. |
| `src/main.jsx` | Creates the React root, initializes backend persistence, then renders the app in `StrictMode`. |
| `src/App.jsx` | Chooses the landing page or `/dashboard` by pathname and displays Django connection status. |
| `src/api.js` | Maps localStorage keys to backend collection names; fetches and saves workspace state; manages retries, queued writes, and connection status. |
| `src/landing.jsx` | Public landing page, navigation, hero content, and hero-video controls. |
| `src/Navbar.jsx` | Landing-page navigation links and dashboard entry link. |
| `src/dashboard.jsx` | Dashboard shell, sidebar navigation, overview, shipment tracking and maps, analytics, and settings. |
| `src/Orders.jsx` | Order list and order creation/editing UI. |
| `src/Shipments.jsx` | Shipment list and shipment creation and status-management UI. |
| `src/Drivers.jsx` | Driver and vehicle assignment/availability UI. |
| `src/Warehouse.jsx` | Inventory, inbound receipts, picking tasks, and warehouse activity UI. |
| `src/Messages.jsx` | Conversations, notifications, and conversation creation UI. |
| `src/Invoices.jsx` | Invoice and billing UI based on workspace orders and shipments. |
| `src/orderData.js` | Sample order collection used when local data is absent. |
| `src/shipmentData.js` | Sample shipment collection used when local data is absent. |
| `src/index.css` | Global styles and shared base styles. |
| `src/App.css` | App-level and backend-connection status styles. |
| `src/landing.css` | Landing page styles. |
| `src/Navbar.css` | Landing navigation styles. |
| `src/dashboard.css` | Dashboard, modules, and responsive layout styles. |
| `src/assets/` | Imported visual assets, including the hero image and starter React/Vite SVGs. |

Dashboard navigation is hash-based within `/dashboard`. Its sections include
Dashboard, Tracking, Orders, Shipments, Warehouse, Drivers, Messages, Invoices
& Billing, Analytics, and Settings. The dashboard uses Leaflet for shipment map
views. A Google Maps key can be configured through `VITE_GOOGLE_MAPS_API_KEY`
where that integration is enabled; the Leaflet map is also available.

### Browser persistence keys

`src/api.js` synchronizes these browser keys to collections on `/api/state/`:

| localStorage key | Workspace collection |
| --- | --- |
| `logicraft-orders-v1` | `orders` |
| `logicraft-shipments-v1` | `shipments` |
| `logicraft-drivers-v1` | `drivers` |
| `logicraft-warehouse-inventory-v1` | `inventory` |
| `logicraft-warehouse-inbound-v1` | `inbound` |
| `logicraft-warehouse-pick-tasks-v1` | `tasks` |
| `logicraft-warehouse-activity-v1` | `activity` |
| `logicraft-conversations-v1` | `conversations` |
| `logicraft-message-notifications-v1` | `notifications` |
| `logicraft-invoices-v1` | `invoices` |
| `logicraft-settings-v1` | `settings` |

All collection values are JSON arrays except `settings`, which is a JSON
object. Individual records in arrays must have unique string or integer `id`
values.

## Backend source map

| File or directory | Responsibility |
| --- | --- |
| `backend/manage.py` | Django command-line entry point. |
| `backend/config/settings.py` | Django apps and middleware, CORS, REST framework, environment variables, and MySQL/SQLite database configuration. |
| `backend/config/urls.py` | Root URL configuration; mounts the admin and logistics API. |
| `backend/config/asgi.py`, `backend/config/wsgi.py` | ASGI and WSGI application entry points. |
| `backend/logistics/models.py` | Relational `Order`, `Shipment`, and JSON `WorkspaceState` models. |
| `backend/logistics/serializers.py` | Workspace collection shape, record-ID, and uniqueness validation. |
| `backend/logistics/views.py` | Health and CSRF endpoints, workspace state persistence, and relational order/shipment handlers. |
| `backend/logistics/urls.py` | Logistics API route definitions. |
| `backend/logistics/admin.py` | Django admin registration for relational orders and shipments. |
| `backend/logistics/tests.py` | API tests for health checks, seed records, CRUD, validation, CSRF, and workspace updates. |
| `backend/logistics/migrations/` | Database schema changes and demo data migrations. |
| `backend/data/database.json` | Demo workspace data used by migrations and the retained Node server. |
| `backend/requirements.txt` | Python dependency pins. |

### Data models

- **Order** stores customer contact details, pickup and delivery, item,
  quantity, weight, status, and creation time. Orders can have multiple
  shipments.
- **Shipment** belongs to an order and stores tracking ID, driver, vehicle,
  status, location, ETA, and timestamps. Tracking IDs are unique.
- **WorkspaceState** stores the UI's workspace collections in a single JSON
  object.

The workspace and relational models are deliberately separate: updating one
API does not automatically make its records identical to the other.

### Django API

All Django routes are prefixed with `/api/`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Checks database connectivity and reports service health. |
| `GET` | `/api/state/` | Returns the persisted workspace object as `{"data": ...}`. |
| `PUT` | `/api/state/` | Updates one collection using `{"collection": "...", "data": ...}`. |
| `GET` | `/api/csrf/` | Issues a CSRF cookie and returns a token for browser clients. |
| `GET`, `POST` | `/api/orders/` | Lists relational orders or creates one. |
| `GET`, `PATCH`, `DELETE` | `/api/orders/<id>/` | Reads, partially updates, or deletes one relational order. |
| `GET`, `POST` | `/api/shipments/` | Lists relational shipments or creates one. |
| `GET`, `PATCH`, `DELETE` | `/api/shipments/<id>/` | Reads, partially updates, or deletes one relational shipment. |

Order and shipment list responses contain `data` and `total`; individual
records are wrapped in `data`. Invalid request bodies and field values return
JSON errors. Missing records return 404, and duplicate shipment tracking IDs
return 409. Shipment creation requires an existing order.

### Retained Node demo API

`backend/server.js` is a standalone Node HTTP server retained for compatibility
and local demos. It reads and writes JSON in `backend/data/database.json` and
has its own collection-oriented API. It is not the API used by the React app's
default Vite proxy, which targets Django. Its scripts are in
`backend/package.json`.

## Static assets and generated files

- `public/` contains the favicon, shared SVG icons, hero/fleet/warehouse media,
  and images served directly by Vite.
- `src/assets/` contains assets imported by frontend modules.
- `dist/` is generated by a frontend production build.
- `node_modules/`, Python virtual environments, and `backend/db.sqlite3` are
  local dependencies or database files, not source modules.

## Local development

See `README.md` for the full setup. In brief:

1. Configure MySQL and create `backend/.env` from `backend/.env.example`.
   Django uses MySQL by default. SQLite can be selected for tests.
2. From `backend/`, install Python requirements and migrate:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   .\.venv\Scripts\python.exe manage.py migrate
   .\.venv\Scripts\python.exe manage.py runserver 8001
   ```

3. From the project root, install JavaScript dependencies and start Vite:

   ```powershell
   npm install
   npm run dev
   ```

Important backend environment variables are documented in
`backend/.env.example`: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`,
`DJANGO_ALLOWED_HOSTS`, and the `MYSQL_*` connection settings. For isolated
backend tests, set `DJANGO_DATABASE_ENGINE=sqlite` and
`DJANGO_SQLITE_NAME=:memory:`. The frontend proxy target is
`VITE_API_PROXY_TARGET`; the optional map key is `VITE_GOOGLE_MAPS_API_KEY`.
Do not commit real credentials or secret keys.

## Build, lint, and tests

From the project root:

```powershell
npm run build
npm run lint
```

Backend tests run through Django's test runner. For example, from `backend/`
in PowerShell:

```powershell
$env:DJANGO_DATABASE_ENGINE = "sqlite"
$env:DJANGO_SQLITE_NAME = ":memory:"
.\.venv\Scripts\python.exe manage.py test
```

The existing backend tests cover endpoint behavior and validation. There is no
frontend test script defined in `package.json`.

## Deployment and authentication notes

The checked-in configuration is intended for local development. The backend
currently allows unauthenticated API access and is not production hardened.
Before deployment, configure a production secret and allowed hosts, disable
debug mode, use an appropriately secured database, and implement the
authentication and authorization requirements for the deployment.


## Complete text-based source and configuration

The following is a consolidated copy of every maintained text-based source, configuration, migration, and demo data file in this project. Each section is the file content as it exists in the project. Binary images and videos, generated build output, installed dependencies, local databases, and real `.env` files are excluded.

Included files: 54.

### `.env.example`

```text
VITE_GOOGLE_MAPS_API_KEY=your_browser_key
```

### `.gitignore`

```text
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

/backend/.env
/backend/.venv/
/backend/__pycache__/
/backend/**/__pycache__/
/backend/*.py[cod]
/backend/**/**/*.py[cod]
/backend/db.sqlite3
/backend/staticfiles/
node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

### `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "oxc"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

### `backend/.env.example`

```text
DJANGO_SECRET_KEY=replace-this-with-a-long-random-secret
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

MYSQL_DATABASE=logicraft
MYSQL_USER=logicraft
MYSQL_PASSWORD=change-this-password
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306

# Set to sqlite only when running the backend tests without a MySQL server.
# DJANGO_DATABASE_ENGINE=sqlite
# DJANGO_SQLITE_NAME=:memory:
```

### `backend/config/__init__.py`

```python

```

### `backend/config/asgi.py`

```python
"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()
```

### `backend/config/settings.py`

```python
"""
Django settings for config project.

Generated by 'django-admin startproject' using Django 5.2.18.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-local-development-only')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',

    'logistics',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASE_ENGINE = os.getenv('DJANGO_DATABASE_ENGINE', 'mysql').lower()
if DATABASE_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': os.getenv('DJANGO_SQLITE_NAME', str(BASE_DIR / 'db.sqlite3')),
        }
    }
elif DATABASE_ENGINE == 'mysql':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.getenv('MYSQL_DATABASE', 'logicraft'),
            'USER': os.getenv('MYSQL_USER', 'root'),
            'PASSWORD': os.getenv('MYSQL_PASSWORD', ''),
            'HOST': os.getenv('MYSQL_HOST', '127.0.0.1'),
            'PORT': os.getenv('MYSQL_PORT', '3306'),
            'OPTIONS': {'charset': 'utf8mb4'},
            'CONN_MAX_AGE': 60,
        }
    }
else:
    raise ValueError('DJANGO_DATABASE_ENGINE must be either "mysql" or "sqlite".')


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

### `backend/config/urls.py`

```python
"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('logistics.urls')),
]
```

### `backend/config/wsgi.py`

```python
"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
```

### `backend/data/database.json`

```json
{
  "orders": [
    {
      "id": "ORD-2026-10482",
      "customer": "Northstar Retail",
      "email": "ops@northstar.example",
      "phone": "+1 (312) 555-0184",
      "pickup": "Newark Distribution Center, NJ",
      "delivery": "Chicago Fulfillment Hub, IL",
      "item": "Consumer electronics",
      "quantity": 48,
      "weight": 620,
      "pickupDate": "2026-10-01",
      "deliveryDate": "2026-10-03",
      "instructions": "Keep cartons upright. Call receiving 30 minutes before arrival.",
      "status": "Active",
      "shipment": "SHP-2026-08421",
      "tracking": "TRK-2026-08421",
      "driver": "Christina Kamberina",
      "vehicle": "VAN-204 · Box truck",
      "eta": "Oct 03, 10:30 AM",
      "history": [
        {
          "label": "Order created",
          "date": "Oct 01, 2026",
          "note": "Order confirmed by Northstar Retail"
        }
      ]
    },
    {
      "id": "ORD-2026-10476",
      "customer": "Harbor & Pine",
      "email": "logistics@harborpine.example",
      "phone": "+1 (617) 555-0127",
      "pickup": "Queens Sorting Center, NY",
      "delivery": "Boston Retail Warehouse, MA",
      "item": "Home goods",
      "quantity": 26,
      "weight": 340,
      "pickupDate": "2026-10-01",
      "deliveryDate": "2026-10-02",
      "instructions": "Dock 4. Delivery window 1:00 PM to 4:00 PM.",
      "status": "Pending",
      "shipment": "Not assigned",
      "tracking": "Not assigned",
      "driver": "Not assigned",
      "vehicle": "Not assigned",
      "eta": "Awaiting dispatch",
      "history": [
        {
          "label": "Order created",
          "date": "Oct 01, 2026",
          "note": "Awaiting dispatch assignment"
        }
      ]
    },
    {
      "id": "ORD-2026-10438",
      "customer": "Evergreen Supply Co.",
      "email": "warehouse@evergreen.example",
      "phone": "+1 (206) 555-0141",
      "pickup": "Portland Cross-Dock, OR",
      "delivery": "Seattle South Warehouse, WA",
      "item": "Packaged food",
      "quantity": 110,
      "weight": 840,
      "pickupDate": "2026-09-30",
      "deliveryDate": "2026-10-01",
      "instructions": "Temperature-controlled vehicle required.",
      "status": "Completed",
      "shipment": "SHP-2026-08396",
      "tracking": "TRK-2026-08396",
      "driver": "Avery Chen",
      "vehicle": "VAN-092 · Box truck",
      "eta": "Delivered Oct 01, 9:42 AM",
      "history": [
        {
          "label": "Delivered",
          "date": "Oct 01, 2026",
          "note": "Received by warehouse team"
        }
      ]
    }
  ],
  "shipments": [
    {
      "id": "SHP-2026-08421",
      "tracking": "TRK-2026-08421",
      "orderId": "ORD-2026-10482",
      "customer": "Northstar Retail",
      "pickup": "Newark Distribution Center, NJ",
      "destination": "Chicago Fulfillment Hub, IL",
      "driver": "Christina Kamberina",
      "vehicle": "VAN-204 · Box truck",
      "status": "In Transit",
      "deliveryDate": "2026-10-03",
      "eta": "Oct 03, 10:30 AM",
      "etaConfidence": "94%",
      "etaType": "ML predicted",
      "currentLocation": "I-80, near Joliet, IL",
      "history": [
        {
          "status": "In Transit",
          "date": "Oct 01, 1:25 PM",
          "location": "I-80, near Joliet, IL"
        }
      ]
    },
    {
      "id": "SHP-2026-08396",
      "tracking": "TRK-2026-08396",
      "orderId": "ORD-2026-10438",
      "customer": "Evergreen Supply Co.",
      "pickup": "Portland Cross-Dock, OR",
      "destination": "Seattle South Warehouse, WA",
      "driver": "Avery Chen",
      "vehicle": "VAN-092 · Box truck",
      "status": "Delivered",
      "deliveryDate": "2026-10-01",
      "eta": "Delivered Oct 01, 9:42 AM",
      "etaConfidence": "99%",
      "etaType": "ML predicted",
      "currentLocation": "Seattle South Warehouse, WA",
      "history": [
        {
          "status": "Delivered",
          "date": "Oct 01, 9:42 AM",
          "location": "Seattle South Warehouse, WA"
        }
      ]
    }
  ],
  "drivers": [
    {
      "id": "DRV-032",
      "name": "Christina Kamberina",
      "phone": "+1 (312) 555-0184",
      "email": "christina.k@logicraft.example",
      "licenseNumber": "IL-C4821-3904",
      "licenseClass": "Class A",
      "licenseExpiry": "2028-04-18",
      "availability": "On Trip",
      "vehicle": "VAN-204 · Box truck",
      "completedTrips": 86,
      "onTimeRate": 96,
      "rating": 4.9,
      "tripHistory": []
    },
    {
      "id": "DRV-092",
      "name": "Avery Chen",
      "phone": "+1 (206) 555-0141",
      "email": "avery.chen@logicraft.example",
      "licenseNumber": "WA-C2044-6218",
      "licenseClass": "Class C",
      "licenseExpiry": "2028-08-30",
      "availability": "Available",
      "vehicle": "VAN-092 · Box truck",
      "completedTrips": 68,
      "onTimeRate": 98,
      "rating": 5,
      "tripHistory": []
    },
    {
      "id": "DRV-018",
      "name": "Daniel Brooks",
      "phone": "+1 (617) 555-0127",
      "email": "daniel.b@logicraft.example",
      "licenseNumber": "MA-B1377-8540",
      "licenseClass": "Class B",
      "licenseExpiry": "2027-11-02",
      "availability": "Available",
      "vehicle": "VAN-118 · Cargo van",
      "completedTrips": 54,
      "onTimeRate": 93,
      "rating": 4.8,
      "tripHistory": []
    }
  ],
  "inventory": [
    {
      "id": "SKU-EL-104",
      "name": "Wireless charging dock",
      "category": "Electronics",
      "location": "A-01-03",
      "onHand": 420,
      "reserved": 82,
      "reorderPoint": 100,
      "unit": "units"
    },
    {
      "id": "SKU-HG-221",
      "name": "Stoneware dinner set",
      "category": "Home goods",
      "location": "B-03-07",
      "onHand": 74,
      "reserved": 22,
      "reorderPoint": 80,
      "unit": "sets"
    },
    {
      "id": "SKU-FD-030",
      "name": "Organic ground coffee",
      "category": "Food & beverage",
      "location": "C-02-01",
      "onHand": 1620,
      "reserved": 190,
      "reorderPoint": 250,
      "unit": "cases"
    },
    {
      "id": "SKU-PK-512",
      "name": "Shipping cartons · M",
      "category": "Packaging",
      "location": "D-01-12",
      "onHand": 2830,
      "reserved": 360,
      "reorderPoint": 400,
      "unit": "cartons"
    }
  ],
  "inbound": [
    {
      "id": "RCV-2026-0418",
      "supplier": "Evergreen Supply Co.",
      "purchaseOrder": "PO-11842",
      "itemId": "SKU-EL-104",
      "quantity": 240,
      "eta": "Oct 02 · 9:30 AM",
      "dock": "Dock 02",
      "status": "Expected"
    },
    {
      "id": "RCV-2026-0417",
      "supplier": "Harbor Home Imports",
      "purchaseOrder": "PO-11831",
      "itemId": "SKU-HG-221",
      "quantity": 120,
      "eta": "Oct 02 · 1:00 PM",
      "dock": "Dock 04",
      "status": "Expected"
    }
  ],
  "tasks": [
    {
      "id": "PICK-ORD-2026-10482",
      "orderId": "ORD-2026-10482",
      "customer": "Northstar Retail",
      "item": "Consumer electronics",
      "quantity": 48,
      "destination": "Chicago Fulfillment Hub, IL",
      "status": "Dispatched",
      "shipmentId": "SHP-2026-08421"
    },
    {
      "id": "PICK-ORD-2026-10476",
      "orderId": "ORD-2026-10476",
      "customer": "Harbor & Pine",
      "item": "Home goods",
      "quantity": 26,
      "destination": "Boston Retail Warehouse, MA",
      "status": "Awaiting Pick",
      "shipmentId": ""
    }
  ],
  "conversations": [
    {
      "id": "CONV-DRIVER-032",
      "name": "Christina Kamberina",
      "role": "Driver",
      "initials": "CK",
      "presence": "On trip",
      "unread": 1,
      "context": "SHP-2026-08421",
      "contextLabel": "In transit · Newark to Chicago",
      "latest": "Traffic has slowed near Joliet. Still on track for the current ETA.",
      "updated": "1:25 PM",
      "messages": [
        {
          "id": "MSG-001",
          "from": "contact",
          "text": "Traffic has slowed near Joliet. Still on track for the current ETA.",
          "time": "1:25 PM"
        }
      ]
    }
  ],
  "notifications": [],
  "invoices": [
    {
      "id": "INV-2026-00918",
      "orderId": "ORD-2026-10438",
      "customer": "Evergreen Supply Co.",
      "amount": 8420.5,
      "currency": "USD",
      "issuedOn": "2026-09-20",
      "dueOn": "2026-09-27",
      "status": "Paid",
      "paidOn": "2026-09-25",
      "memo": "Freight service · Portland to Seattle",
      "history": [
        {
          "action": "Payment received",
          "date": "Sep 25, 2026",
          "detail": "Paid in full · ACH transfer"
        }
      ]
    },
    {
      "id": "INV-2026-00924",
      "orderId": "ORD-2026-10482",
      "customer": "Northstar Retail",
      "amount": 3675,
      "currency": "USD",
      "issuedOn": "2026-10-01",
      "dueOn": "2026-10-15",
      "status": "Pending",
      "paidOn": "",
      "memo": "Line-haul freight · Newark to Chicago",
      "history": [
        {
          "action": "Invoice sent",
          "date": "Oct 01, 2026",
          "detail": "Invoice issued for freight service"
        }
      ]
    }
  ],
  "settings": {
    "company": "LogiCraft Logistics",
    "timezone": "America/Chicago",
    "emailNotifications": true
  }
}
```

### `backend/logistics/__init__.py`

```python

```

### `backend/logistics/admin.py`

```python
from django.contrib import admin

from .models import Order, Shipment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'pickup', 'delivery', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer', 'email', 'pickup', 'delivery')


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'tracking', 'order', 'status', 'driver', 'updated_at')
    list_filter = ('status', 'updated_at')
    search_fields = ('tracking', 'driver', 'vehicle', 'current_location')
```

### `backend/logistics/apps.py`

```python
from django.apps import AppConfig


class LogisticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'logistics'
```

### `backend/logistics/migrations/0001_initial.py`

```python
# Generated by Django 5.2.18 on 2026-10-30 06:35

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer', models.CharField(max_length=200)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('phone', models.CharField(blank=True, max_length=50)),
                ('pickup', models.CharField(max_length=300)),
                ('delivery', models.CharField(max_length=300)),
                ('item', models.CharField(blank=True, max_length=200)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('weight', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Active', 'Active'), ('Completed', 'Completed'), ('Cancelled', 'Cancelled')], default='Pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='Shipment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tracking', models.CharField(max_length=80, unique=True)),
                ('driver', models.CharField(blank=True, max_length=200)),
                ('vehicle', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(choices=[('Ready for Pickup', 'Ready for Pickup'), ('Picked Up', 'Picked Up'), ('In Transit', 'In Transit'), ('Out for Delivery', 'Out for Delivery'), ('Delivered', 'Delivered'), ('Delayed', 'Delayed')], default='Ready for Pickup', max_length=30)),
                ('current_location', models.CharField(blank=True, max_length=300)),
                ('eta', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shipments', to='logistics.order')),
            ],
        ),
    ]
```

### `backend/logistics/migrations/0002_workspace_state.py`

```python
import json
from pathlib import Path

from django.db import migrations, models


def load_demo_state(apps, schema_editor):
    state_file = Path(__file__).resolve().parents[2] / 'data' / 'database.json'
    if not state_file.is_file():
        return

    with state_file.open(encoding='utf-8') as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError('The workspace seed file must contain a JSON object.')

    WorkspaceState = apps.get_model('logistics', 'WorkspaceState')
    WorkspaceState.objects.using(schema_editor.connection.alias).get_or_create(
        pk=1,
        defaults={'data': data},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkspaceState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.RunPython(load_demo_state, migrations.RunPython.noop),
    ]
```

### `backend/logistics/migrations/0003_seed_model_records.py`

```python
import json
from pathlib import Path

from django.db import migrations


def seed_model_records(apps, schema_editor):
    using = schema_editor.connection.alias
    Order = apps.get_model('logistics', 'Order')
    Shipment = apps.get_model('logistics', 'Shipment')

    if Order.objects.using(using).exists():
        return

    state_file = Path(__file__).resolve().parents[2] / 'data' / 'database.json'
    if not state_file.is_file():
        return

    with state_file.open(encoding='utf-8') as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError('The workspace seed file must contain a JSON object.')

    order_ids = {}
    for record in data.get('orders', []):
        order = Order.objects.using(using).create(
            customer=record['customer'],
            email=record.get('email', ''),
            phone=record.get('phone', ''),
            pickup=record['pickup'],
            delivery=record['delivery'],
            item=record.get('item', ''),
            quantity=record.get('quantity', 1),
            weight=record.get('weight', 0),
            status=record.get('status', 'Pending'),
        )
        order_ids[record['id']] = order.pk

    for record in data.get('shipments', []):
        order_id = order_ids.get(record.get('orderId'))
        if order_id is None:
            continue
        Shipment.objects.using(using).create(
            order_id=order_id,
            tracking=record['tracking'],
            driver=record.get('driver', ''),
            vehicle=record.get('vehicle', ''),
            status=record.get('status', 'Ready for Pickup'),
            current_location=record.get('currentLocation', ''),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0002_workspace_state'),
    ]

    operations = [
        migrations.RunPython(seed_model_records, migrations.RunPython.noop),
    ]
```

### `backend/logistics/migrations/__init__.py`

```python

```

### `backend/logistics/models.py`

```python
from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        ACTIVE = 'Active', 'Active'
        COMPLETED = 'Completed', 'Completed'
        CANCELLED = 'Cancelled', 'Cancelled'

    customer = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    pickup = models.CharField(max_length=300)
    delivery = models.CharField(max_length=300)
    item = models.CharField(max_length=200, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.customer} · Order {self.pk}'


class Shipment(models.Model):
    class Status(models.TextChoices):
        READY = 'Ready for Pickup', 'Ready for Pickup'
        PICKED_UP = 'Picked Up', 'Picked Up'
        IN_TRANSIT = 'In Transit', 'In Transit'
        OUT_FOR_DELIVERY = 'Out for Delivery', 'Out for Delivery'
        DELIVERED = 'Delivered', 'Delivered'
        DELAYED = 'Delayed', 'Delayed'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='shipments')
    tracking = models.CharField(max_length=80, unique=True)
    driver = models.CharField(max_length=200, blank=True)
    vehicle = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.READY)
    current_location = models.CharField(max_length=300, blank=True)
    eta = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.tracking


class WorkspaceState(models.Model):
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return 'LogiCraft workspace state'
```

### `backend/logistics/serializers.py`

```python
from rest_framework import serializers


WORKSPACE_COLLECTIONS = (
    'orders',
    'shipments',
    'drivers',
    'inventory',
    'inbound',
    'tasks',
    'conversations',
    'notifications',
    'invoices',
    'settings',
    'activity',
)


class WorkspaceCollectionUpdateSerializer(serializers.Serializer):
    collection = serializers.ChoiceField(choices=WORKSPACE_COLLECTIONS)
    data = serializers.JSONField()

    def validate(self, attrs):
        collection = attrs['collection']
        data = attrs['data']
        expected_type = dict if collection == 'settings' else list
        if not isinstance(data, expected_type):
            raise serializers.ValidationError({
                'data': f'{collection} must be a JSON {expected_type.__name__}.',
            })
        if isinstance(data, list):
            identifiers = set()
            for index, record in enumerate(data):
                if not isinstance(record, dict):
                    raise serializers.ValidationError({
                        'data': f'Item {index} in {collection} must be a JSON object.',
                    })
                identifier = record.get('id')
                if isinstance(identifier, bool) or not isinstance(identifier, (str, int)) or not str(identifier).strip():
                    raise serializers.ValidationError({
                        'data': f'Item {index} in {collection} must have a non-empty string or integer id.',
                    })
                if identifier in identifiers:
                    raise serializers.ValidationError({
                        'data': f'{collection} cannot contain duplicate ids.',
                    })
                identifiers.add(identifier)
        return attrs
```

### `backend/logistics/tests.py`

```python
import json

from django.test import TestCase


class LogisticsApiTests(TestCase):
    def test_health_checks_database_connection(self):
        response = self.client.get('/api/health/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')

    def test_workspace_starts_with_demo_collections(self):
        state = self.client.get('/api/state/').json()['data']

        self.assertEqual(state['orders'][0]['id'], 'ORD-2026-10482')
        self.assertEqual(state['shipments'][0]['tracking'], 'TRK-2026-08421')
        self.assertEqual(len(state['drivers']), 3)
        self.assertGreater(len(state['inventory']), 0)

    def test_model_apis_start_with_seeded_demo_orders_and_shipments(self):
        orders = self.client.get('/api/orders/').json()
        shipments = self.client.get('/api/shipments/').json()

        self.assertEqual(orders['total'], 3)
        self.assertTrue(any(record['customer'] == 'Evergreen Supply Co.' for record in orders['data']))
        self.assertEqual(shipments['total'], 2)
        self.assertTrue(any(record['tracking'] == 'TRK-2026-08421' for record in shipments['data']))

    def test_orders_can_be_created_listed_and_updated(self):
        created = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
                'quantity': 2,
                'weight': 25,
            }),
            content_type='application/json',
        )
        self.assertEqual(created.status_code, 201)
        order_id = created.json()['data']['id']

        updated = self.client.patch(
            f'/api/orders/{order_id}/',
            data=json.dumps({'status': 'Active'}),
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['status'], 'Active')
        listed = self.client.get('/api/orders/').json()
        self.assertEqual(listed['total'], 4)
        self.assertTrue(any(record['id'] == order_id for record in listed['data']))

        deleted = self.client.delete(f'/api/orders/{order_id}/')
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.json(), {'deleted': True})

    def test_order_rejects_invalid_decimal_precision_and_field_lengths(self):
        base = {
            'customer': 'Test Freight Co.',
            'pickup': 'New York, NY',
            'delivery': 'Boston, MA',
        }
        for invalid_fields in (
            {'weight': '1.234'},
            {'customer': 'x' * 201},
            {'quantity': True},
        ):
            with self.subTest(invalid_fields=invalid_fields):
                response = self.client.post(
                    '/api/orders/',
                    data=json.dumps({**base, **invalid_fields}),
                    content_type='application/json',
                )
                self.assertEqual(response.status_code, 400)

    def test_shipment_requires_existing_order_and_appears_in_order(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']

        created = self.client.post(
            '/api/shipments/',
            data=json.dumps({
                'orderId': order['id'],
                'tracking': 'TRK-TEST-1',
                'status': 'In Transit',
                'currentLocation': 'Hartford, CT',
            }),
            content_type='application/json',
        )
        self.assertEqual(created.status_code, 201)

        detail = self.client.get(f"/api/orders/{order['id']}/")
        self.assertEqual(detail.json()['data']['shipments'][0]['tracking'], 'TRK-TEST-1')

    def test_shipment_tracking_conflict_on_update_returns_conflict(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']
        shipment_ids = []
        for tracking in ('TRK-TEST-A', 'TRK-TEST-B'):
            response = self.client.post(
                '/api/shipments/',
                data=json.dumps({'orderId': order['id'], 'tracking': tracking}),
                content_type='application/json',
            )
            shipment_ids.append(response.json()['data']['id'])

        response = self.client.patch(
            f'/api/shipments/{shipment_ids[1]}/',
            data=json.dumps({'tracking': 'TRK-TEST-A'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 409)

        unchanged = self.client.get(f'/api/shipments/{shipment_ids[1]}/')
        self.assertEqual(unchanged.json()['data']['tracking'], 'TRK-TEST-B')

    def test_shipment_rejects_invalid_eta(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']

        response = self.client.post(
            '/api/shipments/',
            data=json.dumps({
                'orderId': order['id'],
                'tracking': 'TRK-TEST-ETA',
                'eta': False,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_order_is_rejected(self):
        response = self.client.post(
            '/api/orders/',
            data=json.dumps({'customer': '', 'pickup': '', 'delivery': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_api_exposes_csrf_token_for_browser_clients(self):
        client = self.client_class(enforce_csrf_checks=True)
        response = client.get('/api/csrf/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('csrftoken', response.cookies)
        self.assertTrue(response.json()['csrfToken'])

    def test_workspace_state_preserves_and_updates_frontend_collections(self):
        initial = self.client.get('/api/state/')
        self.assertEqual(initial.status_code, 200)
        self.assertIn('orders', initial.json()['data'])

        updated_orders = [
            {
                'id': 'ORD-TEST-1',
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
                'status': 'Pending',
            },
        ]
        updated = self.client.put(
            '/api/state/',
            data=json.dumps({'collection': 'orders', 'data': updated_orders}),
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['orders'], updated_orders)
        self.assertEqual(
            self.client.get('/api/state/').json()['data']['orders'],
            updated_orders,
        )

    def test_workspace_state_rejects_invalid_collection_shapes(self):
        response = self.client.put(
            '/api/state/',
            data=json.dumps({'collection': 'shipments', 'data': {'id': 'not-a-list'}}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_workspace_state_rejects_records_without_unique_ids(self):
        response = self.client.put(
            '/api/state/',
            data=json.dumps({
                'collection': 'drivers',
                'data': [{'id': 'DRV-1'}, {'id': 'DRV-1'}],
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
```

### `backend/logistics/urls.py`

```python
from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health, name='api-health'),
    path('state/', views.WorkspaceStateView.as_view(), name='workspace-state'),
    path('csrf/', views.csrf_token, name='api-csrf-token'),
    path('orders/', views.orders, name='orders'),
    path('orders/<int:order_id>/', views.order_detail, name='order-detail'),
    path('shipments/', views.shipments, name='shipments'),
    path('shipments/<int:shipment_id>/', views.shipment_detail, name='shipment-detail'),
]
```

### `backend/logistics/views.py`

```python
import json
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, connection, transaction
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, Shipment, WorkspaceState
from .serializers import WorkspaceCollectionUpdateSerializer


def json_error(message, status):
    return JsonResponse({'error': message}, status=status)


def parse_body(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValueError('Request body must contain valid JSON.') from None
    if not isinstance(body, dict):
        raise ValueError('Request body must be a JSON object.')
    return body


def order_data(order):
    return {
        'id': order.pk,
        'customer': order.customer,
        'email': order.email,
        'phone': order.phone,
        'pickup': order.pickup,
        'delivery': order.delivery,
        'item': order.item,
        'quantity': order.quantity,
        'weight': str(order.weight),
        'status': order.status,
        'shipments': [shipment_data(item) for item in order.shipments.all()],
        'createdAt': order.created_at.isoformat(),
    }


def shipment_data(shipment):
    return {
        'id': shipment.pk,
        'orderId': shipment.order_id,
        'tracking': shipment.tracking,
        'driver': shipment.driver,
        'vehicle': shipment.vehicle,
        'status': shipment.status,
        'currentLocation': shipment.current_location,
        'eta': shipment.eta.isoformat() if shipment.eta else None,
        'createdAt': shipment.created_at.isoformat(),
        'updatedAt': shipment.updated_at.isoformat(),
    }


def validate_order(data, partial=False):
    required_fields = ('customer', 'pickup', 'delivery')
    field_lengths = {
        'customer': 200,
        'email': 254,
        'phone': 50,
        'pickup': 300,
        'delivery': 300,
        'item': 200,
    }
    for field in required_fields:
        if (not partial or field in data) and (
            not isinstance(data.get(field), str) or not data[field].strip()
        ):
            raise ValueError(f'{field} is required and must be a non-empty string.')

    for field, max_length in field_lengths.items():
        if field in data and (
            not isinstance(data[field], str) or len(data[field]) > max_length
        ):
            raise ValueError(f'{field} must be a string no longer than {max_length} characters.')

    if data.get('email'):
        try:
            validate_email(data['email'])
        except ValidationError:
            raise ValueError('email must be a valid email address.') from None

    if 'quantity' in data:
        if (
            isinstance(data['quantity'], bool)
            or not isinstance(data['quantity'], int)
            or not 1 <= data['quantity'] <= 4294967295
        ):
            raise ValueError('quantity must be a whole number between 1 and 4294967295.')

    if 'weight' in data:
        try:
            weight = Decimal(str(data['weight']))
        except (InvalidOperation, TypeError):
            raise ValueError('weight must be a non-negative number.') from None
        if not weight.is_finite() or weight < 0 or weight >= Decimal('100000000') or max(0, -weight.as_tuple().exponent) > 2:
            raise ValueError('weight must be a non-negative number.')

    if 'status' in data and data['status'] not in Order.Status.values:
        raise ValueError('status must be Pending, Active, Completed, or Cancelled.')


def apply_order_fields(order, data):
    for field in ('customer', 'pickup', 'delivery', 'email', 'phone', 'item', 'quantity', 'weight', 'status'):
        if field in data:
            setattr(order, field, data[field])


def validate_shipment(data, partial=False):
    required = ('orderId', 'tracking')
    for field in required:
        if not partial or field in data:
            value = data.get(field)
            if (
                isinstance(value, bool)
                or not isinstance(value, (str, int))
                or not str(value).strip()
            ):
                raise ValueError(f'{field} is required.')

    if 'orderId' in data:
        try:
            data['orderId'] = int(data['orderId'])
        except (ValueError, TypeError, OverflowError):
            raise ValueError('orderId must refer to an existing order.') from None
        if data['orderId'] < 1 or not Order.objects.filter(pk=data['orderId']).exists():
            raise ValueError('orderId must refer to an existing order.')

    field_lengths = {
        'tracking': 80,
        'driver': 200,
        'vehicle': 200,
        'currentLocation': 300,
    }
    for field, max_length in field_lengths.items():
        if field in data and (
            not isinstance(data[field], str) or len(data[field]) > max_length
        ):
            raise ValueError(f'{field} must be a string no longer than {max_length} characters.')
    if 'tracking' in data and not data['tracking'].strip():
        raise ValueError('tracking is required.')

    if 'status' in data and data['status'] not in Shipment.Status.values:
        raise ValueError('Invalid shipment status.')
    if 'eta' in data and data['eta'] is not None and data['eta'] != '':
        if not isinstance(data['eta'], str) or parse_datetime(data['eta']) is None:
            raise ValueError('eta must be an ISO 8601 date-time or null.')


def apply_shipment_fields(shipment, data):
    fields = {
        'orderId': 'order_id',
        'tracking': 'tracking',
        'driver': 'driver',
        'vehicle': 'vehicle',
        'status': 'status',
        'currentLocation': 'current_location',
    }
    for incoming, model_field in fields.items():
        if incoming in data:
            setattr(shipment, model_field, data[incoming])
    if 'eta' in data:
        if data['eta'] is None or data['eta'] == '':
            shipment.eta = None
        elif not isinstance(data['eta'], str):
            raise ValueError('eta must be an ISO 8601 date-time or null.')
        else:
            parsed_eta = parse_datetime(data['eta'])
            if parsed_eta is None:
                raise ValueError('eta must be an ISO 8601 date-time or null.')
            shipment.eta = parsed_eta


@require_http_methods(['GET'])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
    return JsonResponse({'status': 'ok', 'service': 'logicraft-django'})


class WorkspaceStateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state, _ = WorkspaceState.objects.get_or_create(pk=1)
        return Response({'data': state.data})

    def put(self, request):
        serializer = WorkspaceCollectionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            state, _ = WorkspaceState.objects.select_for_update().get_or_create(pk=1)
            data = dict(state.data)
            data[serializer.validated_data['collection']] = serializer.validated_data['data']
            state.data = data
            state.save(update_fields=['data', 'updated_at'])

        return Response({'data': state.data})


@require_http_methods(['GET'])
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})


@require_http_methods(['GET', 'POST'])
def orders(request):
    if request.method == 'GET':
        records = [order_data(order) for order in Order.objects.prefetch_related('shipments').order_by('-created_at')]
        return JsonResponse({'data': records, 'total': len(records)})

    try:
        data = parse_body(request)
        validate_order(data)
    except ValueError as error:
        return json_error(str(error), 400)

    order = Order()
    apply_order_fields(order, data)
    order.save()
    return JsonResponse({'data': order_data(order)}, status=201)


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def order_detail(request, order_id):
    try:
        order = Order.objects.prefetch_related('shipments').get(pk=order_id)
    except Order.DoesNotExist:
        return json_error('Order not found.', 404)

    if request.method == 'GET':
        return JsonResponse({'data': order_data(order)})

    if request.method == 'DELETE':
        order.delete()
        return JsonResponse({'deleted': True})

    try:
        data = parse_body(request)
        validate_order(data, partial=True)
    except ValueError as error:
        return json_error(str(error), 400)

    apply_order_fields(order, data)
    order.save()
    return JsonResponse({'data': order_data(order)})


@require_http_methods(['GET', 'POST'])
def shipments(request):
    if request.method == 'GET':
        records = [shipment_data(item) for item in Shipment.objects.order_by('-created_at')]
        return JsonResponse({'data': records, 'total': len(records)})

    try:
        data = parse_body(request)
        validate_shipment(data)
    except ValueError as error:
        return json_error(str(error), 400)

    shipment = Shipment()
    apply_shipment_fields(shipment, data)
    try:
        with transaction.atomic():
            shipment.save()
    except IntegrityError:
        if Shipment.objects.filter(tracking=shipment.tracking).exists():
            return json_error('A shipment with this tracking ID already exists.', 409)
        raise
    return JsonResponse({'data': shipment_data(shipment)}, status=201)


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def shipment_detail(request, shipment_id):
    try:
        shipment = Shipment.objects.get(pk=shipment_id)
    except Shipment.DoesNotExist:
        return json_error('Shipment not found.', 404)

    if request.method == 'GET':
        return JsonResponse({'data': shipment_data(shipment)})

    if request.method == 'DELETE':
        shipment.delete()
        return JsonResponse({'deleted': True})

    try:
        data = parse_body(request)
        validate_shipment(data, partial=True)
        apply_shipment_fields(shipment, data)
    except ValueError as error:
        return json_error(str(error), 400)

    try:
        with transaction.atomic():
            shipment.save()
    except IntegrityError:
        if Shipment.objects.filter(tracking=shipment.tracking).exclude(pk=shipment.pk).exists():
            return json_error('A shipment with this tracking ID already exists.', 409)
        raise

    return JsonResponse({'data': shipment_data(shipment)})
```

### `backend/manage.py`

```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
```

### `backend/package.json`

```json
{
  "name": "logicraft-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

### `backend/requirements.txt`

```text
asgiref==3.13.0
Django==6.1.2
django-cors-headers==4.9.0
djangorestframework==3.18.3
mysqlclient==2.2.7
psycopg==3.3.6
psycopg-binary==3.3.6
python-dotenv==1.2.4
sqlparse==0.6.0
tzdata==2026.6
```

### `backend/server.js`

```javascript
import { createServer } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'
const backendDirectory = dirname(fileURLToPath(import.meta.url))
const databaseDirectory = join(backendDirectory, 'data')
const databaseFile = join(databaseDirectory, 'database.json')
const maximumRequestBytes = 1024 * 1024
const allowedOrigins = new Set(
	[5173, 4173, 8000, 8001].flatMap((frontendPort) => [
		`http://localhost:${frontendPort}`,
		`http://127.0.0.1:${frontendPort}`,
	]),
)

const initialState = {
	orders: [
		{
			id: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			email: 'ops@northstar.example',
			phone: '+1 (312) 555-0184',
			pickup: 'Newark Distribution Center, NJ',
			delivery: 'Chicago Fulfillment Hub, IL',
			item: 'Consumer electronics',
			quantity: 48,
			weight: 620,
			pickupDate: '2026-10-01',
			deliveryDate: '2026-10-03',
			instructions: 'Keep cartons upright. Call receiving 30 minutes before arrival.',
			status: 'Active',
			shipment: 'SHP-2026-08421',
			tracking: 'TRK-2026-08421',
			driver: 'Christina Kamberina',
			vehicle: 'VAN-204 · Box truck',
			eta: 'Oct 03, 10:30 AM',
			history: [{ label: 'Order created', date: 'Oct 01, 2026', note: 'Order confirmed by Northstar Retail' }],
		},
		{
			id: 'ORD-2026-10476',
			customer: 'Harbor & Pine',
			email: 'logistics@harborpine.example',
			phone: '+1 (617) 555-0127',
			pickup: 'Queens Sorting Center, NY',
			delivery: 'Boston Retail Warehouse, MA',
			item: 'Home goods',
			quantity: 26,
			weight: 340,
			pickupDate: '2026-10-01',
			deliveryDate: '2026-10-02',
			instructions: 'Dock 4. Delivery window 1:00 PM to 4:00 PM.',
			status: 'Pending',
			shipment: 'Not assigned',
			tracking: 'Not assigned',
			driver: 'Not assigned',
			vehicle: 'Not assigned',
			eta: 'Awaiting dispatch',
			history: [{ label: 'Order created', date: 'Oct 01, 2026', note: 'Awaiting dispatch assignment' }],
		},
		{
			id: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			email: 'warehouse@evergreen.example',
			phone: '+1 (206) 555-0141',
			pickup: 'Portland Cross-Dock, OR',
			delivery: 'Seattle South Warehouse, WA',
			item: 'Packaged food',
			quantity: 110,
			weight: 840,
			pickupDate: '2026-09-30',
			deliveryDate: '2026-10-01',
			instructions: 'Temperature-controlled vehicle required.',
			status: 'Completed',
			shipment: 'SHP-2026-08396',
			tracking: 'TRK-2026-08396',
			driver: 'Avery Chen',
			vehicle: 'VAN-092 · Box truck',
			eta: 'Delivered Oct 01, 9:42 AM',
			history: [{ label: 'Delivered', date: 'Oct 01, 2026', note: 'Received by warehouse team' }],
		},
	],
	shipments: [
		{
			id: 'SHP-2026-08421',
			tracking: 'TRK-2026-08421',
			orderId: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			pickup: 'Newark Distribution Center, NJ',
			destination: 'Chicago Fulfillment Hub, IL',
			driver: 'Christina Kamberina',
			vehicle: 'VAN-204 · Box truck',
			status: 'In Transit',
			deliveryDate: '2026-10-03',
			eta: 'Oct 03, 10:30 AM',
			etaConfidence: '94%',
			etaType: 'ML predicted',
			currentLocation: 'I-80, near Joliet, IL',
			history: [{ status: 'In Transit', date: 'Oct 01, 1:25 PM', location: 'I-80, near Joliet, IL' }],
		},
		{
			id: 'SHP-2026-08396',
			tracking: 'TRK-2026-08396',
			orderId: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			pickup: 'Portland Cross-Dock, OR',
			destination: 'Seattle South Warehouse, WA',
			driver: 'Avery Chen',
			vehicle: 'VAN-092 · Box truck',
			status: 'Delivered',
			deliveryDate: '2026-10-01',
			eta: 'Delivered Oct 01, 9:42 AM',
			etaConfidence: '99%',
			etaType: 'ML predicted',
			currentLocation: 'Seattle South Warehouse, WA',
			history: [{ status: 'Delivered', date: 'Oct 01, 9:42 AM', location: 'Seattle South Warehouse, WA' }],
		},
	],
	drivers: [
		{
			id: 'DRV-032',
			name: 'Christina Kamberina',
			phone: '+1 (312) 555-0184',
			email: 'christina.k@logicraft.example',
			licenseNumber: 'IL-C4821-3904',
			licenseClass: 'Class A',
			licenseExpiry: '2028-04-18',
			availability: 'On Trip',
			vehicle: 'VAN-204 · Box truck',
			completedTrips: 86,
			onTimeRate: 96,
			rating: 4.9,
			tripHistory: [],
		},
		{
			id: 'DRV-092',
			name: 'Avery Chen',
			phone: '+1 (206) 555-0141',
			email: 'avery.chen@logicraft.example',
			licenseNumber: 'WA-C2044-6218',
			licenseClass: 'Class C',
			licenseExpiry: '2028-08-30',
			availability: 'Available',
			vehicle: 'VAN-092 · Box truck',
			completedTrips: 68,
			onTimeRate: 98,
			rating: 5,
			tripHistory: [],
		},
		{
			id: 'DRV-018',
			name: 'Daniel Brooks',
			phone: '+1 (617) 555-0127',
			email: 'daniel.b@logicraft.example',
			licenseNumber: 'MA-B1377-8540',
			licenseClass: 'Class B',
			licenseExpiry: '2027-11-02',
			availability: 'Available',
			vehicle: 'VAN-118 · Cargo van',
			completedTrips: 54,
			onTimeRate: 93,
			rating: 4.8,
			tripHistory: [],
		},
	],
	inventory: [
		{ id: 'SKU-EL-104', name: 'Wireless charging dock', category: 'Electronics', location: 'A-01-03', onHand: 420, reserved: 82, reorderPoint: 100, unit: 'units' },
		{ id: 'SKU-HG-221', name: 'Stoneware dinner set', category: 'Home goods', location: 'B-03-07', onHand: 74, reserved: 22, reorderPoint: 80, unit: 'sets' },
		{ id: 'SKU-FD-030', name: 'Organic ground coffee', category: 'Food & beverage', location: 'C-02-01', onHand: 1620, reserved: 190, reorderPoint: 250, unit: 'cases' },
		{ id: 'SKU-PK-512', name: 'Shipping cartons · M', category: 'Packaging', location: 'D-01-12', onHand: 2830, reserved: 360, reorderPoint: 400, unit: 'cartons' },
	],
	inbound: [
		{ id: 'RCV-2026-0418', supplier: 'Evergreen Supply Co.', purchaseOrder: 'PO-11842', itemId: 'SKU-EL-104', quantity: 240, eta: 'Oct 02 · 9:30 AM', dock: 'Dock 02', status: 'Expected' },
		{ id: 'RCV-2026-0417', supplier: 'Harbor Home Imports', purchaseOrder: 'PO-11831', itemId: 'SKU-HG-221', quantity: 120, eta: 'Oct 02 · 1:00 PM', dock: 'Dock 04', status: 'Expected' },
	],
	tasks: [
		{ id: 'PICK-ORD-2026-10482', orderId: 'ORD-2026-10482', customer: 'Northstar Retail', item: 'Consumer electronics', quantity: 48, destination: 'Chicago Fulfillment Hub, IL', status: 'Dispatched', shipmentId: 'SHP-2026-08421' },
		{ id: 'PICK-ORD-2026-10476', orderId: 'ORD-2026-10476', customer: 'Harbor & Pine', item: 'Home goods', quantity: 26, destination: 'Boston Retail Warehouse, MA', status: 'Awaiting Pick', shipmentId: '' },
	],
	conversations: [
		{
			id: 'CONV-DRIVER-032',
			name: 'Christina Kamberina',
			role: 'Driver',
			initials: 'CK',
			presence: 'On trip',
			unread: 1,
			context: 'SHP-2026-08421',
			contextLabel: 'In transit · Newark to Chicago',
			latest: 'Traffic has slowed near Joliet. Still on track for the current ETA.',
			updated: '1:25 PM',
			messages: [{ id: 'MSG-001', from: 'contact', text: 'Traffic has slowed near Joliet. Still on track for the current ETA.', time: '1:25 PM' }],
		},
	],
	notifications: [],
	invoices: [
		{
			id: 'INV-2026-00918',
			orderId: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			amount: 8420.5,
			currency: 'USD',
			issuedOn: '2026-09-20',
			dueOn: '2026-09-27',
			status: 'Paid',
			paidOn: '2026-09-25',
			memo: 'Freight service · Portland to Seattle',
			history: [{ action: 'Payment received', date: 'Sep 25, 2026', detail: 'Paid in full · ACH transfer' }],
		},
		{
			id: 'INV-2026-00924',
			orderId: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			amount: 3675,
			currency: 'USD',
			issuedOn: '2026-10-01',
			dueOn: '2026-10-15',
			status: 'Pending',
			paidOn: '',
			memo: 'Line-haul freight · Newark to Chicago',
			history: [{ action: 'Invoice sent', date: 'Oct 01, 2026', detail: 'Invoice issued for freight service' }],
		},
	],
	settings: {
		company: 'LogiCraft Logistics',
		timezone: 'America/Chicago',
		emailNotifications: true,
	},
}

const collectionPrefixes = {
	orders: 'ORD',
	shipments: 'SHP',
	drivers: 'DRV',
	inventory: 'SKU',
	inbound: 'RCV',
	tasks: 'PICK',
	conversations: 'CONV',
	notifications: 'NOT',
	invoices: 'INV',
}

const allowedStatuses = {
	orders: ['Pending', 'Active', 'Completed', 'Cancelled'],
	shipments: ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Failed Delivery'],
	drivers: ['Available', 'Off Duty', 'On Trip'],
	inbound: ['Expected', 'Received'],
	tasks: ['Awaiting Pick', 'Picking', 'Picked', 'Dispatched'],
	invoices: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
}

const allowedOriginsForApi = allowedOrigins
let writeQueue = Promise.resolve()

class HttpError extends Error {
	constructor(statusCode, message) {
		super(message)
		this.statusCode = statusCode
	}
}

function assertValidPort(value) {
	if (!Number.isInteger(value) || value < 1 || value > 65535) {
		throw new Error('PORT must be a whole number between 1 and 65535.')
	}
}

function sendJson(response, statusCode, data) {
	response.writeHead(statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
		'X-Content-Type-Options': 'nosniff',
	})
	response.end(JSON.stringify(data))
}

function applyCors(request, response) {
	const origin = request.headers.origin
	if (origin && allowedOriginsForApi.has(origin)) {
		response.setHeader('Access-Control-Allow-Origin', origin)
		response.setHeader('Vary', 'Origin')
		response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
		response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
		response.setHeader('Access-Control-Max-Age', '600')
	}
}

async function loadState() {
	try {
		const saved = JSON.parse(await readFile(databaseFile, 'utf8'))
		if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
			throw new Error('The saved database must be a JSON object.')
		}

		for (const [collection, fallback] of Object.entries(initialState)) {
			if (collection === 'settings') {
				if (!saved[collection] || typeof saved[collection] !== 'object' || Array.isArray(saved[collection])) {
					saved[collection] = structuredClone(fallback)
				}
			} else if (!Array.isArray(saved[collection])) {
				saved[collection] = structuredClone(fallback)
			}
		}

		return saved
	} catch (error) {
		if (error.code !== 'ENOENT') {
			if (error instanceof SyntaxError) {
				throw new Error(`The database file contains invalid JSON: ${databaseFile}`, { cause: error })
			}
			throw error
		}

		await mkdir(databaseDirectory, { recursive: true })
		const state = structuredClone(initialState)
		await persistState(state)
		return state
	}
}

async function persistState(state) {
	await mkdir(databaseDirectory, { recursive: true })
	const temporaryFile = `${databaseFile}.${process.pid}.${randomUUID()}.tmp`
	await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
	await rename(temporaryFile, databaseFile)
}

function updateState(update) {
	const operation = writeQueue.then(async () => {
		const state = await loadState()
		const result = await update(state)
		await persistState(state)
		return result
	})

	writeQueue = operation.then(() => undefined, () => undefined)
	return operation
}

async function readJsonBody(request) {
	let size = 0
	const chunks = []

	for await (const chunk of request) {
		size += chunk.length
		if (size > maximumRequestBytes) {
			throw new HttpError(413, 'Request body exceeds the 1 MB limit.')
		}
		chunks.push(chunk)
	}

	if (size === 0) {
		throw new HttpError(400, 'A JSON request body is required.')
	}

	let body
	try {
		body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
	} catch {
		throw new HttpError(400, 'Request body must contain valid JSON.')
	}

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new HttpError(400, 'Request body must be a JSON object.')
	}

	return body
}

function validateRecord(collection, body, isNewRecord) {
	if (Object.hasOwn(body, 'id') && typeof body.id !== 'string') {
		throw new HttpError(400, 'The record id must be a string.')
	}

	const statuses = allowedStatuses[collection]
	if (statuses && Object.hasOwn(body, 'status') && !statuses.includes(body.status)) {
		throw new HttpError(400, `Invalid ${collection} status. Allowed values: ${statuses.join(', ')}.`)
	}

	if (collection === 'orders') {
		for (const field of ['quantity', 'weight']) {
			if (Object.hasOwn(body, field) && (!Number.isFinite(body[field]) || body[field] <= 0)) {
				throw new HttpError(400, `${field} must be a number greater than zero.`)
			}
		}
	}

	if (collection === 'shipments' && Object.hasOwn(body, 'history') && !Array.isArray(body.history)) {
		throw new HttpError(400, 'Shipment history must be an array.')
	}

	if (collection === 'inventory') {
		for (const field of ['onHand', 'reserved', 'reorderPoint']) {
			if (Object.hasOwn(body, field) && (!Number.isInteger(body[field]) || body[field] < 0)) {
				throw new HttpError(400, `${field} must be a non-negative whole number.`)
			}
		}

		const onHand = body.onHand
		const reserved = body.reserved
		if (onHand !== undefined && reserved !== undefined && reserved > onHand) {
			throw new HttpError(400, 'Reserved inventory cannot exceed on-hand inventory.')
		}
	}

	const requiredFields = {
		orders: ['customer', 'pickup', 'delivery'],
		shipments: ['orderId', 'pickup', 'destination', 'driver', 'vehicle'],
		drivers: ['name', 'phone'],
		inventory: ['name', 'onHand'],
		inbound: ['supplier', 'itemId', 'quantity'],
		tasks: ['orderId', 'status'],
		conversations: ['name', 'role'],
		notifications: ['title', 'detail'],
		invoices: ['orderId', 'customer', 'amount'],
	}

	if (isNewRecord) {
		const missing = requiredFields[collection].filter((field) => {
			const value = body[field]
			return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
		})
		if (missing.length) {
			throw new HttpError(400, `Missing required fields: ${missing.join(', ')}.`)
		}
	}
}

function createId(collection) {
	const year = new Date().getFullYear()
	return `${collectionPrefixes[collection]}-${year}-${randomUUID().slice(0, 8).toUpperCase()}`
}

function nowLabel() {
	return new Date().toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function findOrder(state, orderId) {
	return state.orders.find((order) => order.id === orderId)
}

function syncOrderWithShipment(state, shipment) {
	const order = findOrder(state, shipment.orderId)
	if (!order) {
		throw new HttpError(400, `Order ${shipment.orderId} does not exist.`)
	}

	const otherShipment = state.shipments.find(
		(item) => item.orderId === shipment.orderId && item.id !== shipment.id,
	)
	if (otherShipment) {
		throw new HttpError(409, `Order ${shipment.orderId} already has shipment ${otherShipment.id}.`)
	}

	order.shipment = shipment.id
	order.tracking = shipment.tracking || 'Not assigned'
	order.driver = shipment.driver
	order.vehicle = shipment.vehicle
	order.eta = shipment.eta || 'Awaiting dispatch'
	order.status = shipment.status === 'Delivered' ? 'Completed' : 'Active'
	if (shipment.status !== 'Delivered') {
		order.history = [
			{
				label: `Shipment ${shipment.status.toLowerCase()}`,
				date: nowLabel(),
				note: `${shipment.id} · ${shipment.currentLocation || shipment.pickup}`,
			},
			...(Array.isArray(order.history) ? order.history : []),
		]
	}
}

async function handleCollectionRequest(request, response, collection, recordId, searchParams) {
	if (!Object.hasOwn(collectionPrefixes, collection)) {
		throw new HttpError(404, `Unknown collection "${collection}".`)
	}

	if (!recordId && request.method === 'GET') {
		const limitValue = searchParams.get('limit')
		const offsetValue = searchParams.get('offset')
		const limit = limitValue === null ? 100 : Number(limitValue)
		const offset = offsetValue === null ? 0 : Number(offsetValue)

		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			throw new HttpError(400, 'limit must be a whole number between 1 and 500.')
		}
		if (!Number.isInteger(offset) || offset < 0) {
			throw new HttpError(400, 'offset must be a non-negative whole number.')
		}

		const state = await loadState()
		let records = state[collection]
		const status = searchParams.get('status')
		const query = searchParams.get('q')?.trim().toLowerCase()

		if (status) {
			records = records.filter((record) => record.status === status || record.availability === status)
		}
		if (query) {
			records = records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
		}

		return sendJson(response, 200, {
			data: records.slice(offset, offset + limit),
			total: records.length,
			limit,
			offset,
		})
	}

	if (!recordId && request.method === 'POST') {
		const body = await readJsonBody(request)
		validateRecord(collection, body, true)
		const created = await updateState((state) => {
			const record = { ...body, id: body.id?.trim() || createId(collection) }
			if (state[collection].some((item) => item.id === record.id)) {
				throw new HttpError(409, `${collection} record "${record.id}" already exists.`)
			}
			if (collection === 'shipments') {
				record.tracking = record.tracking || createId('shipments').replace('SHP-', 'TRK-')
				record.eta = record.eta || 'Awaiting dispatch'
				record.etaConfidence = record.etaConfidence || 'Pending route model'
				record.etaType = record.etaType || 'Schedule target'
				record.currentLocation = record.currentLocation || record.pickup
				record.history = Array.isArray(record.history) && record.history.length
					? record.history
					: [{ status: record.status, date: nowLabel(), location: record.currentLocation }]
			}
			state[collection].unshift(record)
			if (collection === 'shipments') {
				syncOrderWithShipment(state, record)
			}
			return record
		})
		return sendJson(response, 201, { data: created })
	}

	if (!recordId) {
		throw new HttpError(405, 'Use GET to list records or POST to create a record.')
	}

	if (request.method === 'GET') {
		const state = await loadState()
		const record = state[collection].find((item) => item.id === recordId)
		if (!record) {
			throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
		}
		return sendJson(response, 200, { data: record })
	}

	if (request.method === 'PATCH' || request.method === 'PUT') {
		const body = await readJsonBody(request)
		if (Object.hasOwn(body, 'id') && body.id !== recordId) {
			throw new HttpError(400, 'A record id cannot be changed.')
		}
		validateRecord(collection, body, false)

		const updated = await updateState((state) => {
			const index = state[collection].findIndex((item) => item.id === recordId)
			if (index === -1) {
				throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
			}

			const previous = state[collection][index]
			const next = { ...previous, ...body, id: recordId }
			if (collection === 'inventory' && next.reserved > next.onHand) {
				throw new HttpError(400, 'Reserved inventory cannot exceed on-hand inventory.')
			}

			if (
				collection === 'shipments'
				&& (next.status !== previous.status || next.driver !== previous.driver || next.vehicle !== previous.vehicle)
			) {
				next.history = [
					{
						status: next.status,
						date: nowLabel(),
						location: next.currentLocation || next.pickup,
					},
					...(Array.isArray(previous.history) ? previous.history : []),
				]
			}

			state[collection][index] = next
			if (collection === 'shipments') {
				syncOrderWithShipment(state, next)
			}
			return next
		})
		return sendJson(response, 200, { data: updated })
	}

	if (request.method === 'DELETE') {
		const deleted = await updateState((state) => {
			const index = state[collection].findIndex((item) => item.id === recordId)
			if (index === -1) {
				throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
			}

			if (collection === 'orders' && state.shipments.some((shipment) => shipment.orderId === recordId)) {
				throw new HttpError(409, 'Delete the order shipment before deleting this order.')
			}

			const [record] = state[collection].splice(index, 1)
			if (collection === 'shipments') {
				const order = findOrder(state, record.orderId)
				if (order && order.shipment === record.id) {
					order.shipment = 'Not assigned'
					order.tracking = 'Not assigned'
					order.driver = 'Not assigned'
					order.vehicle = 'Not assigned'
					order.eta = 'Awaiting dispatch'
					order.status = 'Pending'
				}
			}
			return record
		})
		return sendJson(response, 200, { data: deleted })
	}

	throw new HttpError(405, 'Supported record methods are GET, PATCH, PUT, and DELETE.')
}

async function handleSettingsRequest(request, response) {
	if (request.method === 'GET') {
		const state = await loadState()
		return sendJson(response, 200, { data: state.settings })
	}

	if (request.method === 'PATCH' || request.method === 'PUT') {
		const body = await readJsonBody(request)
		const allowedFields = new Set(['company', 'timezone', 'emailNotifications'])
		const unknownFields = Object.keys(body).filter((key) => !allowedFields.has(key))
		if (unknownFields.length) {
			throw new HttpError(400, `Unsupported setting(s): ${unknownFields.join(', ')}.`)
		}
		if (Object.hasOwn(body, 'company') && (typeof body.company !== 'string' || !body.company.trim())) {
			throw new HttpError(400, 'company must be a non-empty string.')
		}
		if (Object.hasOwn(body, 'timezone') && typeof body.timezone !== 'string') {
			throw new HttpError(400, 'timezone must be a string.')
		}
		if (Object.hasOwn(body, 'emailNotifications') && typeof body.emailNotifications !== 'boolean') {
			throw new HttpError(400, 'emailNotifications must be true or false.')
		}

		const settings = await updateState((state) => {
			state.settings = { ...state.settings, ...body }
			return state.settings
		})
		return sendJson(response, 200, { data: settings })
	}

	throw new HttpError(405, 'Use GET to read settings or PATCH to update them.')
}

async function routeRequest(request, response) {
	applyCors(request, response)

	if (request.method === 'OPTIONS') {
		response.writeHead(204)
		return response.end()
	}

	const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)
	const segments = requestUrl.pathname.split('/').filter(Boolean).map(decodeURIComponent)

	if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
		const state = await loadState()
		return sendJson(response, 200, {
			status: 'ok',
			service: 'logicraft-backend',
			uptimeSeconds: Math.floor(process.uptime()),
			database: databaseFile,
			collections: Object.keys(state),
		})
	}

	if (request.method === 'GET' && requestUrl.pathname === '/api') {
		return sendJson(response, 200, {
			data: {
				collections: [...Object.keys(collectionPrefixes), 'settings'],
				state: 'GET /api/state',
				collection: '/api/{collection}',
				record: '/api/{collection}/{id}',
				settings: '/api/settings',
			},
		})
	}

	if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
		return sendJson(response, 200, { data: await loadState() })
	}

	if (segments[0] !== 'api' || !segments[1] || segments.length > 3) {
		throw new HttpError(404, 'Endpoint not found. See GET /api for available endpoints.')
	}

	if (segments[1] === 'settings') {
		if (segments.length !== 2) {
			throw new HttpError(404, 'Settings do not have individual record endpoints.')
		}
		return handleSettingsRequest(request, response)
	}

	return handleCollectionRequest(request, response, segments[1], segments[2], requestUrl.searchParams)
}

async function main() {
	assertValidPort(port)
	await loadState()

	const server = createServer((request, response) => {
		void routeRequest(request, response).catch((error) => {
			if (response.headersSent || response.destroyed) {
				response.destroy(error)
				return
			}

			const statusCode = error instanceof HttpError ? error.statusCode : 500
			if (statusCode >= 500) {
				console.error(`[${new Date().toISOString()}] ${error.stack ?? error.message}`)
			}

			sendJson(response, statusCode, {
				error: error instanceof HttpError ? error.message : 'An unexpected backend error occurred.',
			})
		})
	})

	server.on('error', (error) => {
		console.error(`Unable to start the backend on ${host}:${port}: ${error.message}`)
		process.exitCode = 1
	})

	server.listen(port, host, () => {
		console.log(`LogiCraft backend is running at http://localhost:${port}`)
		console.log(`API overview: http://localhost:${port}/api`)
		console.log(`Health check: http://localhost:${port}/api/health`)
		console.log(`Local database: ${databaseFile}`)
	})

	process.on('SIGINT', () => server.close(() => process.exit(0)))
	process.on('SIGTERM', () => server.close(() => process.exit(0)))
}

await main()
```

### `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>logicraft</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `package-lock.json`

```json
{
  "name": "logicraft",
  "version": "0.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "logicraft",
      "version": "0.0.0",
      "dependencies": {
        "leaflet": "^1.9.4",
        "react": "^19.2.8",
        "react-dom": "^19.2.8"
      },
      "devDependencies": {
        "@types/react": "^19.2.18",
        "@types/react-dom": "^19.2.7",
        "@vitejs/plugin-react": "^6.1.1",
        "oxlint": "^1.81.0",
        "vite": "^8.3.0"
      }
    },
    "node_modules/@oxc-project/types": {
      "version": "0.151.0",
      "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.151.0.tgz",
      "integrity": "sha512-J1yXrIlNDZVzE3ada310xeAw7nH8yCAyLPuUIsjKatFPmfn5bS1oW+cM+QsGOtVWd5nhSpbwZWx/rue+r5Z+PA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      }
    },
    "node_modules/@oxlint/binding-android-arm-eabi": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm-eabi/-/binding-android-arm-eabi-1.85.0.tgz",
      "integrity": "sha512-q2KO/Zso9UT+OMn0NF9ywn4E4t0MI3yxiDhNyhsQ7DyQJrC4FhFE4TXOi4bktFnOWXTMds8qZSbpv2XwRaNOBg==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-android-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-android-arm64/-/binding-android-arm64-1.85.0.tgz",
      "integrity": "sha512-SxLN3ALjoT9NNdvpjEevGeHvfzTAFrF0NBYB5tzK7/GtCKMze3j1e/m/X2ozqGj2U9hfGG/dg/OG8vpVK4PiDA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-arm64/-/binding-darwin-arm64-1.85.0.tgz",
      "integrity": "sha512-Y/Sup/J4f0f9UGsSd/xyCNTeWL+gepO63GBdEDAfue9nBsnk9zMmnIXx1O6b1V8C90vB5nucYNZ0pbMXAp8zJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-darwin-x64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-darwin-x64/-/binding-darwin-x64-1.85.0.tgz",
      "integrity": "sha512-ApOSNC04ynpDTwvBD+//0wyfODRSbEzvRoKpX8teffmc27z8AockwSNeMXGJXn5KP85eahDgR/2llICWLkzcnw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-freebsd-x64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-freebsd-x64/-/binding-freebsd-x64-1.85.0.tgz",
      "integrity": "sha512-bNrVrCOA/kHky3Tu79IXWXe5bhIgLXfUuUEDHlAGOHUk96MkvDZ1ecaQF19rwstrnaqfP1o9nBTqzIr9+ZHkUg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-gnueabihf": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.85.0.tgz",
      "integrity": "sha512-NUrzOJ1s/EqsVvfn2L/1D8Wro2LPIZUbihL8kOJLh5fEdGEN3rdOGUYq3HwnUIL8sjpoP+4N6RaGrgmMJnaMPw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm-musleabihf": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm-musleabihf/-/binding-linux-arm-musleabihf-1.85.0.tgz",
      "integrity": "sha512-UJXrAT3E/RWkEqXLIs2ehETja1qfgkPb+5gwLIIS+o/6cf+grHvoOXTa5997a/YNQfcJS0DRBTOfZt95cvOI1g==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.85.0.tgz",
      "integrity": "sha512-lK40QLjI0HxigO7CjDDshEtfYIeiYS0020v5BHFPqN4uuQBQxd2K9LNom2dW15o9F1937quSCRVp4ZsVhdbYdg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-arm64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.85.0.tgz",
      "integrity": "sha512-c2zbdBwGKreHXwRx3gWBuFGJxLhxgsg6YlZ+3H+RgRusU/UEV9jNwJ3HGYK+nRo0LvBa7mt6Kj86xoVotUo8cw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-ppc64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.85.0.tgz",
      "integrity": "sha512-tlt/Hy8lZ97/lCPmCgw/B3k/mwh+BzaIPbPkldZEly7TwLmx0xe2CQcaW2g/rR0dOgS9JNGCZsMEqLhUNMGvaw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-gnu/-/binding-linux-riscv64-gnu-1.85.0.tgz",
      "integrity": "sha512-3tNR9Xey82X0zKuY1d8hJ6Rc9gwRDurmqGLnQZa5xqOXy8/YyiqFXjAtugkKLY82obOlpK1eSiDRlgcNPuxtIg==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-riscv64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-riscv64-musl/-/binding-linux-riscv64-musl-1.85.0.tgz",
      "integrity": "sha512-wbGRd5PqCcjkJFHhZuZ2OBSUQY9czlQsoA/cQQB9JK/L9mC5MQgGoKAh+xd8QjA5V+0D3j+Qd1lAWn1I8zlelA==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-s390x-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.85.0.tgz",
      "integrity": "sha512-3Sn0kSrE4DPZCWV/8o+n4x3aFZxI9ulMnkYlwCbJ8eUVkwRK2IerohE/A/z3SNbCwoPFOCJmGE5Avrq0rrvdvQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-gnu": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.85.0.tgz",
      "integrity": "sha512-JY2pxxYfB62bAGfejljVCqc44etItehPuAyaeSAdMuEMtwNA00ggMnS66lC1oIhos6oOXUkuU6mZ9bpFh3BqWg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-linux-x64-musl": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-linux-x64-musl/-/binding-linux-x64-musl-1.85.0.tgz",
      "integrity": "sha512-5k74vZ6qJBjBHEOlBk9B/iv68Yu0F1Afw/vvT2ar6OGCqEeXLaSjXz2n/IPCbhLG22UoKoYEJTzpYraRdcp6PA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-openharmony-arm64": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-openharmony-arm64/-/binding-openharmony-arm64-1.85.0.tgz",
      "integrity": "sha512-GbAl5qt5TCkPLXTaIISZJnugrcBhra6rodcXc9jYt620UtdsTt71NlNmJmm0frxzFpd54x/G+MkitEJA8I/BoA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-arm64-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.85.0.tgz",
      "integrity": "sha512-kjmws5MK0et2swk4ND85D7NVQyDHw162i6whtZDLUA/lo6FQyBZDcmMRCMcVZcNrAhIaftVb00x9ChGDOjjNJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-ia32-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-ia32-msvc/-/binding-win32-ia32-msvc-1.85.0.tgz",
      "integrity": "sha512-eSsIJx9n4yxvOqYTZyPEMyEXRmE60XH7xGAU7i0Qbsn1lf6Za3CWJ9aRd82oSFKXaxhp+sA6/yMJVRIpLpna6A==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@oxlint/binding-win32-x64-msvc": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/@oxlint/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.85.0.tgz",
      "integrity": "sha512-pBebIPUpKKhWrhSMWhy8TdAZBewiXnfxmaAGxhzxM1068GagqFaTwgKlU6e+UyJ2sPR+VoHouhXuGJkQjsrDvA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-android-arm-eabi": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm-eabi/-/binding-android-arm-eabi-1.2.11.tgz",
      "integrity": "sha512-A5kXfGKvKWWZE0TtPrfsvT+q4Y5d1QG8gGUzpYjGydM+fARM9MuX90PrXYXe0XbsDVgyxxNzHo6giCj90bsFNw==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-android-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm64/-/binding-android-arm64-1.2.11.tgz",
      "integrity": "sha512-z6cTycz+iJ4PVkuL4HHW4DfTfoeU/2nqYYuSOrTmH7yHK5Y0LCOnA03V4ZNxavyVaU1oOqUgIg2klN/s+USGOA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-arm64/-/binding-darwin-arm64-1.2.11.tgz",
      "integrity": "sha512-jShvqNtP6vDC6/A5JOAzbVV+DkgHqhl/ScVCJEbt+TUY6QYz7YnXcrg3sLtFBniro0f/Ld50ZwCWA6f7KYD1nQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-darwin-x64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-darwin-x64/-/binding-darwin-x64-1.2.11.tgz",
      "integrity": "sha512-f2i2xiNWq1Z1l2++q2fuhZRdLAT3aqxD6vRNm1RAxpUoBcdqNB3C0s1Bt+K+PbEx2F5F4gQp6hqKkphCY/xF9w==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-freebsd-x64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-freebsd-x64/-/binding-freebsd-x64-1.2.11.tgz",
      "integrity": "sha512-4Ir5FSOKIAMr4r0kExpt1s3bMgzJU3rA45AYOHtQpls0oNeqcYBKrWMlckrYH4KCfGLfkfn1tN1dmZPMVsdXow==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm-gnueabihf": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm-gnueabihf/-/binding-linux-arm-gnueabihf-1.2.11.tgz",
      "integrity": "sha512-/gnRDM+39BROzAN/k1OZjDPnDMcZxB/0EUxKjONO5yVkNEvlsoMDrxGNKgZi/ttFriS2gwlDNzB65pvNbFOXIQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-gnu/-/binding-linux-arm64-gnu-1.2.11.tgz",
      "integrity": "sha512-PFaK8HwvAHbaKbBcDNQihjMKYvFnA5hiENx/l5tphTDz1E0WFp32l0A7aq7lyUwGsRw/xSrNIy/gIK4thrSCrw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-arm64-musl": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-arm64-musl/-/binding-linux-arm64-musl-1.2.11.tgz",
      "integrity": "sha512-AskzJUIKRLPxkruR1wLKewGbOw+EYfU/9lOrBFj4AFrEA8hPpKFnODWNu2WLaNs0QNkEb9QIJufmVZZIL/bJlg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-ppc64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-ppc64-gnu/-/binding-linux-ppc64-gnu-1.2.11.tgz",
      "integrity": "sha512-qlUGAheh2yh8afH7QBgx0PrRHN85hKnNd78x8MeMhXivuevgd8vgf6/CstOzmNKY/lLTHvNTrPy98cLnAugzJw==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-s390x-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-s390x-gnu/-/binding-linux-s390x-gnu-1.2.11.tgz",
      "integrity": "sha512-secpEad+0vCbSfn8upFySkDskv+bGPk3THSDS9Y89yc4rb4kzqHp8Dmyd9BkQW4SnhNXBZCl/6CrO//hZahNJQ==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-gnu": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-gnu/-/binding-linux-x64-gnu-1.2.11.tgz",
      "integrity": "sha512-mOVBT3dPpkWm8XBWPmU4bf+U6dYDLeMo/9ojUmis4N0L5uu10qra5vOyngZ7/PSdoE4G9KvRt4bloRxNjLas7A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-linux-x64-musl": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-linux-x64-musl/-/binding-linux-x64-musl-1.2.11.tgz",
      "integrity": "sha512-Is78i9A8Ui4SqcxUwFJ9uMmjDn58IbVTjFWYdQestFEgeuEmHMLGNriXnVJKkwG2YiZjw8cP0zCTyDMdDGtOOg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-openharmony-arm64": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-openharmony-arm64/-/binding-openharmony-arm64-1.2.11.tgz",
      "integrity": "sha512-dUCXneZ87INUMyQ0D+C0HrEBNUPNXHaPmU5GTjyKTJEiussw9Kaj5Ln8UztPe4epV/ffvgNBEadksdYhmW6xJA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-arm64-msvc": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-arm64-msvc/-/binding-win32-arm64-msvc-1.2.11.tgz",
      "integrity": "sha512-jByxb6qfd+bH1xUd0qnfFnb17i9sWBPY2tOavJ0l3tdr3OTu+Kvtm8cd/JV5nFt657b1VqGltxg9olOEfofXWw==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/binding-win32-x64-msvc": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/@rolldown/binding-win32-x64-msvc/-/binding-win32-x64-msvc-1.2.11.tgz",
      "integrity": "sha512-/PzKqzAJ03i19oy2ItPvyvaVjOjBCNnfaJs8yvUdGBKmiESgnrJSQ2awd81QzFbbnAmu7YO9ZnJrDCb9VSJPRA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      }
    },
    "node_modules/@rolldown/pluginutils": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.1.tgz",
      "integrity": "sha512-2j9bGt5Jh8hj+vPtgzPtl72j0yRxHAyumoo6TNfAjsLB04UtpSvPbPcDcBMxz7n+9CYB0c1GxQFxYRg2jimqGw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.3.0.tgz",
      "integrity": "sha512-N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-ZI7bU42mZXXKHn/qNLEw2IrbiINU7X5+vfgdixBHkCNpYWXjKgfQ/P+uyGb5CjOLB9UcnTeg3rylQtV2hym44Q==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "@types/react": "^19.3.0"
      }
    },
    "node_modules/@vitejs/plugin-react": {
      "version": "6.1.1",
      "resolved": "https://registry.npmjs.org/@vitejs/plugin-react/-/plugin-react-6.1.1.tgz",
      "integrity": "sha512-yxLaQV9gkhS8ezJqCM6+ndU7mDY6gqAg75NQ+0IjwEI8IYOmQCgkRwHKVSfWXW076DsqMo0Dk+0FK1U+M5RgFw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rolldown/pluginutils": "^1.0.1"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "peerDependencies": {
        "@rolldown/plugin-babel": "^0.1.7 || ^0.2.0",
        "babel-plugin-react-compiler": "^1.0.0",
        "oxc-transform-react": "^0.145.0",
        "vite": "^8.0.0"
      },
      "peerDependenciesMeta": {
        "@rolldown/plugin-babel": {
          "optional": true
        },
        "babel-plugin-react-compiler": {
          "optional": true
        },
        "oxc-transform-react": {
          "optional": true
        }
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/fsevents": {
      "version": "2.3.3",
      "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
      "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
      }
    },
    "node_modules/leaflet": {
      "version": "1.9.4",
      "resolved": "https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz",
      "integrity": "sha512-nxS1ynzJOmOlHp+iL3FyWqK89GtNL8U8rvlMOsQdTTssxZwCXh8N2NB3GDQOL+YR3XnWyZAxwQixURb+FA74PA==",
      "license": "BSD-2-Clause"
    },
    "node_modules/lightningcss": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz",
      "integrity": "sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA==",
      "dev": true,
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.33.0",
        "lightningcss-darwin-arm64": "1.33.0",
        "lightningcss-darwin-x64": "1.33.0",
        "lightningcss-freebsd-x64": "1.33.0",
        "lightningcss-linux-arm-gnueabihf": "1.33.0",
        "lightningcss-linux-arm64-gnu": "1.33.0",
        "lightningcss-linux-arm64-musl": "1.33.0",
        "lightningcss-linux-x64-gnu": "1.33.0",
        "lightningcss-linux-x64-musl": "1.33.0",
        "lightningcss-win32-arm64-msvc": "1.33.0",
        "lightningcss-win32-x64-msvc": "1.33.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.33.0.tgz",
      "integrity": "sha512-gEpRTalKdosp4Bb8qWtc2iOgE5SeIHlpS1up9bFq2wAyYhl1UdTObYiHe98zEM9SQvSoqQZ1IQD0JNpg3Ml5pg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.33.0.tgz",
      "integrity": "sha512-Sciaz8eenNTKn9b3t7+xr0ipTp9YxKQY4npwQ3mrRuL0BAVHBLyZxofhaKBAVtzmtRZ/zTyo0/to4B1uWG/Djg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.33.0.tgz",
      "integrity": "sha512-Z5UPAxzrjlWNNyGy6i65cJzzvgJ5D3T6wMvs+gWpY9d7qRhANrxqAp6LhxIgZhWEw18RfJTGcRxjuLIBr+m8XQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.33.0.tgz",
      "integrity": "sha512-QQM/Ti/hQajJwCY+RiWuCZ9sdtI/XQk7nDK5vC8kkdwixezOlDgvDx7+RT+QjK6FcFT4MpsuoBnHIo/O3StRRg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.33.0.tgz",
      "integrity": "sha512-N7FVBe6iS24MlM6R/4RBTxGhQheZGs7tiQ9U32UtF75NzP5Q7xWPRqLBCKxlRQRk3rY1jCIPLzx7WzOhuUIRLQ==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.33.0.tgz",
      "integrity": "sha512-j2v/itmy4HlNxlc6voKXYgBqNi0Ng2LShg4z7GufpEgs05P+2suBVyi9I6YHq5uoVFx9ETin3eCEhLVyXGQnKg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.33.0.tgz",
      "integrity": "sha512-yiO5ROMuYQgXbC60yjZU5CYSFZGKXL0HFATXt9mHJn1+zW55oCtMI9NfcVhYLMFDL7gV7oBPon/EmMMGg2OvtQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.33.0.tgz",
      "integrity": "sha512-ar+Ju7LmcN0Jo4FpL4hpFybwNG9/3A/Br5KW2n2jyODg3MEZXaDYADdemoNS+BDNfMgKvylJLj4S5tyRActuAg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "glibc"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.33.0.tgz",
      "integrity": "sha512-RYiYbkokw0trfKqqzfF55lginwEPrD3OJDfTuJzFs1MK6iFnDenaz1fqLLtX4ITG3OktJQXOeTaw1awrBAlZPw==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "libc": [
        "musl"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.33.0.tgz",
      "integrity": "sha512-1K+MPfLSFVpphzpdbfkhlWk6wBrTObBzS2T6db10PNOZgR9GoVsAWzwNyuhUYYbTp23j+4RrncfujZ4uAzXvwA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.33.0.tgz",
      "integrity": "sha512-OlEICDx/Xl0FqSp4bry8zFnCvGpig3Gl4gCquvYwHuqJKEC1+n9NgDniFvqHGmMv1ZkqDJrDqKKSykTDX+ehuA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.19",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.19.tgz",
      "integrity": "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV/02KC+6kd9eDGqdZd++mjMiIDilrBYvjEnCYvVtsuHCuP+okSfug==",
      "dev": true,
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/oxlint": {
      "version": "1.85.0",
      "resolved": "https://registry.npmjs.org/oxlint/-/oxlint-1.85.0.tgz",
      "integrity": "sha512-bc26s97nuvPj1ViyPsqmKecVkUWFMEdtayO8MaQ6oiLfs1pj94cQlZZhrh4BPNlr9HQosjhIlwgZKsfcwmcNgg==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "oxlint": "bin/oxlint"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      },
      "optionalDependencies": {
        "@oxlint/binding-android-arm-eabi": "1.85.0",
        "@oxlint/binding-android-arm64": "1.85.0",
        "@oxlint/binding-darwin-arm64": "1.85.0",
        "@oxlint/binding-darwin-x64": "1.85.0",
        "@oxlint/binding-freebsd-x64": "1.85.0",
        "@oxlint/binding-linux-arm-gnueabihf": "1.85.0",
        "@oxlint/binding-linux-arm-musleabihf": "1.85.0",
        "@oxlint/binding-linux-arm64-gnu": "1.85.0",
        "@oxlint/binding-linux-arm64-musl": "1.85.0",
        "@oxlint/binding-linux-ppc64-gnu": "1.85.0",
        "@oxlint/binding-linux-riscv64-gnu": "1.85.0",
        "@oxlint/binding-linux-riscv64-musl": "1.85.0",
        "@oxlint/binding-linux-s390x-gnu": "1.85.0",
        "@oxlint/binding-linux-x64-gnu": "1.85.0",
        "@oxlint/binding-linux-x64-musl": "1.85.0",
        "@oxlint/binding-openharmony-arm64": "1.85.0",
        "@oxlint/binding-win32-arm64-msvc": "1.85.0",
        "@oxlint/binding-win32-ia32-msvc": "1.85.0",
        "@oxlint/binding-win32-x64-msvc": "1.85.0"
      },
      "peerDependencies": {
        "oxlint-tsgolint": ">=7.0.2001",
        "vite-plus": "*"
      },
      "peerDependenciesMeta": {
        "oxlint-tsgolint": {
          "optional": true
        },
        "vite-plus": {
          "optional": true
        }
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.28",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.28.tgz",
      "integrity": "sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A==",
      "dev": true,
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.18",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.1"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.3.0.tgz",
      "integrity": "sha512-E8LUcbtBWt20bbl2YoHfx4ZDBdxVTfOKtCZn9cDSJ4l6/nuoApcpIBcj47t2wZoVX8g2ZHuMHbiShgCR1T5Sog==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.28.0"
      },
      "peerDependencies": {
        "react": "^19.3.0"
      }
    },
    "node_modules/rolldown": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/rolldown/-/rolldown-1.2.11.tgz",
      "integrity": "sha512-qpSwIyz0jHQq5qXBTNxFmE6664rJ7O+4TvPFOiOaBSrz8IOHc1koKKSqTM2H6u1UG1+TveuC6vaDHKXFOvb1Kw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@oxc-project/types": "=0.151.0",
        "@rolldown/pluginutils": "^1.0.0"
      },
      "bin": {
        "rolldown": "bin/cli.mjs"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "optionalDependencies": {
        "@rolldown/binding-android-arm-eabi": "1.2.11",
        "@rolldown/binding-android-arm64": "1.2.11",
        "@rolldown/binding-darwin-arm64": "1.2.11",
        "@rolldown/binding-darwin-x64": "1.2.11",
        "@rolldown/binding-freebsd-x64": "1.2.11",
        "@rolldown/binding-linux-arm-gnueabihf": "1.2.11",
        "@rolldown/binding-linux-arm64-gnu": "1.2.11",
        "@rolldown/binding-linux-arm64-musl": "1.2.11",
        "@rolldown/binding-linux-ppc64-gnu": "1.2.11",
        "@rolldown/binding-linux-s390x-gnu": "1.2.11",
        "@rolldown/binding-linux-x64-gnu": "1.2.11",
        "@rolldown/binding-linux-x64-musl": "1.2.11",
        "@rolldown/binding-openharmony-arm64": "1.2.11",
        "@rolldown/binding-win32-arm64-msvc": "1.2.11",
        "@rolldown/binding-win32-x64-msvc": "1.2.11"
      }
    },
    "node_modules/scheduler": {
      "version": "0.28.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz",
      "integrity": "sha512-juorfCmIkIw8tT+p5BXSm6PJjQF/ycEYmKyzURCIt/RaZIhL+PulbQ9Yu2z1HdOJDdqDTlxA1+xKBmHXJsczAw==",
      "license": "MIT"
    },
    "node_modules/source-map-js": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
      "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
      "dev": true,
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/vite": {
      "version": "8.3.1",
      "resolved": "https://registry.npmjs.org/vite/-/vite-8.3.1.tgz",
      "integrity": "sha512-/bvH9E9tmCXRGp2uXY3WbOldqpTwFkbha/8ANaEQ6VkxhH60KyqLwgZq6lG2y+4uT55x9+9eUHMpQ7uGnOCKjA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "lightningcss": "^1.33.0",
        "picomatch": "^4.0.7",
        "postcss": "^8.5.28",
        "rolldown": "~1.2.9",
        "tinyglobby": "^0.2.17"
      },
      "bin": {
        "vite": "bin/vite.js"
      },
      "engines": {
        "node": "^20.19.0 || >=22.12.0"
      },
      "funding": {
        "url": "https://github.com/vitejs/vite?sponsor=1"
      },
      "optionalDependencies": {
        "fsevents": "~2.3.3"
      },
      "peerDependencies": {
        "@types/node": "^20.19.0 || >=22.12.0",
        "@vitejs/devtools": "^0.7.1",
        "esbuild": "^0.27.0 || ^0.28.0",
        "jiti": ">=1.21.0",
        "less": "^4.0.0",
        "sass": "^1.70.0",
        "sass-embedded": "^1.70.0",
        "stylus": ">=0.54.8",
        "sugarss": "^5.0.0",
        "terser": "^5.16.0",
        "tsx": "^4.8.1",
        "yaml": "^2.4.2"
      },
      "peerDependenciesMeta": {
        "@types/node": {
          "optional": true
        },
        "@vitejs/devtools": {
          "optional": true
        },
        "esbuild": {
          "optional": true
        },
        "jiti": {
          "optional": true
        },
        "less": {
          "optional": true
        },
        "sass": {
          "optional": true
        },
        "sass-embedded": {
          "optional": true
        },
        "stylus": {
          "optional": true
        },
        "sugarss": {
          "optional": true
        },
        "terser": {
          "optional": true
        },
        "tsx": {
          "optional": true
        },
        "yaml": {
          "optional": true
        }
      }
    }
  }
}
```

### `package.json`

```json
{
  "name": "logicraft",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host localhost",
    "start": "vite --host localhost",
    "build": "vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "oxlint": "^1.81.0",
    "vite": "^8.3.0"
  }
}
```

### `postcss.config.js`

```javascript

```

### `public/favicon.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="46" fill="none" viewBox="0 0 48 46"><path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style="fill:#863bff;fill:color(display-p3 .5252 .23 1);fill-opacity:1"/><mask id="a" width="48" height="46" x="0" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M25.842 44.938c-.664.844-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.183c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.498 0-3.579-1.842-3.579H1.133c-.92 0-1.456-1.04-.92-1.787L9.91.473c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.578 1.842 3.578h11.377c.943 0 1.473 1.088.89 1.832L25.843 44.94z" style="fill:#000;fill-opacity:1"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#ede6ff" rx="5.508" ry="14.704" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -4.47 31.516)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#ede6ff" rx="10.399" ry="29.851" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -39.328 7.883)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#7e14ff" rx="5.508" ry="30.487" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.814 -25.913 -14.639)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.814 -32.644 -3.334)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#7e14ff" rx="5.508" ry="30.599" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="matrix(.00324 1 1 -.00324 -34.34 30.47)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#ede6ff" rx="14.072" ry="22.078" style="fill:#ede6ff;fill:color(display-p3 .9275 .9033 1);fill-opacity:1" transform="rotate(93.35 24.506 48.493)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#7e14ff" rx="3.47" ry="21.501" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(89.009 28.708 47.59)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx=".387" cy="8.972" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(39.51 .387 8.972)"/></g><g filter="url(#k)"><ellipse cx="47.523" cy="-6.092" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 47.523 -6.092)"/></g><g filter="url(#l)"><ellipse cx="41.412" cy="6.333" fill="#47bfff" rx="5.971" ry="9.665" style="fill:#47bfff;fill:color(display-p3 .2799 .748 1);fill-opacity:1" transform="rotate(37.892 41.412 6.333)"/></g><g filter="url(#m)"><ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#n)"><ellipse cx="-1.879" cy="38.332" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 -1.88 38.332)"/></g><g filter="url(#o)"><ellipse cx="35.651" cy="29.907" fill="#7e14ff" rx="4.407" ry="29.108" style="fill:#7e14ff;fill:color(display-p3 .4922 .0767 1);fill-opacity:1" transform="rotate(37.892 35.651 29.907)"/></g><g filter="url(#p)"><ellipse cx="38.418" cy="32.4" fill="#47bfff" rx="5.971" ry="15.297" style="fill:#47bfff;fill:color(display-p3 .2799 .748 1);fill-opacity:1" transform="rotate(37.892 38.418 32.4)"/></g></g><defs><filter id="b" width="60.045" height="41.654" x="-19.77" y="16.149" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-54.613" y="-7.533" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-49.64" y="2.03" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-45.045" y="20.029" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-43.513" y="21.178" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="15.756" y="-17.901" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="23.548" y="2.284" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-27.636" y="-22.853" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="20.116" y="-38.415" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="24.641" y="-11.323" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-29.286" y="6.009" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="8.244" y="-2.416" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="18.713" y="10.588" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17158" stdDeviation="4.596"/></filter></defs></svg>
```

### `public/icons.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <symbol id="bluesky-icon" viewBox="0 0 16 17">
    <g clip-path="url(#bluesky-clip)"><path fill="#08060d" d="M7.75 7.735c-.693-1.348-2.58-3.86-4.334-5.097-1.68-1.187-2.32-.981-2.74-.79C.188 2.065.1 2.812.1 3.251s.241 3.602.398 4.13c.52 1.744 2.367 2.333 4.07 2.145-2.495.37-4.71 1.278-1.805 4.512 3.196 3.309 4.38-.71 4.987-2.746.608 2.036 1.307 5.91 4.93 2.746 2.72-2.746.747-4.143-1.747-4.512 1.702.189 3.55-.4 4.07-2.145.156-.528.397-3.691.397-4.13s-.088-1.186-.575-1.406c-.42-.19-1.06-.395-2.741.79-1.755 1.24-3.64 3.752-4.334 5.099"/></g>
    <defs><clipPath id="bluesky-clip"><path fill="#fff" d="M.1.85h15.3v15.3H.1z"/></clipPath></defs>
  </symbol>
  <symbol id="discord-icon" viewBox="0 0 20 19">
    <path fill="#08060d" d="M16.224 3.768a14.5 14.5 0 0 0-3.67-1.153c-.158.286-.343.67-.47.976a13.5 13.5 0 0 0-4.067 0c-.128-.306-.317-.69-.476-.976A14.4 14.4 0 0 0 3.868 3.77C1.546 7.28.916 10.703 1.231 14.077a14.7 14.7 0 0 0 4.5 2.306q.545-.748.965-1.587a9.5 9.5 0 0 1-1.518-.74q.191-.14.372-.293c2.927 1.369 6.107 1.369 8.999 0q.183.152.372.294-.723.437-1.52.74.418.838.963 1.588a14.6 14.6 0 0 0 4.504-2.308c.37-3.911-.63-7.302-2.644-10.309m-9.13 8.234c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.894 0 1.614.82 1.599 1.82.001 1-.705 1.82-1.6 1.82m5.91 0c-.878 0-1.599-.82-1.599-1.82 0-.998.705-1.82 1.6-1.82.893 0 1.614.82 1.599 1.82 0 1-.706 1.82-1.6 1.82"/>
  </symbol>
  <symbol id="documentation-icon" viewBox="0 0 21 20">
    <path fill="none" stroke="#aa3bff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" d="m15.5 13.333 1.533 1.322c.645.555.967.833.967 1.178s-.322.623-.967 1.179L15.5 18.333m-3.333-5-1.534 1.322c-.644.555-.966.833-.966 1.178s.322.623.966 1.179l1.534 1.321"/>
    <path fill="none" stroke="#aa3bff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" d="M17.167 10.836v-4.32c0-1.41 0-2.117-.224-2.68-.359-.906-1.118-1.621-2.08-1.96-.599-.21-1.349-.21-2.848-.21-2.623 0-3.935 0-4.983.369-1.684.591-3.013 1.842-3.641 3.428C3 6.449 3 7.684 3 10.154v2.122c0 2.558 0 3.838.706 4.726q.306.383.713.671c.76.536 1.79.64 3.581.66"/>
    <path fill="none" stroke="#aa3bff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" d="M3 10a2.78 2.78 0 0 1 2.778-2.778c.555 0 1.209.097 1.748-.047.48-.129.854-.503.982-.982.145-.54.048-1.194.048-1.749a2.78 2.78 0 0 1 2.777-2.777"/>
  </symbol>
  <symbol id="github-icon" viewBox="0 0 19 19">
    <path fill="#08060d" fill-rule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clip-rule="evenodd"/>
  </symbol>
  <symbol id="social-icon" viewBox="0 0 20 20">
    <path fill="none" stroke="#aa3bff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" d="M12.5 6.667a4.167 4.167 0 1 0-8.334 0 4.167 4.167 0 0 0 8.334 0"/>
    <path fill="none" stroke="#aa3bff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.35" d="M2.5 16.667a5.833 5.833 0 0 1 8.75-5.053m3.837.474.513 1.035c.07.144.257.282.414.309l.93.155c.596.1.736.536.307.965l-.723.73a.64.64 0 0 0-.152.531l.207.903c.164.715-.213.991-.84.618l-.872-.52a.63.63 0 0 0-.577 0l-.872.52c-.624.373-1.003.094-.84-.618l.207-.903a.64.64 0 0 0-.152-.532l-.723-.729c-.426-.43-.289-.864.306-.964l.93-.156a.64.64 0 0 0 .412-.31l.513-1.034c.28-.562.735-.562 1.012 0"/>
  </symbol>
  <symbol id="x-icon" viewBox="0 0 19 19">
    <path fill="#08060d" fill-rule="evenodd" d="M1.893 1.98c.052.072 1.245 1.769 2.653 3.77l2.892 4.114c.183.261.333.48.333.486s-.068.089-.152.183l-.522.593-.765.867-3.597 4.087c-.375.426-.734.834-.798.905a1 1 0 0 0-.118.148c0 .01.236.017.664.017h.663l.729-.83c.4-.457.796-.906.879-.999a692 692 0 0 0 1.794-2.038c.034-.037.301-.34.594-.675l.551-.624.345-.392a7 7 0 0 1 .34-.374c.006 0 .93 1.306 2.052 2.903l2.084 2.965.045.063h2.275c1.87 0 2.273-.003 2.266-.021-.008-.02-1.098-1.572-3.894-5.547-2.013-2.862-2.28-3.246-2.273-3.266.008-.019.282-.332 2.085-2.38l2-2.274 1.567-1.782c.022-.028-.016-.03-.65-.03h-.674l-.3.342a871 871 0 0 1-1.782 2.025c-.067.075-.405.458-.75.852a100 100 0 0 1-.803.91c-.148.172-.299.344-.99 1.127-.304.343-.32.358-.345.327-.015-.019-.904-1.282-1.976-2.808L6.365 1.85H1.8zm1.782.91 8.078 11.294c.772 1.08 1.413 1.973 1.425 1.984.016.017.241.02 1.05.017l1.03-.004-2.694-3.766L7.796 5.75 5.722 2.852l-1.039-.004-1.039-.004z" clip-rule="evenodd"/>
  </symbol>
</svg>
```

### `src/api.js`

```javascript
const storageCollections = {
	'logicraft-orders-v1': 'orders',
	'logicraft-shipments-v1': 'shipments',
	'logicraft-drivers-v1': 'drivers',
	'logicraft-warehouse-inventory-v1': 'inventory',
	'logicraft-warehouse-inbound-v1': 'inbound',
	'logicraft-warehouse-pick-tasks-v1': 'tasks',
	'logicraft-warehouse-activity-v1': 'activity',
	'logicraft-conversations-v1': 'conversations',
	'logicraft-message-notifications-v1': 'notifications',
	'logicraft-invoices-v1': 'invoices',
	'logicraft-settings-v1': 'settings',
}

const listeners = new Set()
const pendingCollections = new Map()
const originalSetItem = Storage.prototype.setItem
let flushTimer
let flushPromise
let installed = false
let connection = { state: 'connecting', message: 'Connecting to the LogiCraft API.' }

async function fetchWithTimeout(url, options = {}) {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 5000)
	try {
		return await fetch(url, { ...options, signal: controller.signal })
	} finally {
		clearTimeout(timeout)
	}
}

function publishConnection(state, message) {
	connection = { state, message }
	listeners.forEach((listener) => listener())
}

export function getBackendConnection() {
	return connection
}

export function subscribeToBackendConnection(listener) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function parseResponse(response) {
	if (!response.ok) {
		return response.json().then(
			(body) => {
				const message = body.detail ?? body.error ?? body
				throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
			},
			() => { throw new Error(`API request failed (${response.status}).`) },
		)
	}
	return response.json()
}

async function saveCollection(collection, data) {
	const response = await fetchWithTimeout('/api/state/', {
		method: 'PUT',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ collection, data }),
	})
	return parseResponse(response)
}

function readCachedValue(key) {
	const value = window.localStorage.getItem(key)
	if (value === null) return null
	try {
		return JSON.parse(value)
	} catch {
		return null
	}
}

function queueCollection(collection, data) {
	pendingCollections.set(collection, data)
	publishConnection('saving', 'Saving changes to the Django backend.')
	clearTimeout(flushTimer)
	flushTimer = setTimeout(() => { void flushPendingCollections() }, 100)
}

async function flushPendingCollections() {
	if (flushPromise) return flushPromise
	flushPromise = (async () => {
		while (pendingCollections.size > 0) {
			const [collection, data] = pendingCollections.entries().next().value
			pendingCollections.delete(collection)
			try {
				await saveCollection(collection, data)
			} catch (error) {
				pendingCollections.set(collection, data)
				publishConnection('offline', `Backend save failed: ${error.message}`)
				return
			}
		}
		publishConnection('connected', 'Connected to the Django backend. All changes are saved.')
	})()
	try {
		await flushPromise
	} finally {
		flushPromise = null
		if (pendingCollections.size > 0 && connection.state !== 'offline') {
			flushTimer = setTimeout(() => { void flushPendingCollections() }, 100)
		}
	}
}

function installStorageSync() {
	if (installed) return
	installed = true
	Storage.prototype.setItem = function setItemAndSync(key, value) {
		originalSetItem.call(this, key, value)
		if (this !== window.localStorage) return
		const collection = storageCollections[String(key)]
		if (!collection) return
		try {
			queueCollection(collection, JSON.parse(String(value)))
		} catch (error) {
			publishConnection('offline', `Could not prepare ${collection} for saving: ${error.message}`)
		}
	}
	window.addEventListener('storage', (event) => {
		if (event.storageArea !== window.localStorage || !event.key || event.newValue === null) return
		const collection = storageCollections[event.key]
		if (!collection) return
		try {
			queueCollection(collection, JSON.parse(event.newValue))
		} catch (error) {
			publishConnection('offline', `Could not prepare ${collection} for saving: ${error.message}`)
		}
	})
}

async function hydrateFromBackend() {
	const response = await fetchWithTimeout('/api/state/', { headers: { Accept: 'application/json' } })
	const payload = await parseResponse(response)
	const backendState = payload.data
	if (!backendState || typeof backendState !== 'object' || Array.isArray(backendState)) {
		throw new Error('The backend returned an invalid workspace state.')
	}

	for (const [key, collection] of Object.entries(storageCollections)) {
		const cached = readCachedValue(key)
		if (cached !== null) {
			queueCollection(collection, cached)
		} else if (Object.hasOwn(backendState, collection)) {
			originalSetItem.call(window.localStorage, key, JSON.stringify(backendState[collection]))
		}
	}
	if (pendingCollections.size === 0) {
		publishConnection('connected', 'Connected to the Django backend. All changes are saved.')
	} else {
		void flushPendingCollections()
	}
}

export async function initializeBackendPersistence() {
	try {
		installStorageSync()
		publishConnection('connecting', 'Connecting to the LogiCraft API.')
		await hydrateFromBackend()
	} catch (error) {
		publishConnection('offline', `Django API unavailable: ${error.message}`)
	}
}

export async function reconnectBackend() {
	try {
		installStorageSync()
		publishConnection('connecting', 'Reconnecting to the Django backend.')
		await hydrateFromBackend()
	} catch (error) {
		publishConnection('offline', `Django API unavailable: ${error.message}`)
	}
}
```

### `src/App.css`

```css
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}
```

### `src/App.jsx`

```jsx
import { useSyncExternalStore } from 'react'
import Landing from './landing.jsx'
import Dashboard from './dashboard.jsx'
import { getBackendConnection, reconnectBackend, subscribeToBackendConnection } from './api.js'

function BackendConnectionStatus() {
  const connection = useSyncExternalStore(
    subscribeToBackendConnection,
    getBackendConnection,
    getBackendConnection,
  )
  const needsAttention = connection.state === 'offline'

  return (
    <aside className={`backend-connection backend-connection-${connection.state}`} aria-live="polite">
      <span className="backend-connection-indicator" aria-hidden="true" />
      <span title={connection.message}>
        {connection.state === 'connected' ? 'Django connected' : connection.state === 'saving' ? 'Saving to Django…' : connection.state === 'offline' ? 'Backend unavailable' : 'Connecting to Django…'}
      </span>
      {needsAttention && <button type="button" onClick={() => { void reconnectBackend() }}>Retry</button>}
    </aside>
  )
}

export default function App() {
  return (
    <>
      {window.location.pathname === '/dashboard' ? <Dashboard /> : <Landing />}
      <BackendConnectionStatus />
    </>
  )
}
```

### `src/assets/react.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
```

### `src/assets/vite.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="77" height="47" fill="none" aria-labelledby="vite-logo-title" viewBox="0 0 77 47"><title id="vite-logo-title">Vite</title><style>.parenthesis{fill:#000}@media (prefers-color-scheme:dark){.parenthesis{fill:#fff}}</style><path fill="#9135ff" d="M40.151 45.71c-.663.844-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.493c-.92 0-1.457-1.04-.92-1.788l7.479-10.471c1.07-1.498 0-3.578-1.842-3.578H15.443c-.92 0-1.456-1.04-.92-1.788l9.696-13.576c.213-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.472c-1.07 1.497 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.087.89 1.83L40.153 45.712z"/><mask id="a" width="48" height="47" x="14" y="0" maskUnits="userSpaceOnUse" style="mask-type:alpha"><path fill="#000" d="M40.047 45.71c-.663.843-2.02.374-2.02-.699V34.708a2.26 2.26 0 0 0-2.262-2.262H24.389c-.92 0-1.457-1.04-.92-1.788l7.479-10.472c1.07-1.497 0-3.578-1.842-3.578H15.34c-.92 0-1.456-1.04-.92-1.788l9.696-13.575c.213-.297.556-.474.92-.474H53.93c.92 0 1.456 1.04.92 1.788L47.37 13.03c-1.07 1.498 0 3.578 1.842 3.578h11.376c.944 0 1.474 1.088.89 1.831L40.049 45.712z"/></mask><g mask="url(#a)"><g filter="url(#b)"><ellipse cx="5.508" cy="14.704" fill="#eee6ff" rx="5.508" ry="14.704" transform="rotate(269.814 20.96 11.29)scale(-1 1)"/></g><g filter="url(#c)"><ellipse cx="10.399" cy="29.851" fill="#eee6ff" rx="10.399" ry="29.851" transform="rotate(89.814 -16.902 -8.275)scale(1 -1)"/></g><g filter="url(#d)"><ellipse cx="5.508" cy="30.487" fill="#8900ff" rx="5.508" ry="30.487" transform="rotate(89.814 -19.197 -7.127)scale(1 -1)"/></g><g filter="url(#e)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.928 4.177)scale(1 -1)"/></g><g filter="url(#f)"><ellipse cx="5.508" cy="30.599" fill="#8900ff" rx="5.508" ry="30.599" transform="rotate(89.814 -25.738 5.52)scale(1 -1)"/></g><g filter="url(#g)"><ellipse cx="14.072" cy="22.078" fill="#eee6ff" rx="14.072" ry="22.078" transform="rotate(93.35 31.245 55.578)scale(-1 1)"/></g><g filter="url(#h)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#i)"><ellipse cx="3.47" cy="21.501" fill="#8900ff" rx="3.47" ry="21.501" transform="rotate(89.009 35.419 55.202)scale(-1 1)"/></g><g filter="url(#j)"><ellipse cx="14.592" cy="9.743" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(39.51 14.592 9.743)"/></g><g filter="url(#k)"><ellipse cx="61.728" cy="-5.321" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 61.728 -5.32)"/></g><g filter="url(#l)"><ellipse cx="55.618" cy="7.104" fill="#00c2ff" rx="5.971" ry="9.665" transform="rotate(37.892 55.618 7.104)"/></g><g filter="url(#m)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#n)"><ellipse cx="12.326" cy="39.103" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 12.326 39.103)"/></g><g filter="url(#o)"><ellipse cx="49.857" cy="30.678" fill="#8900ff" rx="4.407" ry="29.108" transform="rotate(37.892 49.857 30.678)"/></g><g filter="url(#p)"><ellipse cx="52.623" cy="33.171" fill="#00c2ff" rx="5.971" ry="15.297" transform="rotate(37.892 52.623 33.17)"/></g></g><path d="M6.919 0c-9.198 13.166-9.252 33.575 0 46.789h6.215c-9.25-13.214-9.196-33.623 0-46.789zm62.424 0h-6.215c9.198 13.166 9.252 33.575 0 46.789h6.215c9.25-13.214 9.196-33.623 0-46.789" class="parenthesis"/><defs><filter id="b" width="60.045" height="41.654" x="-5.564" y="16.92" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="c" width="90.34" height="51.437" x="-40.407" y="-6.762" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="d" width="79.355" height="29.4" x="-35.435" y="2.801" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="e" width="79.579" height="29.4" x="-30.84" y="20.8" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="f" width="79.579" height="29.4" x="-29.307" y="21.949" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="g" width="74.749" height="58.852" x="29.961" y="-17.13" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="7.659"/></filter><filter id="h" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="i" width="61.377" height="25.362" x="37.754" y="3.055" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="j" width="56.045" height="63.649" x="-13.43" y="-22.082" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="k" width="54.814" height="64.646" x="34.321" y="-37.644" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="l" width="33.541" height="35.313" x="38.847" y="-10.552" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="m" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="n" width="54.814" height="64.646" x="-15.081" y="6.78" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="o" width="54.814" height="64.646" x="22.45" y="-1.645" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter><filter id="p" width="39.409" height="43.623" x="32.919" y="11.36" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_2002_17286" stdDeviation="4.596"/></filter></defs></svg>
```

### `src/dashboard.css`

```css
.dashboard-layout {
	display: flex;
	min-height: 100vh;
	min-height: 100dvh;
	background: #f7f7f9;
}

.logicraft-sidebar {
	--sidebar-ink: #242329;
	--sidebar-muted: #85828d;
	--sidebar-accent: #7544c8;
	--sidebar-accent-bg: #f4effc;
	--sidebar-line: #eeedf0;
	box-sizing: border-box;
	display: flex;
	flex: 0 0 272px;
	flex-direction: column;
	width: 272px;
	min-height: 100vh;
	min-height: 100dvh;
	padding: 29px 20px 18px;
	border-right: 1px solid var(--sidebar-line);
	border-left: 3px solid #f3eafa;
	background: #fff;
	color: var(--sidebar-ink);
	font-family: 'Segoe UI', sans-serif;
	font-size: 14px;
	line-height: 1.4;
}

.sidebar-brand {
	display: flex;
	align-items: center;
	gap: 11px;
	min-height: 38px;
	margin: 0 10px 47px;
	color: inherit;
	text-decoration: none;
}

.sidebar-brand-mark {
	position: relative;
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	place-items: center;
	border-radius: 11px 11px 11px 4px;
	background: #7544c8;
	transform: rotate(-5deg);
}

.sidebar-brand-mark::before,
.sidebar-brand-mark span {
	position: absolute;
	display: block;
	content: '';
}

.sidebar-brand-mark::before {
	width: 12px;
	height: 19px;
	border: 2px solid #fff;
	border-right: 0;
	border-radius: 3px 0 0 3px;
}

.sidebar-brand-mark span {
	width: 10px;
	height: 2px;
	background: #fff;
	transform: translate(1px, 2px);
}

.sidebar-brand-name {
	font-size: 17px;
	font-weight: 750;
	letter-spacing: 0;
}

.sidebar-groups {
	display: flex;
	flex-direction: column;
	gap: 31px;
}

.sidebar-group-title {
	margin: 0 10px 12px;
	color: var(--sidebar-muted);
	font-size: 11px;
	font-weight: 650;
	letter-spacing: 0.08em;
	line-height: 1.3;
	text-transform: uppercase;
}

.sidebar-nav {
	display: grid;
	gap: 4px;
}

.sidebar-link {
	display: flex;
	width: 100%;
	min-height: 42px;
	align-items: center;
	gap: 12px;
	padding: 0 11px;
	border-radius: 8px;
	color: #66636d;
	font-size: 14px;
	font-weight: 500;
	text-align: left;
	text-decoration: none;
	background: transparent;
	border: 0;
	cursor: pointer;
	transition: background-color 140ms ease, color 140ms ease;
}

.sidebar-link:hover {
	background: #f8f6fb;
	color: var(--sidebar-ink);
}

.sidebar-link.is-active {
	background: var(--sidebar-accent-bg);
	color: var(--sidebar-accent);
	font-weight: 650;
}

.sidebar-link:focus-visible,
.sidebar-logout:focus-visible,
.sidebar-brand:focus-visible {
	outline: 2px solid var(--sidebar-accent);
	outline-offset: 2px;
}

.sidebar-link-icon {
	display: grid;
	width: 18px;
	height: 18px;
	flex: 0 0 18px;
	place-items: center;
}

.sidebar-link-icon svg,
.sidebar-logout svg {
	display: block;
	width: 18px;
	height: 18px;
}

.sidebar-footer {
	display: grid;
	gap: 12px;
	margin-top: auto;
	padding-top: 17px;
	border-top: 1px solid var(--sidebar-line);
}

.sidebar-profile {
	display: flex;
	min-height: 48px;
	align-items: center;
	gap: 10px;
	padding: 2px 3px;
}

.sidebar-avatar {
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	place-items: center;
	border-radius: 50%;
	background: #eee7f8;
	color: #6740a6;
	font-size: 11px;
	font-weight: 700;
}

.sidebar-profile-label {
	overflow: hidden;
	color: #4c4953;
	font-weight: 550;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sidebar-logout {
	display: grid;
	width: 34px;
	height: 34px;
	flex: 0 0 34px;
	place-items: center;
	margin-left: auto;
	padding: 0;
	border: 0;
	border-radius: 7px;
	background: transparent;
	color: var(--sidebar-muted);
	cursor: pointer;
}

.sidebar-logout:hover {
	background: #f8f6fb;
	color: var(--sidebar-ink);
}

@media (max-width: 640px) {
	.logicraft-sidebar {
		width: min(272px, 88vw);
		flex-basis: min(272px, 88vw);
		padding-right: 16px;
		padding-left: 16px;
	}

	.sidebar-brand {
		margin-left: 8px;
	}
}

.dashboard-page-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 18px;
	padding: 6px 2px 4px;
}

.dashboard-page-heading h1 {
	margin: 0 0 4px;
	color: #302d36;
	font-size: 24px;
	font-weight: 680;
	letter-spacing: -.3px;
}

.dashboard-page-heading p:not(.dashboard-eyebrow) {
	color: #85828d;
	font-size: 12px;
}

.dashboard-eyebrow {
	margin: 0 0 5px;
	color: #7544c8;
	font-size: 9px;
	font-weight: 700;
	letter-spacing: .12em;
}

.dashboard-quick-actions,
.settings-actions {
	display: flex;
	align-items: center;
	gap: 8px;
}

.dashboard-quick-actions button,
.settings-save-button {
	min-height: 35px;
	padding: 0 12px;
	border: 1px solid #e8e2f0;
	border-radius: 7px;
	background: #fff;
	color: #6740a6;
	font: inherit;
	font-size: 11px;
	font-weight: 600;
	cursor: pointer;
}

.dashboard-quick-actions button:hover {
	background: #f7f3fc;
}

.chart-point {
	fill: #7544c8;
	stroke: #fff;
	stroke-width: 2;
	vector-effect: non-scaling-stroke;
}

.tracking-open-link {
	padding: 4px 0 4px 6px;
	border: 0;
	background: transparent;
	color: #7544c8;
	font: inherit;
	font-size: 10px;
	cursor: pointer;
	white-space: nowrap;
}

.tracking-open-link:hover {
	text-decoration: underline;
}

.location-chart {
	--location-united-states: #7544c8;
	--location-canada: #43cb83;
	--location-mexico: #df4d9d;
	--location-other: #a8d936;
}

.location-dot.other {
	background: var(--location-other);
}

.shipment-status.status-delayed {
	background: #fff0ef;
	color: #c65a51;
}

.analytics-metrics {
	grid-template-columns: repeat(5, minmax(0, 1fr));
}

.analytics-insights {
	grid-template-columns: minmax(0, 2fr) minmax(240px, 1fr);
}

.settings-panel {
	max-width: 760px;
	padding: 22px;
}

.settings-form {
	display: grid;
	gap: 18px;
	margin-top: 20px;
}

.settings-field {
	display: grid;
	gap: 7px;
	color: #514d58;
	font-size: 12px;
	font-weight: 600;
}

.settings-field input,
.settings-field select {
	box-sizing: border-box;
	width: 100%;
	min-height: 40px;
	padding: 0 11px;
	border: 1px solid #e8e6eb;
	border-radius: 7px;
	background: #fff;
	color: #34313a;
	font: inherit;
	font-weight: 400;
}

.settings-checkbox {
	display: flex;
	align-items: flex-start;
	gap: 10px;
	color: #514d58;
	font-size: 12px;
}

.settings-checkbox input {
	width: 16px;
	height: 16px;
	margin: 1px 0 0;
	accent-color: #7544c8;
}

.settings-checkbox strong,
.settings-checkbox small {
	display: block;
}

.settings-checkbox small {
	margin-top: 3px;
	color: #85828d;
}

.settings-actions {
	justify-content: space-between;
	padding-top: 15px;
	border-top: 1px solid #eeedf0;
}

.settings-actions p {
	color: #438d66;
	font-size: 11px;
}

.settings-save-button {
	border-color: #7544c8;
	background: #7544c8;
	color: #fff;
}

.settings-save-button:hover {
	background: #6034ae;
}

.dashboard-quick-actions button:focus-visible,
.tracking-open-link:focus-visible,
.settings-field input:focus-visible,
.settings-field select:focus-visible,
.settings-save-button:focus-visible {
	outline: 2px solid #7544c8;
	outline-offset: 2px;
}

@media (max-width: 800px) {
	.analytics-metrics {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.analytics-insights {
		grid-template-columns: minmax(0, 1fr);
	}
}

@media (max-width: 560px) {
	.dashboard-page-heading {
		align-items: flex-start;
		flex-direction: column;
	}

	.dashboard-quick-actions {
		width: 100%;
	}

	.dashboard-quick-actions button {
		flex: 1;
	}

	.settings-panel {
		padding: 15px;
	}
}

@media (prefers-reduced-motion: reduce) {
	.sidebar-link {
		transition: none;
	}
}

.dashboard-main {
	min-width: 0;
	flex: 1;
	padding: 20px;
}

.dashboard-content {
	display: grid;
	max-width: 1600px;
	gap: 14px;
	margin: 0 auto;
}

.metrics-grid {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 12px;
}

.metric-card,
.dashboard-panel {
	min-width: 0;
	border: 1px solid #f0eff2;
	border-radius: 10px;
	background: #fff;
	box-shadow: 0 2px 8px rgb(28 24 38 / 3%);
}

.metric-card {
	display: grid;
	min-height: 90px;
	align-content: space-between;
	gap: 7px;
	padding: 13px 14px 11px;
}

.metric-heading,
.metric-bottom {
	display: flex;
	min-width: 0;
	align-items: center;
}

.metric-heading {
	gap: 8px;
}

.metric-icon {
	display: grid;
	width: 25px;
	height: 25px;
	flex: 0 0 25px;
	place-items: center;
	border-radius: 8px;
	background: #f4effc;
	color: #7847c6;
}

.metric-icon svg {
	width: 15px;
	height: 15px;
}

.metric-label {
	overflow: hidden;
	color: #77747e;
	font-size: 12px;
	font-weight: 550;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metric-more {
	width: 26px;
	height: 26px;
	flex: 0 0 26px;
	margin-left: auto;
	padding: 0;
	border: 0;
	border-radius: 5px;
	background: transparent;
	color: #625e68;
	cursor: pointer;
	font-size: 17px;
	font-weight: 700;
	line-height: 1;
}

.metric-more:hover {
	background: #f6f4f8;
}

.metric-bottom {
	justify-content: space-between;
	gap: 5px;
}

.metric-value {
	color: #242229;
	font-size: 22px;
	font-weight: 720;
	line-height: 1;
}

.metric-empty-note {
	color: #9996a0;
	font-size: 10px;
	white-space: nowrap;
}

.insights-grid {
	display: grid;
	grid-template-columns: minmax(0, 1.85fr) minmax(230px, .96fr) minmax(220px, .9fr);
	gap: 12px;
}

.dashboard-panel {
	padding: 16px;
}

.panel-heading {
	display: flex;
	min-width: 0;
	min-height: 21px;
	align-items: center;
	gap: 12px;
}

.panel-heading h2,
.shipments-toolbar h2 {
	margin: 0;
	color: #302d36;
	font-size: 13px;
	font-weight: 650;
	line-height: 1.3;
	white-space: nowrap;
}

.analytics-heading {
	gap: 13px;
}

.panel-heading-divider {
	width: 1px;
	height: 16px;
	flex: 0 0 1px;
	background: #e7e5e9;
}

.chart-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	color: #706d76;
	font-size: 10px;
}

.chart-legend span {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	white-space: nowrap;
}

.legend-dot,
.location-dot {
	display: inline-block;
	width: 7px;
	height: 7px;
	flex: 0 0 7px;
	border-radius: 50%;
}

.this-year {
	background: #7544c8;
}

.last-year {
	background: #51d2a2;
}

.chart-wrap {
	height: 205px;
	margin-top: 11px;
}

.shipments-chart {
	display: block;
	width: 100%;
	height: 100%;
	overflow: visible;
}

.chart-gridline {
	stroke: #f0eff2;
	stroke-width: 1;
}

.chart-axis-label,
.chart-month {
	fill: #9996a0;
	font-family: 'Segoe UI', sans-serif;
	font-size: 10px;
}

.chart-month {
	text-anchor: middle;
}

.chart-empty-label {
	fill: #9996a0;
	font-family: 'Segoe UI', sans-serif;
	font-size: 12px;
	text-anchor: middle;
}

.chart-area {
	fill: url(#shipmentFill);
}

.chart-line {
	fill: none;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-width: 2;
	vector-effect: non-scaling-stroke;
}

.this-year-line {
	stroke: #8050cc;
}

.last-year-line {
	stroke: #61d7ab;
	stroke-dasharray: 2 5;
}

.tracking-heading {
	justify-content: space-between;
}

.tracking-controls {
	display: flex;
	gap: 4px;
}

.tracking-controls button {
	display: grid;
	width: 22px;
	height: 22px;
	place-items: center;
	padding: 0;
	border: 0;
	border-radius: 5px;
	background: transparent;
	color: #77737e;
	cursor: pointer;
	font-size: 18px;
	line-height: 1;
}

.tracking-controls button:hover {
	background: #f4f1f8;
	color: #7544c8;
}

.panel-empty-state {
	display: grid;
	min-height: 170px;
	place-items: center;
	color: #898691;
	font-size: 12px;
}

.tracking-id-card {
	display: flex;
	min-height: 43px;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 10px;
	padding: 6px 9px;
	border-radius: 7px;
	background: #f7f4fb;
}

.tracking-id-card small,
.tracking-id-card strong {
	display: block;
}

.tracking-id-card small,
.timeline-stop small {
	color: #8e8a95;
	font-size: 10px;
}

.tracking-id-card strong {
	margin-top: 2px;
	color: #35313c;
	font-size: 11px;
	font-weight: 650;
}

.tracking-pill {
	padding: 4px 9px;
	border-radius: 999px;
	background: #7544c8;
	color: #fff;
	font-size: 9px;
	white-space: nowrap;
}

.tracking-timeline {
	display: grid;
	gap: 0;
	margin: 10px 0 0;
	padding: 0;
	list-style: none;
}

.timeline-stop {
	position: relative;
	display: grid;
	min-height: 55px;
	grid-template-columns: 13px minmax(0, 1fr);
	gap: 8px;
}

.timeline-stop:not(:last-child)::after {
	position: absolute;
	top: 13px;
	bottom: 0;
	left: 5px;
	width: 2px;
	background: #d9c9f1;
	content: '';
}

.timeline-dot {
	z-index: 1;
	width: 11px;
	height: 11px;
	margin-top: 3px;
	border: 2px solid #fff;
	border-radius: 50%;
	background: #8e8a95;
	box-shadow: 0 0 0 1px #e9e7eb;
}

.timeline-stop:not(:first-child) .timeline-dot {
	background: #7544c8;
	box-shadow: none;
}

.timeline-stop strong {
	display: block;
	overflow: hidden;
	margin-top: 2px;
	color: #34313a;
	font-size: 12px;
	font-weight: 600;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.location-panel {
	display: flex;
	flex-direction: column;
}

.location-chart {
	position: relative;
	width: 112px;
	height: 112px;
	flex: 0 0 112px;
	align-self: center;
	margin: 10px auto 12px;
	border-radius: 50%;
	background: conic-gradient(#7544c8 0 52.1%, #43cb83 52.1% 74.9%, #df4d9d 74.9% 88.8%, #a8d936 88.8% 100%);
	transform: rotate(-2deg);
}

.location-chart::before {
	position: absolute;
	inset: 24px;
	border-radius: 50%;
	background: #fff;
	content: '';
}

.location-chart.is-empty {
	background: #eeedf0;
	transform: none;
}

.location-chart.is-empty::after {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	color: #77737e;
	content: '0';
	font-size: 21px;
	font-weight: 650;
}

.location-legend {
	display: grid;
	gap: 9px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.location-legend li {
	display: grid;
	grid-template-columns: 8px minmax(0, 1fr) auto;
	align-items: center;
	gap: 6px;
	color: #74717a;
	font-size: 10px;
}

.location-legend strong {
	color: #77747d;
	font-size: 10px;
	font-weight: 500;
}

.united-states {
	background: #7544c8;
}

.canada {
	background: #43cb83;
}

.mexico {
	background: #df4d9d;
}

.other {
	background: #a8d936;
}

.shipments-panel {
	padding: 12px 15px 4px;
}

.shipments-toolbar {
	display: flex;
	min-width: 0;
	align-items: center;
	gap: 10px;
	margin-bottom: 12px;
}

.shipments-toolbar h2 {
	margin-right: 7px;
}

.shipment-search {
	display: flex;
	height: 32px;
	min-width: 100px;
	flex: 1;
	align-items: center;
	gap: 8px;
	padding: 0 10px;
	border: 1px solid transparent;
	border-radius: 6px;
	background: #f6f6f7;
	color: #85828c;
}

.shipment-search:focus-within {
	border-color: #cdb9ec;
	background: #fff;
}

.shipment-search svg {
	width: 15px;
	height: 15px;
	flex: 0 0 15px;
	fill: none;
	stroke: currentColor;
	stroke-linecap: round;
	stroke-width: 1.6;
}

.shipment-search input {
	width: 100%;
	min-width: 0;
	padding: 0;
	border: 0;
	outline: 0;
	background: transparent;
	color: #37343d;
	font: inherit;
	font-size: 11px;
}

.shipment-search input::placeholder {
	color: #a29fa8;
}

.toolbar-select {
	display: flex;
	height: 32px;
	align-items: center;
	gap: 5px;
	padding: 0 8px;
	border-radius: 6px;
	background: #f6f6f7;
	color: #6c6972;
	font-size: 10px;
	white-space: nowrap;
}

.toolbar-select select {
	max-width: 105px;
	padding: 0 12px 0 0;
	border: 0;
	outline: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
}

.filter-select select {
	width: 15px;
	color: transparent;
}

.filter-select:focus-within select,
.filter-select:hover select {
	width: auto;
	color: inherit;
}

.shipments-table-scroll {
	overflow-x: auto;
}

.dashboard-shipments-table {
	width: 100%;
	border-collapse: collapse;
	color: #74717a;
	font-size: 10px;
	text-align: left;
	white-space: nowrap;
}

.dashboard-shipments-table th {
	height: 34px;
	border-bottom: 1px solid #ecebef;
	color: #37343d;
	font-size: 10px;
	font-weight: 650;
}

.dashboard-shipments-table td {
	height: 37px;
	border-bottom: 1px solid #f2f1f3;
}

.dashboard-shipments-table tr:last-child td {
	border-bottom: 0;
}

.shipment-id {
	color: #77737d;
}

.route-from,
.route-to {
	display: block;
	line-height: 1.45;
}

.route-to {
	color: #7650b7;
}

.shipment-status {
	display: inline-block;
	padding: 4px 9px;
	border-radius: 999px;
	font-size: 9px;
	line-height: 1.2;
}

.status-on-delivery {
	background: #edf7ff;
	color: #4d9bcc;
}

.status-pending {
	background: #fff4e7;
	color: #d89a32;
}

.status-completed {
	background: #eaf9ef;
	color: #38a969;
}

.empty-table {
	height: 68px !important;
	color: #85818c;
	text-align: center;
}

.clear-filters-button {
	padding: 0 8px;
	border: 0;
	background: transparent;
	color: #7544c8;
	cursor: pointer;
	font: inherit;
	font-size: 10px;
}

.clear-filters-button:hover {
	text-decoration: underline;
}

.module-empty {
	display: grid;
	min-height: 320px;
	align-content: center;
	justify-items: center;
	gap: 12px;
	text-align: center;
}

.module-empty-icon {
	display: grid;
	width: 44px;
	height: 44px;
	place-items: center;
	border-radius: 12px;
	background: #f4effc;
	color: #7544c8;
}

.module-empty-icon svg {
	width: 22px;
	height: 22px;
}

.module-empty h1 {
	margin: 0;
	color: #302d36;
	font-size: 21px;
}

.module-empty p {
	color: #85828d;
	font-size: 13px;
}

.module-empty button,
.dashboard-help-dialog button {
	min-height: 36px;
	padding: 0 13px;
	border: 0;
	border-radius: 7px;
	background: #7544c8;
	color: #fff;
	cursor: pointer;
	font: inherit;
	font-size: 12px;
}

.module-empty button:hover,
.dashboard-help-dialog button:hover {
	background: #6034ae;
}

.dashboard-dialog-backdrop {
	position: fixed;
	z-index: 10;
	inset: 0;
	display: grid;
	place-items: center;
	padding: 20px;
	background: rgb(29 25 36 / 34%);
}

.dashboard-help-dialog {
	width: min(380px, 100%);
	padding: 22px;
	border: 1px solid #eeedf0;
	border-radius: 10px;
	background: #fff;
	box-shadow: 0 16px 48px rgb(26 20 36 / 16%);
}

.dashboard-help-dialog h2 {
	margin: 0 0 8px;
	color: #302d36;
	font-size: 17px;
}

.dashboard-help-dialog p {
	margin-bottom: 18px;
	color: #77737e;
	font-size: 13px;
}

.dashboard-help-dialog button {
	min-width: 74px;
}

.module-empty button:focus-visible,
.dashboard-help-dialog button:focus-visible,
.clear-filters-button:focus-visible {
	outline: 2px solid #7544c8;
	outline-offset: 2px;
}

@media (max-width: 1180px) {
	.insights-grid {
		grid-template-columns: minmax(0, 1.5fr) minmax(220px, 1fr);
	}

	.location-panel {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: 1fr 130px 1fr;
		align-items: center;
	}

	.location-panel .panel-heading {
		grid-column: 1 / -1;
	}

	.location-chart {
		margin: 12px 0;
	}
}

@media (max-width: 800px) {
	.dashboard-main {
		padding: 14px;
	}

	.metrics-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.insights-grid {
		grid-template-columns: minmax(0, 1fr);
	}

	.location-panel {
		grid-column: auto;
	}

	.location-panel .panel-heading {
		grid-column: auto;
	}

	.location-panel {
		display: flex;
	}

	.location-chart {
		margin: 10px auto 12px;
	}

	.shipments-toolbar {
		flex-wrap: wrap;
	}

	.shipments-toolbar h2 {
		flex: 1 0 100%;
	}
}

@media (max-width: 560px) {
	.dashboard-layout {
		align-items: flex-start;
	}

	.logicraft-sidebar {
		flex-basis: 76px;
		width: 76px;
		align-items: center;
		padding: 16px 8px;
	}

	.sidebar-brand {
		margin: 0 0 28px;
	}

	.sidebar-brand-name,
	.sidebar-group-title,
	.sidebar-link > span:last-child,
	.sidebar-profile-label,
	.sidebar-logout,
	.sidebar-footer > .sidebar-link {
		display: none;
	}

	.sidebar-groups {
		width: 100%;
		gap: 18px;
	}

	.sidebar-nav {
		justify-items: center;
	}

	.sidebar-link {
		width: 42px;
		justify-content: center;
		padding: 0;
	}

	.sidebar-footer {
		justify-items: center;
		width: 100%;
	}

	.sidebar-profile {
		padding: 0;
	}

	.dashboard-main {
		padding: 10px;
	}

	.metric-card {
		min-height: 88px;
		padding: 10px;
	}

	.metric-value {
		font-size: 19px;
	}

	.dashboard-panel {
		padding: 13px;
	}

	.analytics-heading {
		flex-wrap: wrap;
		gap: 8px;
	}

	.chart-wrap {
		height: 180px;
	}

	.shipments-panel {
		padding: 12px 10px 4px;
	}

	.shipment-search {
		flex-basis: 100%;
		order: 3;
	}

	.toolbar-select {
		flex: 1;
		justify-content: center;
	}

	.toolbar-select select {
		max-width: 90px;
	}
}

.tracking-workspace {
	--track-bg: #f7f7f9;
	--track-panel: #fff;
	--track-panel-raised: #f6f6f7;
	--track-line: #eeedf0;
	--track-ink: #302d36;
	--track-muted: #85828d;
	--track-accent: #7544c8;
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 28px clamp(18px, 3vw, 42px) 38px;
	background: var(--track-bg);
	color: var(--track-ink);
	font-family: 'Segoe UI', sans-serif;
}

.tracking-page-header,
.tracking-list-heading,
.tracking-detail-heading,
.tracking-progress-heading,
.tracking-card-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
}

.tracking-page-header {
	margin: 0 auto 23px;
	max-width: 1500px;
}

.tracking-eyebrow {
	margin: 0 0 7px;
	color: var(--track-accent);
	font-size: 9px;
	font-weight: 700;
	letter-spacing: .12em;
}

.tracking-page-header h1 {
	margin: 0;
	color: var(--track-ink);
	font-size: 25px;
	font-weight: 650;
	letter-spacing: 0;
}

.tracking-subtitle {
	margin-top: 5px;
	color: var(--track-muted);
	font-size: 12px;
}

.tracking-live-indicator {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 11px;
	border: 1px solid var(--track-line);
	border-radius: 6px;
	color: #66636d;
	font-size: 10px;
}

.tracking-live-indicator i,
.driver-online i,
.tracking-eta-card small i {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: #48d59a;
}

.tracking-live-indicator span {
	margin-left: 5px;
	color: var(--track-muted);
}

.tracking-summary {
	display: grid;
	grid-template-columns: repeat(4, minmax(0, 1fr));
	gap: 10px;
	max-width: 1500px;
	margin: 0 auto 14px;
}

.tracking-stat,
.tracking-list-panel,
.tracking-detail-panel {
	border: 1px solid var(--track-line);
	border-radius: 8px;
	background: var(--track-panel);
}

.tracking-stat {
	position: relative;
	display: grid;
	min-height: 103px;
	grid-template-columns: 1fr auto;
	align-content: center;
	column-gap: 12px;
	padding: 14px 16px;
}

.tracking-stat-mark {
	position: absolute;
	top: 17px;
	left: 16px;
	width: 7px;
	height: 7px;
	border-radius: 2px;
	background: var(--track-accent);
}

.mark-1 { background: #55b8ff; }
.mark-2 { background: #49d89b; }
.mark-3 { background: #edab54; }

.tracking-stat-label {
	padding-left: 14px;
	color: #77747e;
	font-size: 11px;
}

.tracking-stat strong {
	grid-column: 1;
	margin-top: 7px;
	color: var(--track-ink);
	font-size: 25px;
	font-weight: 650;
	line-height: 1;
}

.tracking-stat small {
	grid-column: 1;
	margin-top: 7px;
	color: var(--track-muted);
	font-size: 9px;
}

.tracking-list-panel,
.tracking-detail-panel {
	max-width: 1500px;
	margin: 0 auto 14px;
	padding: 17px 18px;
}

.tracking-list-heading h2,
.tracking-detail-heading h2 {
	margin: 0;
	color: var(--track-ink);
	font-size: 15px;
	font-weight: 650;
}

.tracking-list-heading p {
	margin-top: 4px;
	color: var(--track-muted);
	font-size: 10px;
}

.tracking-search {
	display: flex;
	width: min(320px, 42%);
	height: 35px;
	align-items: center;
	gap: 8px;
	padding: 0 10px;
	border: 1px solid var(--track-line);
	border-radius: 5px;
	background: #f6f6f7;
	color: #85828d;
}

.tracking-search:focus-within { border-color: #cdb9ec; background: #fff; }
.tracking-search svg { width: 15px; height: 15px; flex: 0 0 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.tracking-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 10px; }
.tracking-search input::placeholder { color: #a29fa8; }

.tracking-filter-row {
	display: flex;
	gap: 5px;
	overflow-x: auto;
	margin: 15px -2px 12px;
	padding: 0 2px 2px;
}

.tracking-filter-row button {
	display: inline-flex;
	min-height: 29px;
	align-items: center;
	gap: 7px;
	flex: 0 0 auto;
	padding: 0 9px;
	border: 1px solid transparent;
	border-radius: 4px;
	background: transparent;
	color: #706d76;
	font: inherit;
	font-size: 10px;
	cursor: pointer;
}

.tracking-filter-row button span {
	color: #9996a0;
	font-size: 9px;
}

.tracking-filter-row button:hover { background: #f8f6fb; color: var(--track-ink); }
.tracking-filter-row button.selected { border-color: #e4d8f5; background: #f4effc; color: var(--track-accent); }
.tracking-filter-row button.selected span { color: #8050cc; }

.tracking-table-scroll { overflow-x: auto; }
.tracking-table { width: 100%; min-width: 760px; border-collapse: collapse; text-align: left; }
.tracking-table th { height: 34px; border-top: 1px solid var(--track-line); border-bottom: 1px solid var(--track-line); color: #77747e; font-size: 9px; font-weight: 550; }
.tracking-table td { height: 57px; border-bottom: 1px solid #f2f1f3; }
.tracking-table tr:last-child td { border-bottom: 0; }
.tracking-table tbody tr { transition: background-color 120ms ease; }
.tracking-table tbody tr:hover,
.tracking-table tbody tr.is-selected { background: #faf8fd; }
.tracking-table td strong,
.tracking-row-select strong { display: block; color: #37343d; font-size: 10px; font-weight: 600; }
.tracking-table td > span:not(.tracking-status),
.tracking-row-select span { display: block; margin-top: 4px; color: #85828d; font-size: 9px; }
.tracking-row-select { padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; }
.tracking-row-select:hover strong { color: var(--track-accent); }

.tracking-status {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 7px;
	border-radius: 4px;
	font-size: 9px;
	white-space: nowrap;
}

.tracking-status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-in-transit { background: #f4effc; color: #7544c8; }
.status-out-for-delivery { background: #eaf9ef; color: #38a969; }
.status-delivered { background: #eaf9ef; color: #38a969; }
.status-delayed { background: #fff4e7; color: #d89a32; }
.tracking-open-button { padding: 5px 7px; border: 0; border-radius: 4px; background: transparent; color: #706d76; font: inherit; font-size: 9px; cursor: pointer; }
.tracking-open-button:hover { color: var(--track-accent); background: #f4effc; }
.tracking-no-results { height: 75px !important; color: var(--track-muted); font-size: 11px; text-align: center; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

.tracking-detail-heading { margin-bottom: 15px; }
.tracking-detail-heading .tracking-eyebrow { margin-bottom: 4px; }
.tracking-detail-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(260px, .8fr); gap: 14px; }
.tracking-detail-main,
.tracking-detail-aside { min-width: 0; }

.tracking-map {
	position: relative;
	height: 210px;
	overflow: hidden;
	border: 1px solid #e5e4e7;
	border-radius: 6px;
	background: #f2f5f8;
}

.google-route-map { width: 100%; height: 100%; }
.leaflet-route-map { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; }
.google-map-message { position: absolute; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(255 255 255 / 84%); color: #706d76; font-size: 11px; text-align: center; }
.map-location-note { position: absolute; z-index: 500; right: 8px; bottom: 25px; padding: 4px 6px; border: 1px solid #eeedf0; border-radius: 3px; background: rgb(255 255 255 / 92%); color: #706d76; font-size: 8px; pointer-events: none; }
.tracking-map .leaflet-control-attribution { font-size: 8px; }

.tracking-route-points { display: grid; grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr); align-items: center; gap: 10px; padding: 13px 2px 15px; border-bottom: 1px solid var(--track-line); }
.tracking-route-points > div { position: relative; display: grid; grid-template-columns: 10px minmax(0, 1fr); column-gap: 7px; align-items: center; }
.route-pin { grid-row: span 2; width: 8px; height: 8px; border: 2px solid var(--track-accent); border-radius: 50%; }
.destination-pin { border-color: #efb35f; }
.tracking-route-points small { color: var(--track-muted); font-size: 8px; }
.tracking-route-points strong { overflow: hidden; margin-top: 3px; color: #37343d; font-size: 9px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.route-connector { height: 1px; background: repeating-linear-gradient(90deg, #c9c5cf 0 3px, transparent 3px 6px); }

.tracking-progress-wrap { padding-top: 14px; }
.tracking-progress-heading h3,
.tracking-card-title h3 { margin: 0; color: #302d36; font-size: 11px; font-weight: 600; }
.tracking-progress-heading span { color: var(--track-accent); font-size: 9px; }
.tracking-progress { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); margin: 17px 0 0; padding: 0; list-style: none; }
.tracking-progress li { position: relative; display: grid; justify-items: center; gap: 7px; color: #85828d; font-size: 8px; text-align: center; }
.tracking-progress li:not(:last-child)::after { position: absolute; top: 11px; left: calc(50% + 12px); width: calc(100% - 24px); height: 1px; background: #e5e4e7; content: ''; }
.tracking-progress li.complete::after { background: #bca4e2; }
.progress-node { z-index: 1; display: grid; width: 22px; height: 22px; place-items: center; border: 1px solid #e5e4e7; border-radius: 50%; background: var(--track-panel); color: #85828d; font-size: 8px; }
.tracking-progress li.complete .progress-node { border-color: #d8c9ef; background: #f4effc; color: var(--track-accent); }
.tracking-progress li.current { color: #504b58; }
.tracking-progress li.current .progress-node { border-color: var(--track-accent); background: #f4effc; color: var(--track-accent); box-shadow: 0 0 0 3px #7544c81a; }

.tracking-detail-aside { display: grid; align-content: start; gap: 9px; }
.tracking-eta-card,
.tracking-driver-card,
.tracking-timeline-card { padding: 13px; border: 1px solid var(--track-line); border-radius: 6px; background: #fff; }
.tracking-eta-card { display: grid; gap: 7px; border-color: #e4d8f5; background: #f8f5fc; }
.tracking-eta-card > span { color: #8050b7; font-size: 8px; font-weight: 700; letter-spacing: .08em; }
.tracking-eta-card > strong { color: var(--track-ink); font-size: 18px; font-weight: 650; }
.tracking-eta-card small { display: flex; align-items: center; gap: 6px; color: #77737e; font-size: 9px; }
.tracking-eta-card small i { width: 5px; height: 5px; }
.tracking-card-title { gap: 8px; }
.driver-online { display: inline-flex; align-items: center; gap: 5px; color: #85d7ac; font-size: 8px; }
.driver-online i { width: 5px; height: 5px; }
.driver-profile { display: flex; align-items: center; gap: 9px; margin-top: 12px; }
.driver-avatar { display: grid; width: 32px; height: 32px; flex: 0 0 32px; place-items: center; border-radius: 50%; background: #eee7f8; color: #6740a6; font-size: 10px; font-weight: 650; }
.driver-profile strong,
.driver-profile small { display: block; }
.driver-profile strong { color: #37343d; font-size: 10px; font-weight: 600; }
.driver-profile small { margin-top: 4px; color: var(--track-muted); font-size: 9px; }
.driver-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--track-line); }
.driver-facts span { color: var(--track-muted); font-size: 8px; }
.driver-facts strong { display: block; margin-top: 4px; color: #37343d; font-size: 9px; font-weight: 550; }
.tracking-timeline-card .tracking-card-title { align-items: flex-start; }
.tracking-timeline-card .tracking-card-title span { color: var(--track-muted); font-size: 8px; text-align: right; }
.tracking-timeline-card ol { display: grid; gap: 0; margin: 11px 0 0; padding: 0; list-style: none; }
.tracking-timeline-card li { position: relative; display: grid; grid-template-columns: 8px minmax(0, 1fr); gap: 8px; min-height: 34px; }
.tracking-timeline-card li:not(:last-child)::after { position: absolute; top: 8px; bottom: 0; left: 3px; width: 1px; background: #e5e4e7; content: ''; }
.tracking-timeline-card li > i { z-index: 1; width: 6px; height: 6px; margin-top: 3px; border-radius: 50%; background: #aaa5b1; }
.tracking-timeline-card li.timeline-latest > i { background: var(--track-accent); box-shadow: 0 0 0 3px #7544c81c; }
.tracking-timeline-card li strong,
.tracking-timeline-card li small { display: block; }
.tracking-timeline-card li strong { color: #37343d; font-size: 9px; font-weight: 550; }
.tracking-timeline-card li small { margin-top: 3px; color: var(--track-muted); font-size: 8px; }

@media (max-width: 980px) {
	.tracking-detail-grid { grid-template-columns: minmax(0, 1fr); }
	.tracking-detail-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.tracking-timeline-card { grid-column: 1 / -1; }
}

@media (max-width: 800px) {
	.tracking-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 30px; }
	.tracking-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.tracking-stat { min-height: 92px; }
}

@media (max-width: 560px) {
	.tracking-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 24px; }
	.tracking-page-header { align-items: flex-start; }
	.tracking-page-header h1 { font-size: 21px; }
	.tracking-live-indicator { flex-wrap: wrap; justify-content: center; gap: 6px; max-width: 95px; padding: 7px; font-size: 9px; }
	.tracking-live-indicator span { margin-left: 0; }
	.tracking-list-panel, .tracking-detail-panel { padding: 13px 11px; }
	.tracking-list-heading { align-items: flex-start; flex-direction: column; gap: 10px; }
	.tracking-search { width: auto; max-width: none; flex: 1 1 auto; }
	.tracking-list-heading { display: flex; }
	.tracking-list-heading .tracking-search { width: calc(100% - 22px); }
	.tracking-detail-aside { grid-template-columns: minmax(0, 1fr); }
	.tracking-timeline-card { grid-column: auto; }
	.tracking-progress { gap: 2px; }
	.tracking-progress li { font-size: 7px; }
	.tracking-progress li:not(:last-child)::after { left: calc(50% + 10px); width: calc(100% - 20px); }
	.progress-node { width: 20px; height: 20px; }
	.tracking-map { height: 175px; }
}

.orders-workspace {
	--order-ink: #302d36;
	--order-muted: #85828d;
	--order-accent: #7544c8;
	--order-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 30px clamp(18px, 3vw, 42px) 42px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--order-ink);
	font-family: 'Segoe UI', sans-serif;
}

.orders-page-heading,
.orders-section-heading,
.orders-detail-top,
.orders-modal-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 14px;
}

.orders-page-heading,
.orders-summary-grid,
.orders-content-grid { max-width: 1500px; margin-right: auto; margin-left: auto; }
.orders-page-heading { margin-bottom: 22px; }
.orders-kicker { display: block; color: #8050cc; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.orders-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 26px; font-weight: 650; letter-spacing: 0; }
.orders-page-heading p { color: #85828d; font-size: 12px; }

.orders-primary-button,
.orders-secondary-button {
	display: inline-flex;
	min-height: 38px;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 0 14px;
	border: 1px solid transparent;
	border-radius: 6px;
	font: inherit;
	font-size: 11px;
	font-weight: 600;
	cursor: pointer;
	transition: background-color 140ms ease, transform 140ms ease;
}

.orders-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.orders-primary-button:hover { background: #6034ae; transform: translateY(-1px); }
.orders-primary-button > span { font-size: 17px; font-weight: 400; line-height: 1; }
.orders-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.orders-secondary-button:hover { background: #f7f4fb; }

.orders-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 11px; margin-bottom: 14px; }
.orders-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 74%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.orders-stat { position: relative; min-height: 111px; overflow: hidden; padding: 15px 16px; }
.orders-stat::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; background: #7544c8; opacity: .7; content: ''; }
.orders-stat-pending::before { background: #db9a37; }
.orders-stat-active::before { background: #9b68dc; }
.orders-stat-completed::before { background: #45b982; }
.orders-stat-cancelled::before { background: #dc7285; }
.orders-stat-label, .orders-stat small { display: block; position: relative; z-index: 1; }
.orders-stat-label { color: #77737e; font-size: 10px; font-weight: 550; }
.orders-stat strong { position: relative; z-index: 1; display: block; margin-top: 11px; color: #302d36; font-size: 25px; font-weight: 680; line-height: 1; }
.orders-stat small { margin-top: 7px; color: #9996a0; font-size: 9px; }
.orders-stat-orbit { position: absolute; top: 11px; right: 14px; width: 35px; height: 35px; border: 1px solid rgb(117 68 200 / 14%); border-radius: 50%; }
.orders-stat-orbit::after { position: absolute; top: 8px; left: 8px; width: 17px; height: 17px; border: 1px solid rgb(117 68 200 / 20%); border-radius: 50%; content: ''; }
.orders-stat-pending .orders-stat-orbit, .orders-stat-pending .orders-stat-orbit::after { border-color: rgb(219 154 55 / 25%); }
.orders-stat-active .orders-stat-orbit, .orders-stat-active .orders-stat-orbit::after { border-color: rgb(155 104 220 / 24%); }
.orders-stat-completed .orders-stat-orbit, .orders-stat-completed .orders-stat-orbit::after { border-color: rgb(69 185 130 / 25%); }
.orders-stat-cancelled .orders-stat-orbit, .orders-stat-cancelled .orders-stat-orbit::after { border-color: rgb(220 114 133 / 24%); }

.orders-content-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(310px, .8fr); align-items: start; gap: 13px; }
.orders-list-panel, .orders-detail-panel { min-width: 0; padding: 17px; }
.orders-section-heading { margin-bottom: 14px; }
.orders-section-heading h2, .orders-detail-top h2 { margin: 0; color: #302d36; font-size: 14px; font-weight: 650; }
.orders-section-heading p, .orders-detail-top p { margin-top: 4px; color: #85828d; font-size: 10px; }
.orders-register-mark { padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; color: #898391; font-size: 8px; letter-spacing: .08em; white-space: nowrap; }
.orders-register-mark b { color: #7544c8; font-weight: 700; }

.orders-filters { display: grid; grid-template-columns: minmax(150px, 1fr) auto auto auto; align-items: end; gap: 8px; margin-bottom: 12px; }
.orders-search { display: flex; height: 34px; min-width: 0; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.orders-search:focus-within { border-color: #cbb7e8; background: #fff; }
.orders-search svg { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.orders-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 10px; }
.orders-search input::placeholder { color: #a29fa8; }
.orders-filter-field { display: grid; gap: 4px; color: #85828d; font-size: 8px; }
.orders-filter-field select, .orders-filter-field input { box-sizing: border-box; height: 34px; max-width: 142px; padding: 0 8px; border: 1px solid #ebe8ef; border-radius: 5px; outline-color: #cbb7e8; background: rgb(255 255 255 / 75%); color: #5e5966; font: inherit; font-size: 9px; }
.orders-reset-button { min-height: 34px; padding: 0 5px; border: 0; background: transparent; color: #7544c8; font: inherit; font-size: 9px; cursor: pointer; }
.orders-reset-button:hover { text-decoration: underline; }

.orders-table-scroll { overflow-x: auto; }
.orders-table { width: 100%; min-width: 680px; border-collapse: collapse; text-align: left; }
.orders-table th { height: 32px; border-top: 1px solid var(--order-line); border-bottom: 1px solid var(--order-line); color: #898491; font-size: 8px; font-weight: 600; }
.orders-table td { height: 54px; border-bottom: 1px solid rgb(111 92 143 / 9%); color: #65616d; font-size: 9px; white-space: nowrap; }
.orders-table tbody tr { transition: background-color 120ms ease; }
.orders-table tbody tr:hover, .orders-table tbody tr.is-selected { background: rgb(244 239 252 / 68%); }
.orders-table tbody tr:last-child td { border-bottom: 0; }
.orders-table td > strong, .orders-table td > span:not(.order-status), .order-select-button strong, .order-select-button span { display: block; }
.orders-table td > strong { color: #37343d; font-size: 9px; font-weight: 600; }
.orders-table td > span:not(.order-status), .order-select-button span { margin-top: 4px; color: #96929d; font-size: 8px; }
.order-select-button { max-width: 155px; padding: 0; overflow: hidden; border: 0; background: transparent; text-align: left; text-overflow: ellipsis; cursor: pointer; }
.order-select-button strong { overflow: hidden; color: #7544c8; font-size: 9px; font-weight: 650; text-overflow: ellipsis; }
.order-select-button:hover strong { text-decoration: underline; }
.orders-route-from, .orders-route-to { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
.orders-route-from::before { content: '○ '; color: #7544c8; }
.orders-route-to::before { content: '↳ '; color: #44ae82; }
.order-status { display: inline-flex; align-items: center; gap: 5px; padding: 5px 7px; border-radius: 4px; font-size: 8px; line-height: 1; white-space: nowrap; }
.order-status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.order-status-pending { background: #fff4e7; color: #c98622; }
.order-status-active { background: #f4effc; color: #7544c8; }
.order-status-completed { background: #eaf9ef; color: #38a969; }
.order-status-cancelled { background: #fff0f2; color: #d15d72; }
.orders-empty-row { height: 100px !important; color: #85828d !important; text-align: center; }

.orders-detail-panel { padding: 18px; }
.orders-detail-top { align-items: flex-start; }
.orders-detail-top .orders-kicker { margin-bottom: 5px; font-size: 8px; }
.orders-detail-top h2 { font-size: 13px; }
.orders-icon-button { display: grid; width: 32px; height: 32px; flex: 0 0 32px; place-items: center; border: 1px solid #ece6f4; border-radius: 6px; background: rgb(255 255 255 / 70%); color: #7544c8; cursor: pointer; }
.orders-icon-button:hover { background: #f4effc; }
.orders-icon-button svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.orders-detail-status { display: flex; min-height: 46px; align-items: center; justify-content: space-between; gap: 10px; margin-top: 13px; padding: 0 10px; border: 1px solid rgb(111 92 143 / 10%); border-radius: 5px; background: rgb(255 255 255 / 55%); }
.orders-detail-status label { display: flex; align-items: center; gap: 6px; color: #898491; font-size: 8px; }
.orders-detail-status select { max-width: 120px; padding: 5px 6px; border: 1px solid #e9e4ef; border-radius: 4px; background: #fff; color: #5e5966; font: inherit; font-size: 8px; }
.orders-detail-section { margin-top: 15px; padding-top: 13px; border-top: 1px solid var(--order-line); }
.orders-detail-section h3 { margin: 0 0 10px; color: #514c59; font-size: 10px; font-weight: 650; }
.orders-route-card { display: grid; grid-template-columns: 1fr; gap: 0; }
.orders-route-stop { display: grid; grid-template-columns: 12px minmax(0, 1fr); align-items: start; gap: 8px; }
.orders-route-stop i { width: 8px; height: 8px; margin-top: 3px; border: 2px solid #7544c8; border-radius: 50%; }
.orders-route-stop i.delivery-marker { border-color: #45b982; }
.orders-route-stop div { min-width: 0; }
.orders-route-stop small { display: block; color: #96929d; font-size: 7px; font-weight: 700; letter-spacing: .07em; }
.orders-route-stop strong { display: block; margin-top: 3px; color: #403b47; font-size: 9px; font-weight: 550; line-height: 1.45; }
.orders-route-stop span { display: block; margin-top: 2px; color: #898491; font-size: 8px; }
.orders-route-line { width: 1px; height: 13px; margin: 2px 0 2px 5px; border-left: 1px dashed #b7a4d2; }
.orders-detail-facts, .orders-shipment-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px 14px; }
.orders-detail-facts > span, .orders-shipment-facts > span { min-width: 0; color: #96929d; font-size: 8px; }
.orders-detail-facts strong, .orders-shipment-facts strong { display: block; margin-top: 4px; overflow-wrap: anywhere; color: #45404c; font-size: 9px; font-weight: 550; line-height: 1.4; }
.orders-history { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.orders-history li { position: relative; display: grid; grid-template-columns: 9px minmax(0, 1fr) auto; align-items: start; gap: 8px; min-height: 39px; }
.orders-history li:not(:last-child)::after { position: absolute; top: 8px; bottom: 0; left: 3px; width: 1px; background: #e5dfed; content: ''; }
.orders-history li > i { z-index: 1; width: 7px; height: 7px; margin-top: 2px; border-radius: 50%; background: #b6b0bf; }
.orders-history li.is-current > i { background: #7544c8; box-shadow: 0 0 0 3px #7544c81a; }
.orders-history li strong, .orders-history li span { display: block; }
.orders-history li strong { color: #514c59; font-size: 8px; font-weight: 600; }
.orders-history li span, .orders-history li time { margin-top: 3px; color: #96929d; font-size: 7px; line-height: 1.4; }
.orders-history li time { white-space: nowrap; }
.orders-detail-empty { display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 7px; color: #514c59; }
.orders-detail-empty span { color: #898491; font-size: 10px; }

.orders-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.orders-modal { width: min(700px, 100%); max-height: min(90vh, 820px); overflow-y: auto; padding: 22px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.orders-modal-heading { margin-bottom: 17px; }
.orders-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 19px; font-weight: 650; }
.orders-modal-heading .orders-icon-button { font-size: 20px; }
.orders-form-section { padding: 14px 0; border-top: 1px solid #eeedf0; }
.orders-form-section h3 { margin: 0 0 11px; color: #514c59; font-size: 11px; font-weight: 650; }
.orders-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px 13px; }
.orders-field { display: grid; min-width: 0; gap: 5px; color: #6e6976; font-size: 9px; font-weight: 550; }
.orders-field input, .orders-field textarea { box-sizing: border-box; width: 100%; min-width: 0; min-height: 35px; padding: 8px 9px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #bda3e1; background: rgb(255 255 255 / 75%); color: #37343d; font: inherit; font-size: 10px; }
.orders-field input:focus, .orders-field textarea:focus { border-color: #cbb7e8; background: #fff; }
.orders-field textarea { resize: vertical; }
.orders-field-wide { grid-column: 1 / -1; }
.orders-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 15px; border-top: 1px solid #eeedf0; }
.orders-primary-button:focus-visible, .orders-secondary-button:focus-visible, .orders-icon-button:focus-visible, .orders-reset-button:focus-visible, .order-select-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 1100px) {
	.orders-content-grid { grid-template-columns: minmax(0, 1fr); }
	.orders-detail-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 20px; }
	.orders-detail-top, .orders-detail-status, .orders-history-section { grid-column: 1 / -1; }
	.orders-detail-section { align-self: start; }
}

@media (max-width: 800px) {
	.orders-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 32px; }
	.orders-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.orders-stat { min-height: 100px; padding: 12px; }
	.orders-stat-orbit { right: 10px; }
}

@media (max-width: 560px) {
	.orders-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 26px; }
	.orders-page-heading { align-items: flex-start; }
	.orders-page-heading h1 { font-size: 22px; }
	.orders-page-heading p { max-width: 210px; line-height: 1.45; }
	.orders-page-heading .orders-primary-button { min-height: 35px; gap: 5px; padding: 0 9px; font-size: 9px; white-space: nowrap; }
	.orders-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.orders-stat { min-height: 93px; }
	.orders-list-panel, .orders-detail-panel { padding: 13px 11px; }
	.orders-section-heading { align-items: flex-start; }
	.orders-register-mark { font-size: 7px; }
	.orders-filters { grid-template-columns: 1fr 1fr; }
	.orders-search { grid-column: 1 / -1; }
	.orders-filter-field select, .orders-filter-field input { max-width: none; width: 100%; }
	.orders-detail-panel { display: block; }
	.orders-detail-section { margin-top: 13px; }
	.orders-modal { padding: 17px 14px; }
	.orders-form-grid { grid-template-columns: minmax(0, 1fr); }
	.orders-field-wide { grid-column: auto; }
}

.shipments-workspace {
	--shipment-ink: #302d36;
	--shipment-muted: #85828d;
	--shipment-accent: #7544c8;
	--shipment-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 30px clamp(18px, 3vw, 42px) 42px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--shipment-ink);
	font-family: 'Segoe UI', sans-serif;
}

.shipments-page-heading, .shipments-section-heading, .shipments-detail-heading, .shipments-modal-heading, .shipments-history-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.shipments-page-heading, .shipments-summary-grid, .shipments-content-grid { max-width: 1500px; margin-right: auto; margin-left: auto; }
.shipments-page-heading { margin-bottom: 22px; }
.shipments-kicker { display: block; color: #8050cc; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.shipments-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 26px; font-weight: 650; letter-spacing: 0; }
.shipments-page-heading p { color: #85828d; font-size: 12px; }
.shipments-primary-button, .shipments-secondary-button { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; gap: 8px; padding: 0 14px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; transition: background-color 140ms ease, transform 140ms ease; }
.shipments-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.shipments-primary-button:hover { background: #6034ae; transform: translateY(-1px); }
.shipments-primary-button > span { font-size: 17px; font-weight: 400; line-height: 1; }
.shipments-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.shipments-secondary-button:hover { background: #f7f4fb; }
.shipments-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 74%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.shipments-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 11px; margin-bottom: 14px; }
.shipments-stat { position: relative; min-height: 108px; overflow: hidden; padding: 14px 15px; }
.shipments-stat::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; background: #7544c8; opacity: .7; content: ''; }
.shipments-stat-ready::before { background: #db9a37; }
.shipments-stat-transit::before { background: #55b6a0; }
.shipments-stat-delivery::before { background: #9b68dc; }
.shipments-stat-attention::before { background: #dc7285; }
.shipments-stat > span, .shipments-stat > strong, .shipments-stat > small { position: relative; z-index: 1; display: block; }
.shipments-stat > span { color: #77737e; font-size: 10px; font-weight: 550; }
.shipments-stat > strong { margin-top: 10px; color: #302d36; font-size: 24px; font-weight: 680; line-height: 1; }
.shipments-stat > small { margin-top: 7px; color: #9996a0; font-size: 8px; }
.shipments-stat > i { position: absolute; top: 13px; right: 14px; width: 29px; height: 29px; border: 1px solid rgb(117 68 200 / 16%); border-radius: 50%; }
.shipments-stat > i::after { position: absolute; inset: 6px; border: 1px solid rgb(117 68 200 / 20%); border-radius: 50%; content: ''; }
.shipments-content-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(310px, .8fr); align-items: start; gap: 13px; }
.shipments-list-panel, .shipments-detail-panel { min-width: 0; padding: 17px; }
.shipments-section-heading { margin-bottom: 13px; }
.shipments-section-heading h2, .shipments-detail-heading h2 { margin: 0; color: #302d36; font-size: 14px; font-weight: 650; }
.shipments-section-heading p, .shipments-detail-heading p { margin-top: 4px; color: #85828d; font-size: 9px; }
.shipments-register-stamp { padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; color: #898391; font-size: 8px; letter-spacing: .08em; white-space: nowrap; }
.shipments-register-stamp b { color: #7544c8; }
.shipments-filters { display: grid; grid-template-columns: minmax(150px, 1fr) auto auto auto; align-items: end; gap: 8px; margin-bottom: 10px; }
.shipments-search { display: flex; height: 34px; min-width: 0; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.shipments-search:focus-within { border-color: #cbb7e8; background: #fff; }
.shipments-search svg { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.shipments-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 9px; }
.shipments-search input::placeholder { color: #a29fa8; }
.shipments-filter-field { display: grid; gap: 4px; color: #85828d; font-size: 8px; }
.shipments-filter-field select, .shipments-filter-field input, .shipments-field select { box-sizing: border-box; height: 34px; max-width: 145px; padding: 0 8px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: rgb(255 255 255 / 78%); color: #5e5966; font: inherit; font-size: 9px; }
.shipments-reset-button { min-height: 34px; padding: 0 5px; border: 0; background: transparent; color: #7544c8; font: inherit; font-size: 9px; cursor: pointer; }
.shipments-reset-button:hover { text-decoration: underline; }
.shipments-status-tabs { display: flex; gap: 4px; overflow-x: auto; margin: 0 -2px 10px; padding: 2px 2px 5px; scrollbar-width: thin; }
.shipments-status-tabs button { display: inline-flex; min-height: 28px; align-items: center; gap: 6px; flex: 0 0 auto; padding: 0 8px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: #77737e; font: inherit; font-size: 8px; cursor: pointer; }
.shipments-status-tabs button span { color: #a29fa8; font-size: 8px; }
.shipments-status-tabs button:hover { background: #f8f6fb; color: #514c59; }
.shipments-status-tabs button.selected { border-color: #e4d8f5; background: #f4effc; color: #7544c8; }
.shipments-status-tabs button.selected span { color: #8050cc; }
.shipments-table-scroll { overflow-x: auto; }
.shipments-table { width: 100%; min-width: 970px; border-collapse: collapse; text-align: left; }
.shipments-table th { height: 32px; border-top: 1px solid var(--shipment-line); border-bottom: 1px solid var(--shipment-line); color: #898491; font-size: 8px; font-weight: 600; }
.shipments-table td { height: 53px; border-bottom: 1px solid rgb(111 92 143 / 9%); color: #65616d; font-size: 8px; white-space: nowrap; }
.shipments-table tbody tr { transition: background-color 120ms ease; }
.shipments-table tbody tr:hover, .shipments-table tbody tr.is-selected { background: rgb(244 239 252 / 68%); }
.shipments-table tbody tr:last-child td { border-bottom: 0; }
.shipments-table td > strong, .shipments-table td > span:not(.shipment-status-pill), .shipment-select-button strong, .shipment-select-button span { display: block; }
.shipments-table td > strong { color: #37343d; font-size: 8px; font-weight: 600; }
.shipments-table td > span:not(.shipment-status-pill), .shipment-select-button span { margin-top: 4px; color: #96929d; font-size: 7px; }
.shipment-select-button { max-width: 135px; padding: 0; overflow: hidden; border: 0; background: transparent; text-align: left; cursor: pointer; }
.shipment-select-button strong { overflow: hidden; color: #7544c8; font-size: 8px; font-weight: 650; text-overflow: ellipsis; }
.shipment-select-button:hover strong { text-decoration: underline; }
.shipments-route-start, .shipments-route-end { max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.shipments-route-start::before { content: '○ '; color: #7544c8; }
.shipments-route-end::before { content: '↳ '; color: #45b982; }
.shipment-status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px; border-radius: 4px; font-size: 7px; line-height: 1; white-space: nowrap; }
.shipment-status-pill i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.shipment-status-ready-for-pickup { background: #fff4e7; color: #c98622; }
.shipment-status-picked-up, .shipment-status-in-transit { background: #f4effc; color: #7544c8; }
.shipment-status-out-for-delivery { background: #eef6ff; color: #4d86bf; }
.shipment-status-delivered { background: #eaf9ef; color: #38a969; }
.shipment-status-delayed { background: #fff4e7; color: #c98622; }
.shipment-status-failed-delivery { background: #fff0f2; color: #d15d72; }
.shipments-empty-row { height: 90px !important; color: #85828d !important; text-align: center; }

.shipments-detail-panel { padding: 18px; }
.shipments-detail-heading { align-items: flex-start; flex-wrap: wrap; }
.shipments-detail-heading .shipments-kicker { margin-bottom: 5px; font-size: 8px; }
.shipments-manifest-route { display: grid; grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr); align-items: center; gap: 8px; margin-top: 16px; padding: 12px 10px; border: 1px solid rgb(111 92 143 / 11%); border-radius: 5px; background: rgb(255 255 255 / 56%); }
.shipments-manifest-route > div { position: relative; display: grid; grid-template-columns: 10px minmax(0, 1fr); align-items: start; column-gap: 6px; }
.shipments-manifest-route > div i { grid-row: span 2; width: 7px; height: 7px; margin-top: 2px; border: 2px solid #7544c8; border-radius: 50%; }
.shipments-manifest-route > div i.manifest-destination { border-color: #45b982; }
.shipments-manifest-route small { color: #96929d; font-size: 6px; font-weight: 700; letter-spacing: .06em; }
.shipments-manifest-route strong { overflow-wrap: anywhere; margin-top: 4px; color: #45404c; font-size: 8px; font-weight: 550; line-height: 1.4; }
.shipments-manifest-route > span { height: 1px; background: repeating-linear-gradient(90deg, #c9c5cf 0 3px, transparent 3px 6px); }
.shipments-detail-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px 14px; margin-top: 14px; }
.shipments-detail-facts > span { min-width: 0; color: #96929d; font-size: 8px; }
.shipments-detail-facts strong { display: block; margin-top: 4px; overflow-wrap: anywhere; color: #45404c; font-size: 9px; font-weight: 550; line-height: 1.4; }
.shipments-assignment-section, .shipments-status-section, .shipments-history-section { margin-top: 15px; padding-top: 13px; border-top: 1px solid var(--shipment-line); }
.shipments-assignment-section h3, .shipments-history-heading h3 { margin: 0 0 10px; color: #514c59; font-size: 10px; font-weight: 650; }
.shipments-assignment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.shipments-field { display: grid; min-width: 0; gap: 5px; color: #6e6976; font-size: 8px; font-weight: 550; }
.shipments-field select { width: 100%; max-width: none; }
.shipments-status-section p { margin-top: 6px; color: #96929d; font-size: 8px; line-height: 1.45; }
.shipments-history-heading { align-items: baseline; }
.shipments-history-heading h3 { margin: 0; }
.shipments-history-heading span { color: #96929d; font-size: 8px; }
.shipments-history { display: grid; gap: 0; margin: 11px 0 0; padding: 0; list-style: none; }
.shipments-history li { position: relative; display: grid; grid-template-columns: 9px minmax(0, 1fr) auto; align-items: start; gap: 8px; min-height: 39px; }
.shipments-history li:not(:last-child)::after { position: absolute; top: 8px; bottom: 0; left: 3px; width: 1px; background: #e5dfed; content: ''; }
.shipments-history li > i { z-index: 1; width: 7px; height: 7px; margin-top: 2px; border-radius: 50%; background: #b6b0bf; }
.shipments-history li.is-current > i { background: #7544c8; box-shadow: 0 0 0 3px #7544c81a; }
.shipments-history li strong, .shipments-history li span { display: block; }
.shipments-history li strong { color: #514c59; font-size: 8px; font-weight: 600; }
.shipments-history li span, .shipments-history li time { margin-top: 3px; color: #96929d; font-size: 7px; line-height: 1.4; }
.shipments-history li time { white-space: nowrap; }
.shipments-empty-detail { display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 7px; color: #514c59; }
.shipments-empty-detail span { color: #898491; font-size: 10px; }

.shipments-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.shipments-modal { width: min(570px, 100%); max-height: min(90vh, 720px); overflow-y: auto; padding: 22px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.shipments-modal-heading { margin-bottom: 16px; }
.shipments-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 19px; font-weight: 650; }
.shipments-icon-button { display: grid; width: 32px; height: 32px; flex: 0 0 32px; place-items: center; border: 1px solid #ece6f4; border-radius: 6px; background: rgb(255 255 255 / 70%); color: #7544c8; font: inherit; font-size: 20px; cursor: pointer; }
.shipments-icon-button:hover { background: #f4effc; }
.shipment-order-preview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 13px 0; padding: 13px; border: 1px solid #eee8f5; border-radius: 6px; background: #faf8fd; }
.shipment-order-preview span { min-width: 0; }
.shipment-order-preview small, .shipment-order-preview strong { display: block; }
.shipment-order-preview small { color: #96929d; font-size: 7px; font-weight: 700; letter-spacing: .07em; }
.shipment-order-preview strong { margin-top: 4px; color: #45404c; font-size: 9px; font-weight: 550; line-height: 1.4; overflow-wrap: anywhere; }
.shipments-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
.shipments-eta-note { margin-top: 13px; padding: 10px; border-left: 2px solid #9b68dc; background: #f7f3fc; color: #77737e; font-size: 9px; line-height: 1.5; }
.shipments-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #eeedf0; }
.shipments-no-orders { display: grid; justify-items: start; gap: 9px; padding: 16px 0 4px; }
.shipments-no-orders strong { color: #45404c; font-size: 12px; }
.shipments-no-orders span { color: #85828d; font-size: 10px; line-height: 1.5; }
.shipments-primary-button:focus-visible, .shipments-secondary-button:focus-visible, .shipments-icon-button:focus-visible, .shipments-reset-button:focus-visible, .shipment-select-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 1100px) {
	.shipments-content-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 800px) {
	.shipments-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 32px; }
	.shipments-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.shipments-stat { min-height: 96px; padding: 12px; }
}

@media (max-width: 560px) {
	.shipments-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 26px; }
	.shipments-page-heading { align-items: flex-start; }
	.shipments-page-heading h1 { font-size: 22px; }
	.shipments-page-heading p { max-width: 200px; line-height: 1.45; }
	.shipments-page-heading .shipments-primary-button { min-height: 35px; gap: 5px; padding: 0 9px; font-size: 9px; white-space: nowrap; }
	.shipments-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.shipments-stat { min-height: 90px; }
	.shipments-list-panel, .shipments-detail-panel { padding: 13px 11px; }
	.shipments-section-heading { align-items: flex-start; }
	.shipments-register-stamp { font-size: 7px; }
	.shipments-filters { grid-template-columns: 1fr 1fr; }
	.shipments-search { grid-column: 1 / -1; }
	.shipments-filter-field select, .shipments-filter-field input { width: 100%; max-width: none; }
	.shipments-assignment-grid { grid-template-columns: minmax(0, 1fr); }
	.shipments-modal { padding: 17px 14px; }
	.shipments-form-grid { grid-template-columns: minmax(0, 1fr); }
}

.warehouse-workspace {
	--warehouse-ink: #302d36;
	--warehouse-muted: #85828d;
	--warehouse-accent: #7544c8;
	--warehouse-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 30px clamp(18px, 3vw, 42px) 42px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--warehouse-ink);
	font-family: 'Segoe UI', sans-serif;
}

.warehouse-page-heading, .warehouse-section-heading, .warehouse-modal-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.warehouse-page-heading, .warehouse-summary-grid, .warehouse-main-grid, .warehouse-activity-panel { max-width: 1500px; margin-right: auto; margin-left: auto; }
.warehouse-page-heading { margin-bottom: 22px; }
.warehouse-kicker { display: block; color: #8050cc; font-size: 10px; font-weight: 750; letter-spacing: .12em; }
.warehouse-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 26px; font-weight: 650; letter-spacing: 0; }
.warehouse-page-heading p { color: #85828d; font-size: 13px; }
.warehouse-primary-button, .warehouse-secondary-button { display: inline-flex; min-height: 37px; align-items: center; justify-content: center; gap: 7px; padding: 0 13px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
.warehouse-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.warehouse-primary-button:hover { background: #6034ae; }
.warehouse-primary-button > span { font-size: 16px; font-weight: 400; line-height: 1; }
.warehouse-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.warehouse-secondary-button:hover { background: #f7f4fb; }
.warehouse-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 74%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.warehouse-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 11px; margin-bottom: 14px; }
.warehouse-stat { position: relative; min-height: 106px; overflow: hidden; padding: 14px 15px; }
.warehouse-stat::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; background: #7544c8; opacity: .7; content: ''; }
.warehouse-stat-incoming::before { background: #db9a37; }
.warehouse-stat-outgoing::before { background: #55b6a0; }
.warehouse-stat-storage::before { background: #9b68dc; }
.warehouse-stat-low::before { background: #dc7285; }
.warehouse-stat > span, .warehouse-stat > strong, .warehouse-stat > small { position: relative; z-index: 1; display: block; }
.warehouse-stat > span { color: #77737e; font-size: 11px; font-weight: 550; }
.warehouse-stat > strong { margin-top: 10px; color: #302d36; font-size: 23px; font-weight: 680; line-height: 1; }
.warehouse-stat > small { margin-top: 7px; color: #9996a0; font-size: 9px; }
.warehouse-stat > i { position: absolute; top: 13px; right: 14px; width: 29px; height: 29px; border: 1px solid rgb(117 68 200 / 16%); border-radius: 50%; }
.warehouse-stat > i::after { position: absolute; inset: 6px; border: 1px solid rgb(117 68 200 / 20%); border-radius: 50%; content: ''; }
.warehouse-main-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .8fr); align-items: start; gap: 13px; }
.warehouse-inventory-panel, .warehouse-inbound-panel, .warehouse-pick-panel, .warehouse-activity-panel { min-width: 0; padding: 16px; }
.warehouse-section-heading { margin-bottom: 12px; }
.warehouse-section-heading h2 { margin: 0; color: #302d36; font-size: 14px; font-weight: 650; }
.warehouse-section-heading p { margin-top: 4px; color: #85828d; font-size: 10px; }
.warehouse-register-mark { padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; color: #898391; font-size: 9px; letter-spacing: .08em; white-space: nowrap; }
.warehouse-register-mark b { color: #7544c8; }
.warehouse-filters { display: grid; grid-template-columns: minmax(150px, 1fr) auto auto; align-items: end; gap: 8px; margin-bottom: 12px; }
.warehouse-search { display: flex; height: 34px; min-width: 0; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.warehouse-search:focus-within { border-color: #cbb7e8; background: #fff; }
.warehouse-search svg { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.warehouse-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 10px; }
.warehouse-search input::placeholder { color: #a29fa8; }
.warehouse-filter-field { display: grid; gap: 4px; color: #85828d; font-size: 9px; }
.warehouse-filter-field select { height: 34px; max-width: 145px; padding: 0 8px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: rgb(255 255 255 / 78%); color: #5e5966; font: inherit; font-size: 10px; }
.warehouse-low-toggle { display: inline-flex; min-height: 34px; align-items: center; gap: 6px; padding: 0 8px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #77737e; font: inherit; font-size: 9px; cursor: pointer; }
.warehouse-low-toggle span { color: #d15d72; font-weight: 700; }
.warehouse-low-toggle.selected { border-color: #f0d1d6; background: #fff0f2; color: #c65369; }
.warehouse-table-scroll { overflow-x: auto; }
.warehouse-table { width: 100%; min-width: 760px; border-collapse: collapse; text-align: left; }
.warehouse-table th { height: 32px; border-top: 1px solid var(--warehouse-line); border-bottom: 1px solid var(--warehouse-line); color: #898491; font-size: 9px; font-weight: 600; }
.warehouse-table td { height: 51px; border-bottom: 1px solid rgb(111 92 143 / 9%); color: #65616d; font-size: 9px; white-space: nowrap; }
.warehouse-table tbody tr:last-child td { border-bottom: 0; }
.warehouse-table td > strong, .warehouse-table td > span:not(.warehouse-stock-flag) { display: block; color: #37343d; font-size: 9px; font-weight: 600; }
.warehouse-table td > strong small { color: #96929d; font-size: 8px; font-weight: 450; }
.warehouse-table td > span:not(.warehouse-stock-flag) { margin-top: 4px; color: #96929d; font-size: 8px; font-weight: 400; }
.warehouse-location-tag { width: fit-content; padding: 4px 6px; border: 1px solid #ece6f4; border-radius: 3px; background: #faf8fd; color: #705b8e !important; font-size: 9px !important; }
.warehouse-stock-flag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px; border-radius: 4px; font-size: 8px; }
.warehouse-stock-flag i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.warehouse-stock-flag.is-low { background: #fff0f2; color: #d15d72; }
.warehouse-stock-flag.is-healthy { background: #eaf9ef; color: #38a969; }
.warehouse-adjust-control { display: flex; gap: 4px; }
.warehouse-adjust-control button { display: grid; width: 23px; height: 23px; place-items: center; padding: 0; border: 1px solid #e8e3ee; border-radius: 4px; background: #fff; color: #7544c8; font: inherit; font-size: 13px; cursor: pointer; }
.warehouse-adjust-control button:hover:not(:disabled) { background: #f4effc; }
.warehouse-adjust-control button:disabled { color: #c7c2ce; cursor: not-allowed; }
.warehouse-empty-row { height: 75px !important; color: #85828d !important; text-align: center; }
.warehouse-capacity { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--warehouse-line); }
.warehouse-capacity > div:first-child { display: flex; justify-content: space-between; gap: 10px; color: #85828d; font-size: 9px; }
.warehouse-capacity > div:first-child strong { color: #514c59; font-size: 9px; font-weight: 600; }
.warehouse-capacity-track { height: 6px; overflow: hidden; border-radius: 4px; background: #eeeaf3; }
.warehouse-capacity-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #b999e1, #7544c8); }
.warehouse-capacity > small { color: #7544c8; font-size: 9px; }
.warehouse-operations-column { display: grid; gap: 12px; }
.warehouse-text-button { padding: 4px; border: 0; background: transparent; color: #7544c8; font: inherit; font-size: 9px; font-weight: 600; cursor: pointer; }
.warehouse-text-button:hover { text-decoration: underline; }
.warehouse-inbound-list, .warehouse-pick-list { display: grid; }
.warehouse-inbound-row { display: grid; grid-template-columns: 27px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 10px 0; border-top: 1px solid rgb(111 92 143 / 9%); }
.warehouse-receipt-icon { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid #eee5f8; border-radius: 6px; background: #f7f2fc; color: #7544c8; font-size: 12px; }
.warehouse-inbound-row.is-received .warehouse-receipt-icon { border-color: #e1f2e7; background: #eff9f2; color: #38a969; }
.warehouse-receipt-copy { display: grid; min-width: 0; gap: 3px; }
.warehouse-receipt-copy strong { overflow: hidden; color: #45404c; font-size: 10px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-receipt-copy span, .warehouse-receipt-copy small { overflow: hidden; color: #85828d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-receipt-copy small { color: #a09ca6; }
.warehouse-receive-button { padding: 5px 6px; border: 1px solid #e7def2; border-radius: 4px; background: #fff; color: #7544c8; font: inherit; font-size: 8px; cursor: pointer; }
.warehouse-receive-button:hover { background: #f4effc; }
.warehouse-received-label { color: #38a969; font-size: 7px; }
.warehouse-task-count { padding: 4px 7px; border-radius: 999px; background: #f4effc; color: #7544c8; font-size: 8px; }
.warehouse-pick-task { padding: 10px 0; border-top: 1px solid rgb(111 92 143 / 9%); }
.warehouse-task-header, .warehouse-task-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.warehouse-task-header > strong { color: #7544c8; font-size: 9px; font-weight: 650; }
.warehouse-task-state { padding: 4px 6px; border-radius: 4px; background: #fff4e7; color: #c98622; font-size: 8px; white-space: nowrap; }
.state-picking { background: #f4effc; color: #7544c8; }
.state-packing { background: #eef6ff; color: #4d86bf; }
.state-ready-for-dispatch { background: #eaf9ef; color: #38a969; }
.warehouse-pick-task p { margin: 6px 0; color: #77737e; font-size: 9px; line-height: 1.45; }
.warehouse-task-footer > span { overflow: hidden; color: #96929d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-task-footer button { flex: 0 0 auto; padding: 4px 6px; border: 0; border-radius: 4px; background: #f4effc; color: #7544c8; font: inherit; font-size: 8px; cursor: pointer; }
.warehouse-task-footer button:hover:not(:disabled) { background: #e9def7; }
.warehouse-task-footer button:disabled { background: #eff8f1; color: #38a969; cursor: default; }
.warehouse-empty-note { padding: 12px 0; color: #85828d; font-size: 10px; line-height: 1.45; }
.warehouse-activity-panel { margin-top: 13px; }
.warehouse-live-mark { display: inline-flex; align-items: center; gap: 6px; color: #898491; font-size: 8px; letter-spacing: .08em; }
.warehouse-live-mark i { width: 6px; height: 6px; border-radius: 50%; background: #45b982; }
.warehouse-activity-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.warehouse-activity-row { display: grid; grid-template-columns: 27px minmax(0, 1fr) auto; align-items: center; gap: 8px; min-width: 0; padding: 11px 9px; border: 1px solid rgb(111 92 143 / 9%); border-radius: 5px; background: rgb(255 255 255 / 48%); }
.warehouse-activity-mark { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 6px; background: #f4effc; color: #7544c8; font-size: 12px; }
.activity-inbound { background: #eff9f2; color: #38a969; }
.activity-count { background: #fff4e7; color: #c98622; }
.warehouse-activity-row > div { display: grid; min-width: 0; gap: 4px; }
.warehouse-activity-row strong { overflow: hidden; color: #514c59; font-size: 9px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-activity-row span:not(.warehouse-activity-mark) { overflow: hidden; color: #96929d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.warehouse-activity-row time { color: #96929d; font-size: 8px; white-space: nowrap; }

.warehouse-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.warehouse-modal { width: min(520px, 100%); max-height: min(90vh, 620px); overflow-y: auto; padding: 22px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.warehouse-modal-heading { margin-bottom: 17px; }
.warehouse-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 18px; font-weight: 650; }
.warehouse-icon-button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #ece6f4; border-radius: 6px; background: #fff; color: #7544c8; font: inherit; font-size: 20px; cursor: pointer; }
.warehouse-icon-button:hover { background: #f4effc; }
.warehouse-field { display: grid; min-width: 0; gap: 5px; color: #6e6976; font-size: 9px; font-weight: 550; }
.warehouse-field select, .warehouse-field input { box-sizing: border-box; width: 100%; min-width: 0; height: 36px; padding: 0 9px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: #fff; color: #5e5966; font: inherit; font-size: 10px; }
.warehouse-receive-context { display: flex; justify-content: space-between; gap: 8px; margin: 9px 0 14px; color: #85828d; font-size: 8px; }
.warehouse-receive-context strong { color: #514c59; }
.warehouse-receive-context span { color: #7544c8; }
.warehouse-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 13px; }
.warehouse-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 17px; padding-top: 14px; border-top: 1px solid #eeedf0; }
.warehouse-primary-button:focus-visible, .warehouse-secondary-button:focus-visible, .warehouse-icon-button:focus-visible, .warehouse-adjust-control button:focus-visible, .warehouse-task-footer button:focus-visible, .warehouse-receive-button:focus-visible, .warehouse-low-toggle:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 1100px) {
	.warehouse-main-grid { grid-template-columns: minmax(0, 1fr); }
	.warehouse-operations-column { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
}

@media (max-width: 800px) {
	.warehouse-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 32px; }
	.warehouse-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.warehouse-stat { min-height: 94px; padding: 12px; }
	.warehouse-activity-list { grid-template-columns: 1fr; }
}

@media (max-width: 560px) {
	.warehouse-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 26px; }
	.warehouse-page-heading { align-items: flex-start; }
	.warehouse-page-heading h1 { font-size: 22px; }
	.warehouse-page-heading p { max-width: 190px; line-height: 1.45; }
	.warehouse-page-heading .warehouse-primary-button { min-height: 35px; gap: 5px; padding: 0 9px; font-size: 9px; white-space: nowrap; }
	.warehouse-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.warehouse-stat { min-height: 88px; }
	.warehouse-inventory-panel, .warehouse-inbound-panel, .warehouse-pick-panel, .warehouse-activity-panel { padding: 13px 11px; }
	.warehouse-filters { grid-template-columns: 1fr 1fr; }
	.warehouse-search { grid-column: 1 / -1; }
	.warehouse-filter-field select { width: 100%; max-width: none; }
	.warehouse-operations-column { grid-template-columns: minmax(0, 1fr); }
	.warehouse-capacity > div:first-child { flex-direction: column; gap: 4px; }
	.warehouse-form-grid { grid-template-columns: minmax(0, 1fr); }
	.warehouse-modal { padding: 17px 14px; }
}

.drivers-workspace {
	--driver-ink: #302d36;
	--driver-muted: #85828d;
	--driver-accent: #7544c8;
	--driver-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 30px clamp(18px, 3vw, 42px) 42px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--driver-ink);
	font-family: 'Segoe UI', sans-serif;
}

.drivers-page-heading, .drivers-section-heading, .drivers-detail-heading, .drivers-modal-heading, .drivers-history-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.drivers-page-heading, .drivers-summary-grid, .drivers-content-grid { max-width: 1500px; margin-right: auto; margin-left: auto; }
.drivers-page-heading { margin-bottom: 22px; }
.drivers-kicker { display: block; color: #8050cc; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.drivers-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 26px; font-weight: 650; letter-spacing: 0; }
.drivers-page-heading p { color: #85828d; font-size: 12px; }
.drivers-primary-button, .drivers-secondary-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.drivers-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.drivers-primary-button:hover { background: #6034ae; }
.drivers-primary-button > span { font-size: 16px; font-weight: 400; line-height: 1; }
.drivers-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.drivers-secondary-button:hover:not(:disabled) { background: #f7f4fb; }
.drivers-secondary-button:disabled { opacity: .5; cursor: not-allowed; }
.drivers-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 74%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.drivers-summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 11px; margin-bottom: 14px; }
.drivers-stat { position: relative; min-height: 103px; overflow: hidden; padding: 14px 15px; }
.drivers-stat::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; background: #7544c8; opacity: .7; content: ''; }
.drivers-stat-available::before { background: #45b982; }
.drivers-stat-trip::before { background: #9b68dc; }
.drivers-stat-completed::before { background: #55b6a0; }
.drivers-stat-performance::before { background: #db9a37; }
.drivers-stat > span, .drivers-stat > strong, .drivers-stat > small { position: relative; z-index: 1; display: block; }
.drivers-stat > span { color: #77737e; font-size: 10px; font-weight: 550; }
.drivers-stat > strong { margin-top: 10px; color: #302d36; font-size: 23px; font-weight: 680; line-height: 1; }
.drivers-stat > small { margin-top: 7px; color: #9996a0; font-size: 8px; }
.drivers-stat > i { position: absolute; top: 13px; right: 14px; width: 29px; height: 29px; border: 1px solid rgb(117 68 200 / 16%); border-radius: 50%; }
.drivers-stat > i::after { position: absolute; inset: 6px; border: 1px solid rgb(117 68 200 / 20%); border-radius: 50%; content: ''; }
.drivers-content-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, .8fr); align-items: start; gap: 13px; }
.drivers-list-panel, .drivers-detail-panel { min-width: 0; padding: 16px; }
.drivers-section-heading { margin-bottom: 12px; }
.drivers-section-heading h2 { margin: 0; color: #302d36; font-size: 13px; font-weight: 650; }
.drivers-section-heading p { margin-top: 4px; color: #85828d; font-size: 9px; }
.drivers-register-mark { padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; color: #898391; font-size: 8px; letter-spacing: .08em; white-space: nowrap; }
.drivers-register-mark b { color: #7544c8; }
.drivers-filters { display: grid; grid-template-columns: minmax(150px, 1fr) auto; align-items: end; gap: 8px; margin-bottom: 12px; }
.drivers-search { display: flex; height: 34px; min-width: 0; align-items: center; gap: 8px; padding: 0 9px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.drivers-search:focus-within { border-color: #cbb7e8; background: #fff; }
.drivers-search svg { width: 14px; height: 14px; flex: 0 0 14px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.drivers-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 9px; }
.drivers-search input::placeholder { color: #a29fa8; }
.drivers-filter-field { display: grid; gap: 4px; color: #85828d; font-size: 8px; }
.drivers-filter-field select, .drivers-field input, .drivers-field select { box-sizing: border-box; height: 34px; max-width: 160px; padding: 0 8px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: rgb(255 255 255 / 78%); color: #5e5966; font: inherit; font-size: 9px; }
.drivers-table-scroll { overflow-x: auto; }
.drivers-table { width: 100%; min-width: 810px; border-collapse: collapse; text-align: left; }
.drivers-table th { height: 32px; border-top: 1px solid var(--driver-line); border-bottom: 1px solid var(--driver-line); color: #898491; font-size: 8px; font-weight: 600; }
.drivers-table td { height: 54px; border-bottom: 1px solid rgb(111 92 143 / 9%); color: #65616d; font-size: 8px; white-space: nowrap; }
.drivers-table tbody tr { transition: background-color 120ms ease; }
.drivers-table tbody tr:hover, .drivers-table tbody tr.is-selected { background: rgb(244 239 252 / 68%); }
.drivers-table tbody tr:last-child td { border-bottom: 0; }
.drivers-table td > strong, .drivers-table td > span:not(.driver-availability) { display: block; color: #37343d; font-size: 8px; font-weight: 550; }
.drivers-table td > span:not(.driver-availability) { margin-top: 4px; color: #96929d; font-size: 7px; font-weight: 400; }
.driver-select-button { display: flex; max-width: 175px; align-items: center; gap: 7px; padding: 0; overflow: hidden; border: 0; background: transparent; text-align: left; cursor: pointer; }
.driver-select-button > span:last-child { display: block; min-width: 0; }
.driver-select-button strong, .driver-select-button small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.driver-select-button strong { color: #45404c; font-size: 8px; font-weight: 600; }
.driver-select-button small { margin-top: 3px; color: #96929d; font-size: 7px; }
.driver-select-button:hover strong { color: #7544c8; }
.driver-table-avatar, .driver-detail-avatar { display: grid; flex: 0 0 auto; place-items: center; border-radius: 50%; background: #eee7f8; color: #6740a6; font-weight: 650; }
.driver-table-avatar { width: 27px; height: 27px; font-size: 8px; }
.driver-availability { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px; border-radius: 4px; font-size: 7px; white-space: nowrap; }
.driver-availability i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.driver-availability-available { background: #eaf9ef; color: #38a969; }
.driver-availability-on-trip { background: #f4effc; color: #7544c8; }
.driver-availability-off-duty { background: #f0eff2; color: #77737e; }
.drivers-empty-row { height: 85px !important; color: #85828d !important; text-align: center; }

.drivers-detail-panel { padding: 17px; }
.drivers-detail-heading { align-items: center; justify-content: flex-start; }
.driver-detail-avatar { width: 43px; height: 43px; font-size: 12px; }
.drivers-detail-heading > div { min-width: 0; flex: 1; }
.drivers-detail-heading .drivers-kicker { margin-bottom: 4px; font-size: 7px; }
.drivers-detail-heading h2 { margin: 0; color: #302d36; font-size: 13px; font-weight: 650; }
.drivers-detail-heading p { overflow: hidden; margin-top: 4px; color: #85828d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.drivers-icon-button { display: grid; width: 31px; height: 31px; flex: 0 0 31px; place-items: center; border: 1px solid #ece6f4; border-radius: 6px; background: rgb(255 255 255 / 70%); color: #7544c8; cursor: pointer; }
.drivers-icon-button:hover { background: #f4effc; }
.drivers-icon-button svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
.drivers-profile-status { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 13px; padding: 9px; border: 1px solid rgb(111 92 143 / 10%); border-radius: 5px; background: rgb(255 255 255 / 55%); }
.drivers-profile-status > span:last-child { color: #85828d; font-size: 8px; }
.drivers-detail-section, .drivers-assign-section, .drivers-history-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--driver-line); }
.drivers-detail-section h3, .drivers-performance h3, .drivers-assign-section h3, .drivers-history-heading h3 { margin: 0 0 9px; color: #514c59; font-size: 10px; font-weight: 650; }
.drivers-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
.drivers-facts > span { min-width: 0; color: #96929d; font-size: 7px; }
.drivers-facts strong { display: block; margin-top: 4px; overflow-wrap: anywhere; color: #45404c; font-size: 8px; font-weight: 550; line-height: 1.4; }
.drivers-current-trip { display: grid; gap: 5px; margin-top: 13px; padding: 11px; border: 1px solid #e8def4; border-radius: 5px; background: #f9f6fc; }
.drivers-current-trip .drivers-kicker { margin-bottom: 2px; font-size: 7px; }
.drivers-current-trip strong { color: #51405f; font-size: 8px; }
.drivers-current-trip > span:not(.drivers-kicker) { color: #77737e; font-size: 7px; line-height: 1.45; }
.drivers-performance > div:first-child { display: flex; align-items: center; justify-content: space-between; }
.drivers-performance h3 { margin-bottom: 0; }
.drivers-performance > div:first-child > strong { color: #7544c8; font-size: 10px; }
.drivers-performance > div:first-child > strong small { color: #85828d; font-size: 7px; font-weight: 500; }
.drivers-performance-track { height: 6px; overflow: hidden; margin-top: 9px; border-radius: 4px; background: #eeeaf3; }
.drivers-performance-track i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #b999e1, #7544c8); }
.drivers-performance > span { display: block; margin-top: 6px; color: #85828d; font-size: 7px; }
.drivers-assign-section h3 { margin-bottom: 9px; }
.drivers-assign-section form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: end; gap: 7px; }
.drivers-field { display: grid; min-width: 0; gap: 4px; color: #6e6976; font-size: 7px; font-weight: 550; }
.drivers-field select { width: 100%; max-width: none; min-width: 0; }
.drivers-assign-section .drivers-secondary-button { min-height: 34px; padding: 0 8px; font-size: 8px; white-space: nowrap; }
.drivers-field select:disabled { background: #f1eff4; color: #96929d; cursor: not-allowed; }
.drivers-assignment-note { margin-top: 7px; color: #898491; font-size: 8px; line-height: 1.4; }
.drivers-history-heading { align-items: baseline; }
.drivers-history-heading h3 { margin: 0; }
.drivers-history-heading span { color: #96929d; font-size: 7px; }
.drivers-history { display: grid; gap: 0; max-height: 175px; overflow-y: auto; margin: 10px 0 0; padding: 0; list-style: none; }
.drivers-history li { position: relative; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: start; gap: 7px; min-height: 37px; }
.drivers-history li:not(:last-child)::after { position: absolute; top: 8px; bottom: 0; left: 3px; width: 1px; background: #e5dfed; content: ''; }
.drivers-history li > i { z-index: 1; width: 6px; height: 6px; margin-top: 2px; border-radius: 50%; background: #b6b0bf; }
.drivers-history li.is-current > i { background: #7544c8; box-shadow: 0 0 0 3px #7544c81a; }
.drivers-history li strong, .drivers-history li span { display: block; }
.drivers-history li strong { color: #514c59; font-size: 7px; font-weight: 600; }
.drivers-history li span, .drivers-history li time { margin-top: 3px; color: #96929d; font-size: 7px; line-height: 1.4; }
.drivers-history li time { white-space: nowrap; }
.drivers-empty-detail { display: grid; min-height: 180px; align-content: center; justify-items: center; gap: 7px; color: #514c59; }
.drivers-empty-detail span { color: #898491; font-size: 9px; }

.drivers-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.drivers-modal { width: min(600px, 100%); max-height: min(90vh, 700px); overflow-y: auto; padding: 22px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.drivers-modal-heading { margin-bottom: 16px; }
.drivers-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 18px; font-weight: 650; }
.drivers-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.drivers-form-grid .drivers-field { gap: 5px; font-size: 9px; }
.drivers-form-grid .drivers-field input, .drivers-form-grid .drivers-field select { height: 36px; padding: 0 9px; font-size: 10px; }
.drivers-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 17px; padding-top: 14px; border-top: 1px solid #eeedf0; }
.drivers-primary-button:focus-visible, .drivers-secondary-button:focus-visible, .drivers-icon-button:focus-visible, .driver-select-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 1100px) {
	.drivers-content-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 800px) {
	.drivers-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 32px; }
	.drivers-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.drivers-stat { min-height: 94px; padding: 12px; }
}

@media (max-width: 560px) {
	.drivers-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 26px; }
	.drivers-page-heading { align-items: flex-start; }
	.drivers-page-heading h1 { font-size: 22px; }
	.drivers-page-heading p { max-width: 190px; line-height: 1.45; }
	.drivers-page-heading .drivers-primary-button { min-height: 35px; gap: 5px; padding: 0 9px; font-size: 9px; white-space: nowrap; }
	.drivers-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
	.drivers-stat { min-height: 88px; }
	.drivers-list-panel, .drivers-detail-panel { padding: 13px 11px; }
	.drivers-filters { grid-template-columns: 1fr 1fr; }
	.drivers-search { grid-column: 1 / -1; }
	.drivers-filter-field select { width: 100%; max-width: none; }
	.drivers-assign-section form { grid-template-columns: minmax(0, 1fr); }
	.drivers-form-grid { grid-template-columns: minmax(0, 1fr); }
	.drivers-modal { padding: 17px 14px; }
}

.messages-workspace {
	--message-ink: #302d36;
	--message-muted: #85828d;
	--message-accent: #7544c8;
	--message-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 26px clamp(18px, 3vw, 40px) 32px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--message-ink);
	font-family: 'Segoe UI', sans-serif;
}

.messages-page-heading, .messages-header-actions, .messages-inbox-heading, .messages-thread-heading, .messages-notification-heading, .messages-composer-footer, .messages-modal-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.messages-page-heading { position: relative; max-width: 1500px; margin: 0 auto 18px; }
.messages-kicker { display: block; color: #8050cc; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.messages-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 25px; font-weight: 650; letter-spacing: 0; }
.messages-page-heading p { color: #85828d; font-size: 11px; }
.messages-header-actions { position: relative; }
.messages-primary-button, .messages-secondary-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.messages-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.messages-primary-button:hover { background: #6034ae; }
.messages-primary-button > span { font-size: 16px; font-weight: 400; line-height: 1; }
.messages-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.messages-secondary-button:hover { background: #f7f4fb; }
.messages-notification-button, .messages-icon-button { position: relative; display: grid; width: 36px; height: 36px; flex: 0 0 36px; place-items: center; padding: 0; border: 1px solid #e8e3ee; border-radius: 6px; background: rgb(255 255 255 / 78%); color: #655d70; cursor: pointer; }
.messages-notification-button:hover, .messages-notification-button.is-open, .messages-icon-button:hover { background: #f4effc; color: #7544c8; }
.messages-notification-button svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.messages-notification-button > i { position: absolute; top: -5px; right: -5px; display: grid; min-width: 16px; height: 16px; place-items: center; padding: 0 3px; border: 2px solid #f6f4f9; border-radius: 99px; background: #d15d72; color: #fff; font-size: 8px; font-style: normal; }
.messages-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 77%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.messages-inbox-layout { display: grid; max-width: 1500px; height: min(690px, calc(100vh - 174px)); min-height: 500px; grid-template-columns: minmax(245px, .72fr) minmax(0, 1.7fr); gap: 12px; margin: 0 auto; }
.messages-conversation-panel { display: flex; min-height: 0; flex-direction: column; overflow: hidden; padding: 13px 10px 8px; }
.messages-inbox-heading { padding: 1px 3px 11px; }
.messages-inbox-heading > div { display: flex; align-items: baseline; gap: 8px; }
.messages-inbox-heading h2 { margin: 0; color: #302d36; font-size: 14px; font-weight: 650; }
.messages-inbox-heading > div > span { color: #96929d; font-size: 8px; }
.messages-inbox-heading > button { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #e9e4ef; border-radius: 5px; background: #fff; color: #7544c8; font: inherit; font-size: 16px; cursor: pointer; }
.messages-inbox-heading > button:hover { background: #f4effc; }
.messages-search { display: flex; height: 33px; align-items: center; gap: 7px; padding: 0 8px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.messages-search:focus-within { border-color: #cbb7e8; background: #fff; }
.messages-search svg { width: 13px; height: 13px; flex: 0 0 13px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.messages-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 9px; }
.messages-search input::placeholder { color: #a29fa8; }
.messages-filter-tabs { display: flex; gap: 4px; overflow-x: auto; margin: 10px -2px 8px; padding: 0 2px 4px; scrollbar-width: thin; }
.messages-filter-tabs button { min-height: 24px; flex: 0 0 auto; padding: 0 7px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: #77737e; font: inherit; font-size: 8px; cursor: pointer; }
.messages-filter-tabs button:hover { background: #f8f6fb; }
.messages-filter-tabs button.selected { border-color: #e4d8f5; background: #f4effc; color: #7544c8; }
.messages-conversation-list { flex: 1; overflow-y: auto; margin: 0 -10px; padding: 0 7px; }
.messages-conversation-item { position: relative; display: grid; width: 100%; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: start; gap: 9px; padding: 10px 8px; border: 0; border-bottom: 1px solid rgb(111 92 143 / 8%); border-radius: 5px; background: transparent; text-align: left; cursor: pointer; }
.messages-conversation-item:hover { background: rgb(250 248 253 / 86%); }
.messages-conversation-item.is-selected { background: #f4effc; }
.messages-contact-avatar { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 1px solid rgb(117 68 200 / 12%); border-radius: 50%; background: #eee7f8; color: #6740a6; font-size: 9px; font-weight: 700; }
.role-customer { border-color: #f0e1c9; background: #fff5e7; color: #a56a20; }
.role-warehouse { border-color: #d8ece0; background: #eff9f2; color: #38895e; }
.role-team { border-color: #e5e4e7; background: #f2f1f4; color: #615b69; }
.messages-conversation-copy { display: grid; min-width: 0; gap: 4px; }
.messages-contact-line { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.messages-contact-line strong { overflow: hidden; color: #403b47; font-size: 9px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.messages-contact-line time { flex: 0 0 auto; color: #9b97a1; font-size: 7px; }
.messages-role-line { display: flex; align-items: center; gap: 5px; color: #96929d; font-size: 7px; }
.messages-role-line i { width: 3px; height: 3px; border-radius: 50%; background: #aaa5b1; }
.messages-preview-line { overflow: hidden; color: #7f7a86; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.messages-unread-count { display: grid; min-width: 16px; height: 16px; place-items: center; padding: 0 3px; border-radius: 99px; background: #7544c8; color: #fff; font-size: 7px; font-weight: 700; }
.messages-empty-list { padding: 20px 8px; color: #85828d; font-size: 9px; text-align: center; }

.messages-thread-panel { display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; }
.messages-thread-heading { justify-content: flex-start; min-height: 60px; padding: 11px 15px; border-bottom: 1px solid var(--message-line); }
.messages-thread-heading > div { min-width: 0; }
.messages-thread-heading h2 { overflow: hidden; margin: 0; color: #302d36; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.messages-thread-heading p { display: flex; align-items: center; gap: 5px; margin-top: 4px; color: #85828d; font-size: 8px; }
.messages-presence-dot { width: 6px; height: 6px; border-radius: 50%; background: #45b982; }
.messages-presence-dot.is-traveling { background: #9b68dc; }
.messages-thread-context { max-width: 45%; margin-left: auto; overflow: hidden; padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; background: rgb(255 255 255 / 70%); color: #705b8e; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.messages-context-strip { display: flex; min-height: 30px; align-items: center; gap: 8px; padding: 0 15px; border-bottom: 1px solid rgb(111 92 143 / 8%); background: rgb(249 247 252 / 72%); }
.messages-context-strip > span { color: #96929d; font-size: 7px; font-weight: 700; letter-spacing: .07em; }
.messages-context-strip strong { color: #7544c8; font-size: 8px; font-weight: 650; }
.messages-context-strip small { overflow: hidden; color: #85828d; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.messages-thread-body { display: flex; min-height: 0; flex: 1; flex-direction: column; justify-content: flex-end; gap: 14px; overflow-y: auto; padding: 17px clamp(12px, 2vw, 24px); }
.messages-bubble-row { display: flex; max-width: 82%; align-items: end; gap: 7px; }
.messages-bubble-row.from-me { align-self: flex-end; flex-direction: row-reverse; }
.messages-bubble-avatar { display: grid; width: 24px; height: 24px; flex: 0 0 24px; place-items: center; border-radius: 50%; background: #eee7f8; color: #6740a6; font-size: 7px; font-weight: 700; }
.messages-bubble-avatar.avatar-me { background: #7544c8; color: #fff; }
.messages-bubble-stack { display: grid; min-width: 0; gap: 4px; }
.messages-sender-name { padding-left: 3px; color: #77737e; font-size: 8px; font-weight: 600; }
.messages-bubble { width: fit-content; max-width: 100%; padding: 9px 11px; border: 1px solid rgb(111 92 143 / 10%); border-radius: 9px 9px 9px 2px; background: rgb(255 255 255 / 84%); color: #514c59; font-size: 9px; line-height: 1.55; overflow-wrap: anywhere; white-space: pre-wrap; }
.from-me .messages-bubble { margin-left: auto; border-color: #7544c8; border-radius: 9px 9px 2px 9px; background: #7544c8; color: #fff; }
.messages-bubble-stack time { padding: 0 3px; color: #9b97a1; font-size: 7px; }
.from-me .messages-bubble-stack time { text-align: right; }
.messages-thread-empty, .messages-thread-empty:not(.messages-thread-panel) { display: grid; min-width: 0; min-height: 420px; align-content: center; justify-items: center; gap: 10px; text-align: center; }
.messages-thread-empty h2 { margin: 0; color: #403b47; font-size: 14px; }
.messages-thread-empty p, .messages-thread-empty > span:not(.messages-empty-icon) { color: #85828d; font-size: 9px; }
.messages-empty-icon { display: grid; width: 40px; height: 40px; place-items: center; border: 1px solid #e9e0f3; border-radius: 12px; background: #f4effc; color: #7544c8; font-size: 17px; }
.messages-composer { margin: 0 13px 13px; padding: 9px; border: 1px solid #e9e4ef; border-radius: 7px; background: rgb(255 255 255 / 88%); }
.messages-composer:focus-within { border-color: #cbb7e8; box-shadow: 0 0 0 3px rgb(117 68 200 / 6%); }
.messages-composer textarea { display: block; width: 100%; min-height: 41px; max-height: 130px; resize: vertical; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 9px; line-height: 1.5; }
.messages-composer textarea::placeholder { color: #a29fa8; }
.messages-composer-footer { padding-top: 6px; border-top: 1px solid rgb(111 92 143 / 8%); }
.messages-composer-footer > span { color: #9b97a1; font-size: 7px; }
.messages-send-button { display: inline-flex; min-height: 28px; align-items: center; gap: 5px; padding: 0 9px; border: 0; border-radius: 4px; background: #7544c8; color: #fff; font: inherit; font-size: 8px; font-weight: 600; cursor: pointer; }
.messages-send-button:hover:not(:disabled) { background: #6034ae; }
.messages-send-button:disabled { background: #d6c8e8; cursor: not-allowed; }
.messages-send-button svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }

.messages-notification-popover { position: absolute; z-index: 15; top: calc(100% + 9px); right: 0; width: min(340px, calc(100vw - 32px)); overflow: hidden; border: 1px solid rgb(255 255 255 / 90%); border-radius: 8px; background: rgb(255 255 255 / 96%); box-shadow: 0 16px 40px rgb(49 36 69 / 15%); backdrop-filter: blur(18px); }
.messages-notification-heading { padding: 11px 12px; border-bottom: 1px solid #eeedf0; }
.messages-notification-heading > div { display: grid; gap: 3px; }
.messages-notification-heading strong { color: #403b47; font-size: 10px; }
.messages-notification-heading span { color: #96929d; font-size: 8px; }
.messages-notification-heading > button { padding: 5px; border: 0; background: transparent; color: #7544c8; font: inherit; font-size: 8px; cursor: pointer; }
.messages-notification-heading > button:disabled { color: #aaa5b1; cursor: default; }
.messages-notification-item { display: grid; width: 100%; grid-template-columns: 27px minmax(0, 1fr) 6px; align-items: center; gap: 8px; padding: 10px 12px; border: 0; border-bottom: 1px solid rgb(111 92 143 / 8%); background: transparent; text-align: left; cursor: pointer; }
.messages-notification-item:hover { background: #faf8fd; }
.messages-notification-item > span:nth-child(2) { display: grid; min-width: 0; gap: 3px; }
.messages-notification-mark { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 6px; background: #f4effc; color: #7544c8; font-size: 11px; }
.notice-customer { background: #fff5e7; color: #a56a20; }
.notice-warehouse { background: #eff9f2; color: #38895e; }
.messages-notification-item strong { color: #514c59; font-size: 8px; font-weight: 650; }
.messages-notification-item small, .messages-notification-item time { overflow: hidden; color: #85828d; font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.messages-notification-item time { color: #a09ca6; }
.messages-notification-item > i { width: 6px; height: 6px; border-radius: 50%; background: #7544c8; }
.messages-empty-notifications { padding: 19px 12px; color: #85828d; font-size: 9px; text-align: center; }

.messages-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.messages-modal { width: min(440px, 100%); padding: 21px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.messages-modal-heading { margin-bottom: 15px; }
.messages-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 17px; font-weight: 650; }
.messages-icon-button { font-size: 19px; }
.messages-modal form { display: grid; gap: 11px; }
.messages-field { display: grid; gap: 5px; color: #6e6976; font-size: 9px; font-weight: 550; }
.messages-field input, .messages-field select { box-sizing: border-box; width: 100%; height: 36px; padding: 0 9px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: #fff; color: #5e5966; font: inherit; font-size: 10px; }
.messages-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; padding-top: 13px; border-top: 1px solid #eeedf0; }
.messages-primary-button:focus-visible, .messages-secondary-button:focus-visible, .messages-notification-button:focus-visible, .messages-icon-button:focus-visible, .messages-inbox-heading > button:focus-visible, .messages-filter-tabs button:focus-visible, .messages-conversation-item:focus-visible, .messages-notification-item:focus-visible, .messages-send-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 800px) {
	.messages-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 28px; }
	.messages-inbox-layout { height: min(760px, calc(100vh - 165px)); grid-template-columns: minmax(205px, .75fr) minmax(0, 1.4fr); }
	.messages-thread-context { max-width: 38%; }
}

@media (max-width: 560px) {
	.messages-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 22px; }
	.messages-page-heading { align-items: flex-start; }
	.messages-page-heading h1 { font-size: 22px; }
	.messages-page-heading p { max-width: 190px; line-height: 1.4; }
	.messages-header-actions { gap: 7px; }
	.messages-header-actions > .messages-primary-button { min-height: 34px; gap: 5px; padding: 0 8px; font-size: 8px; white-space: nowrap; }
	.messages-inbox-layout { height: auto; min-height: 0; grid-template-columns: minmax(0, 1fr); }
	.messages-conversation-panel { max-height: 290px; }
	.messages-conversation-list { max-height: 190px; }
	.messages-thread-panel { min-height: 480px; }
	.messages-thread-empty:not(.messages-thread-panel) { min-height: 250px; }
	.messages-thread-context { max-width: 42%; font-size: 7px; }
	.messages-context-strip { flex-wrap: wrap; padding: 6px 11px; }
	.messages-thread-body { min-height: 230px; padding: 14px 10px; }
	.messages-bubble-row { max-width: 94%; }
	.messages-composer { margin: 0 8px 8px; }
	.messages-composer-footer > span { max-width: 150px; line-height: 1.3; }
}

.billing-workspace {
	--billing-ink: #302d36;
	--billing-muted: #85828d;
	--billing-accent: #7544c8;
	--billing-line: rgb(111 92 143 / 13%);
	box-sizing: border-box;
	min-height: calc(100vh - 40px);
	margin: -20px;
	padding: 28px clamp(18px, 3vw, 42px) 36px;
	background-color: #f6f4f9;
	background-image: linear-gradient(135deg, rgb(255 255 255 / 75%), transparent 55%), repeating-linear-gradient(0deg, rgb(115 94 147 / 2%) 0 1px, transparent 1px 34px);
	color: var(--billing-ink);
	font-family: 'Segoe UI', sans-serif;
}

.billing-page-heading, .billing-section-heading, .billing-detail-heading, .billing-modal-heading, .billing-history-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.billing-page-heading, .billing-summary-grid, .billing-main-grid, .billing-report { max-width: 1500px; margin-right: auto; margin-left: auto; }
.billing-page-heading { margin-bottom: 19px; }
.billing-kicker { display: block; color: #8050cc; font-size: 9px; font-weight: 750; letter-spacing: .12em; }
.billing-page-heading h1 { margin: 5px 0 4px; color: #302d36; font-size: 25px; font-weight: 650; letter-spacing: 0; }
.billing-page-heading p { color: #85828d; font-size: 11px; }
.billing-primary-button, .billing-secondary-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding: 0 12px; border: 1px solid transparent; border-radius: 6px; font: inherit; font-size: 10px; font-weight: 600; cursor: pointer; }
.billing-primary-button { background: #7544c8; color: #fff; box-shadow: 0 5px 13px rgb(117 68 200 / 18%); }
.billing-primary-button:hover { background: #6034ae; }
.billing-primary-button > span { font-size: 16px; font-weight: 400; line-height: 1; }
.billing-page-heading .billing-primary-button { position: relative; padding-right: 14px; }
.billing-page-heading .billing-primary-button small { margin-left: 4px; color: rgb(255 255 255 / 75%); font-size: 7px; font-weight: 450; }
.billing-secondary-button { border-color: #e5e1eb; background: #fff; color: #5e5966; }
.billing-secondary-button:hover { background: #f7f4fb; }
.billing-glass-card { border: 1px solid rgb(255 255 255 / 86%); border-radius: 9px; background: rgb(255 255 255 / 76%); box-shadow: 0 8px 24px rgb(54 40 77 / 5%), inset 0 1px 0 rgb(255 255 255 / 94%); backdrop-filter: blur(16px); }
.billing-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; margin-bottom: 13px; }
.billing-stat { position: relative; min-height: 99px; overflow: hidden; padding: 13px 15px; }
.billing-stat::before { position: absolute; top: 0; right: 0; left: 0; height: 2px; background: #7544c8; opacity: .72; content: ''; }
.billing-stat-paid::before { background: #45b982; }
.billing-stat-pending::before { background: #db9a37; }
.billing-stat-overdue::before { background: #dc7285; }
.billing-stat > span, .billing-stat > strong, .billing-stat > small { position: relative; z-index: 1; display: block; }
.billing-stat > span { color: #77737e; font-size: 10px; font-weight: 550; }
.billing-stat > strong { margin-top: 9px; color: #302d36; font-size: 22px; font-weight: 680; line-height: 1; }
.billing-stat > small { margin-top: 6px; color: #96929d; font-size: 9px; }
.billing-stat > i { position: absolute; top: 12px; right: 13px; width: 27px; height: 27px; border: 1px solid rgb(117 68 200 / 16%); border-radius: 50%; }
.billing-stat > i::after { position: absolute; inset: 5px; border: 1px solid rgb(117 68 200 / 20%); border-radius: 50%; content: ''; }
.billing-main-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, .8fr); align-items: start; gap: 12px; }
.billing-register, .billing-detail-panel { min-width: 0; padding: 15px; }
.billing-section-heading { margin-bottom: 11px; }
.billing-section-heading h2 { margin: 0; color: #302d36; font-size: 13px; font-weight: 650; }
.billing-section-heading p { margin-top: 4px; color: #85828d; font-size: 9px; }
.billing-register-mark, .billing-report-period { padding: 6px 8px; border: 1px solid #ece6f4; border-radius: 4px; color: #898391; font-size: 7px; letter-spacing: .08em; white-space: nowrap; }
.billing-register-mark b { color: #7544c8; }
.billing-filters { display: grid; grid-template-columns: minmax(150px, 1fr) auto auto auto; align-items: end; gap: 8px; margin-bottom: 11px; }
.billing-search { display: flex; height: 33px; min-width: 0; align-items: center; gap: 7px; padding: 0 8px; border: 1px solid #ebe8ef; border-radius: 5px; background: rgb(255 255 255 / 70%); color: #85828d; }
.billing-search:focus-within { border-color: #cbb7e8; background: #fff; }
.billing-search svg { width: 13px; height: 13px; flex: 0 0 13px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-width: 1.6; }
.billing-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #37343d; font: inherit; font-size: 9px; }
.billing-search input::placeholder { color: #a29fa8; }
.billing-filter-field { display: grid; gap: 4px; color: #85828d; font-size: 8px; }
.billing-filter-field select, .billing-filter-field input { box-sizing: border-box; height: 33px; max-width: 138px; padding: 0 7px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: rgb(255 255 255 / 78%); color: #5e5966; font: inherit; font-size: 8px; }
.billing-reset-button { min-height: 33px; padding: 0 4px; border: 0; background: transparent; color: #7544c8; font: inherit; font-size: 8px; cursor: pointer; }
.billing-table-scroll { overflow-x: auto; }
.billing-table { width: 100%; min-width: 700px; border-collapse: collapse; text-align: left; }
.billing-table th { height: 31px; border-top: 1px solid var(--billing-line); border-bottom: 1px solid var(--billing-line); color: #898491; font-size: 8px; font-weight: 600; }
.billing-table td { height: 51px; border-bottom: 1px solid rgb(111 92 143 / 9%); color: #65616d; font-size: 8px; white-space: nowrap; }
.billing-table tbody tr:hover, .billing-table tbody tr.is-selected { background: rgb(244 239 252 / 68%); }
.billing-table tbody tr:last-child td { border-bottom: 0; }
.billing-table td > strong, .billing-table td > span:not(.billing-status), .billing-select-button strong, .billing-select-button span { display: block; }
.billing-table td > strong { color: #37343d; font-size: 8px; font-weight: 600; }
.billing-table td > span:not(.billing-status), .billing-select-button span { max-width: 175px; overflow: hidden; margin-top: 4px; color: #96929d; font-size: 7px; text-overflow: ellipsis; }
.billing-select-button { max-width: 180px; padding: 0; overflow: hidden; border: 0; background: transparent; text-align: left; cursor: pointer; }
.billing-select-button strong { overflow: hidden; color: #7544c8; font-size: 8px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.billing-select-button:hover strong { text-decoration: underline; }
.billing-status { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px; border-radius: 4px; font-size: 7px; line-height: 1; white-space: nowrap; }
.billing-status i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.billing-status-paid { background: #eaf9ef; color: #38a969; }
.billing-status-pending { background: #fff4e7; color: #c98622; }
.billing-status-overdue { background: #fff0f2; color: #d15d72; }
.billing-status-cancelled { background: #f0eff2; color: #77737e; }
.billing-empty-row { height: 85px !important; color: #85828d !important; text-align: center; }
.billing-reset-button:focus-visible, .billing-select-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

.billing-detail-heading { align-items: flex-start; }
.billing-detail-heading .billing-kicker { margin-bottom: 4px; font-size: 7px; }
.billing-detail-heading h2 { margin: 0; color: #302d36; font-size: 12px; font-weight: 650; }
.billing-detail-heading p { margin-top: 4px; color: #85828d; font-size: 8px; }
.billing-amount-block { display: grid; gap: 5px; margin-top: 13px; padding: 12px; border: 1px solid #e8def4; border-radius: 5px; background: #f9f6fc; }
.billing-amount-block > span { color: #8050b7; font-size: 7px; font-weight: 700; letter-spacing: .08em; }
.billing-amount-block > strong { color: #302d36; font-size: 22px; font-weight: 680; }
.billing-amount-block > small { color: #85828d; font-size: 8px; }
.billing-detail-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; margin-top: 13px; }
.billing-detail-facts > span { min-width: 0; color: #96929d; font-size: 7px; }
.billing-detail-facts strong { display: block; margin-top: 4px; overflow-wrap: anywhere; color: #45404c; font-size: 8px; font-weight: 550; line-height: 1.4; }
.billing-memo { margin-top: 12px; padding: 9px; border-left: 2px solid #9b68dc; background: rgb(249 247 252 / 80%); color: #77737e; font-size: 8px; line-height: 1.45; }
.billing-mark-paid-button { width: 100%; min-height: 32px; margin-top: 10px; border: 0; border-radius: 5px; background: #7544c8; color: #fff; font: inherit; font-size: 9px; font-weight: 600; cursor: pointer; }
.billing-mark-paid-button:hover { background: #6034ae; }
.billing-history { margin-top: 13px; padding-top: 12px; border-top: 1px solid var(--billing-line); }
.billing-history-heading { align-items: baseline; }
.billing-history-heading h3 { margin: 0; color: #514c59; font-size: 9px; font-weight: 650; }
.billing-history-heading span { color: #96929d; font-size: 7px; }
.billing-history ol { display: grid; gap: 0; margin: 10px 0 0; padding: 0; list-style: none; }
.billing-history li { position: relative; display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: start; gap: 7px; min-height: 36px; }
.billing-history li:not(:last-child)::after { position: absolute; top: 8px; bottom: 0; left: 3px; width: 1px; background: #e5dfed; content: ''; }
.billing-history li > i { z-index: 1; width: 6px; height: 6px; margin-top: 2px; border-radius: 50%; background: #b6b0bf; }
.billing-history li.is-current > i { background: #7544c8; box-shadow: 0 0 0 3px #7544c81a; }
.billing-history li strong, .billing-history li span { display: block; }
.billing-history li strong { color: #514c59; font-size: 7px; font-weight: 600; }
.billing-history li span, .billing-history li time { margin-top: 3px; color: #96929d; font-size: 7px; line-height: 1.4; }
.billing-history li time { white-space: nowrap; }
.billing-empty-detail { display: grid; min-height: 170px; align-content: center; justify-items: center; gap: 7px; color: #514c59; }
.billing-empty-detail span { color: #898491; font-size: 9px; }

.billing-report { margin-top: 12px; padding: 14px 16px; }
.billing-report-content { display: grid; gap: 11px; }
.billing-report-bar { display: flex; height: 9px; overflow: hidden; border-radius: 6px; background: #eeeaf3; }
.billing-report-bar i { min-width: 0; transition: width 180ms ease; }
.report-paid { background: #55b982; }
.report-pending { background: #b18adf; }
.report-overdue { background: #dc7285; }
.billing-report-legend { display: flex; flex-wrap: wrap; gap: 10px 19px; }
.billing-report-legend > span { display: grid; grid-template-columns: 7px auto; align-items: center; gap: 3px 6px; color: #77737e; font-size: 8px; }
.billing-report-legend > span > i { width: 7px; height: 7px; grid-row: span 2; border-radius: 50%; }
.report-paid-dot { background: #55b982; }
.report-pending-dot { background: #b18adf; }
.report-overdue-dot { background: #dc7285; }
.billing-report-legend strong { color: #45404c; font-size: 9px; font-weight: 650; }
.billing-report-total { margin-left: auto; padding-left: 14px; border-left: 1px solid var(--billing-line); }

.billing-modal-backdrop { position: fixed; z-index: 20; inset: 0; display: grid; place-items: center; padding: 18px; background: rgb(42 34 53 / 34%); backdrop-filter: blur(5px); }
.billing-modal { width: min(580px, 100%); max-height: min(90vh, 700px); overflow-y: auto; padding: 21px; border: 1px solid rgb(255 255 255 / 85%); border-radius: 10px; background: rgb(255 255 255 / 94%); box-shadow: 0 24px 70px rgb(49 36 69 / 22%); backdrop-filter: blur(20px); }
.billing-modal-heading { margin-bottom: 15px; }
.billing-modal-heading h2 { margin: 5px 0 0; color: #302d36; font-size: 17px; font-weight: 650; }
.billing-icon-button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #ece6f4; border-radius: 6px; background: #fff; color: #7544c8; font: inherit; font-size: 19px; cursor: pointer; }
.billing-icon-button:hover { background: #f4effc; }
.billing-field { display: grid; min-width: 0; gap: 5px; color: #6e6976; font-size: 9px; font-weight: 550; }
.billing-field select, .billing-field input { box-sizing: border-box; width: 100%; min-width: 0; height: 35px; padding: 0 9px; border: 1px solid #e7e3eb; border-radius: 5px; outline-color: #cbb7e8; background: #fff; color: #5e5966; font: inherit; font-size: 10px; }
.billing-order-preview { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 12px 0; padding: 11px; border: 1px solid #eee8f5; border-radius: 5px; background: #faf8fd; }
.billing-order-preview small, .billing-order-preview strong { display: block; }
.billing-order-preview small { color: #96929d; font-size: 7px; font-weight: 700; letter-spacing: .07em; }
.billing-order-preview .billing-existing-invoices { grid-column: 1 / -1; color: #8050b7; font-size: 8px; font-weight: 500; letter-spacing: 0; }
.billing-order-preview strong { margin-top: 4px; color: #45404c; font-size: 8px; font-weight: 550; line-height: 1.4; overflow-wrap: anywhere; }
.billing-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 13px; }
.billing-field-wide { grid-column: 1 / -1; }
.billing-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 13px; border-top: 1px solid #eeedf0; }
.billing-no-orders { display: grid; justify-items: start; gap: 9px; padding: 14px 0 3px; }
.billing-no-orders strong { color: #45404c; font-size: 11px; }
.billing-no-orders span { color: #85828d; font-size: 9px; }
.billing-primary-button:focus-visible, .billing-secondary-button:focus-visible, .billing-icon-button:focus-visible, .billing-mark-paid-button:focus-visible, .billing-select-button:focus-visible, .billing-reset-button:focus-visible { outline: 2px solid #7544c8; outline-offset: 2px; }

@media (max-width: 1100px) {
	.billing-main-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 800px) {
	.billing-workspace { min-height: calc(100vh - 28px); margin: -14px; padding: 22px 16px 30px; }
	.billing-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.billing-stat { min-height: 90px; }
}

@media (max-width: 560px) {
	.billing-workspace { min-height: calc(100vh - 20px); margin: -10px; padding: 18px 11px 24px; }
	.billing-page-heading { align-items: flex-start; }
	.billing-page-heading h1 { font-size: 22px; }
	.billing-page-heading p { max-width: 200px; line-height: 1.4; }
	.billing-page-heading .billing-primary-button { min-height: 34px; gap: 4px; padding: 0 8px; font-size: 8px; white-space: nowrap; }
	.billing-page-heading .billing-primary-button small { display: none; }
	.billing-summary-grid { gap: 8px; }
	.billing-stat { min-height: 84px; padding: 11px; }
	.billing-stat > strong { font-size: 20px; }
	.billing-register, .billing-detail-panel, .billing-report { padding: 12px 10px; }
	.billing-filters { grid-template-columns: 1fr 1fr; }
	.billing-search { grid-column: 1 / -1; }
	.billing-filter-field select, .billing-filter-field input { width: 100%; max-width: none; }
	.billing-report-legend { gap: 9px 12px; }
	.billing-report-total { margin-left: 0; padding-left: 0; border-left: 0; }
	.billing-form-grid { grid-template-columns: minmax(0, 1fr); }
	.billing-field-wide { grid-column: auto; }
	.billing-modal { padding: 17px 14px; }
}
```

### `src/dashboard.jsx`

```jsx
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import OrdersDashboard from './Orders.jsx'
import ShipmentsDashboard from './Shipments.jsx'
import WarehouseDashboard from './Warehouse.jsx'
import DriversDashboard from './Drivers.jsx'
import MessagesDashboard from './Messages.jsx'
import InvoicesDashboard from './Invoices.jsx'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'
import './dashboard.css'

const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const SETTINGS_KEY = 'logicraft-settings-v1'

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function readSettings() {
	const defaults = { company: 'LogiCraft Logistics', timezone: 'America/Chicago', emailNotifications: true }
	try {
		const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
		return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...defaults, ...saved } : defaults
	} catch {
		return defaults
	}
}

const locationCoordinates = [
	['newark', [40.7357, -74.1724]], ['chicago', [41.8781, -87.6298]], ['joliet', [41.525, -88.0817]],
	['boston', [42.3601, -71.0589]], ['cambridge', [42.3736, -71.1097]], ['new york', [40.7128, -74.006]],
	['queens', [40.7282, -73.7949]], ['dallas', [32.7767, -96.797]], ['waco', [31.5493, -97.1467]],
	['austin', [30.2672, -97.7431]], ['seattle', [47.6062, -122.3321]], ['portland', [45.5231, -122.6765]],
	['philadelphia', [39.9526, -75.1652]], ['wilmington', [39.7447, -75.5466]], ['baltimore', [39.2904, -76.6122]],
]

function coordinatesFor(location) {
	const match = locationCoordinates.find(([place]) => location.toLowerCase().includes(place))
	return match?.[1] ?? null
}

function getTrackingShipments() {
	return readList(SHIPMENTS_KEY, sampleShipments).map((shipment) => {
		const originCoordinates = coordinatesFor(shipment.pickup)
		const destinationCoordinates = coordinatesFor(shipment.destination)
		const current = shipment.currentLocation || shipment.pickup
		const progressByStatus = { 'Ready for Pickup': 1, 'Picked Up': 2, 'In Transit': 3, 'Out for Delivery': 4, Delivered: 5, Delayed: 3, 'Failed Delivery': 4 }
		const driverPhones = {
			'Christina Kamberina': '+1 (312) 555-0184',
			'Daniel Brooks': '+1 (617) 555-0127',
			'Marcus Lee': '+1 (512) 555-0166',
			'Avery Chen': '+1 (206) 555-0141',
			'Nina Patel': '+1 (215) 555-0178',
		}

		return {
			id: shipment.tracking,
			order: shipment.orderId,
			origin: shipment.pickup,
			destination: shipment.destination,
			originCoordinates,
			currentCoordinates: coordinatesFor(current),
			destinationCoordinates,
			status: shipment.status,
			eta: shipment.eta,
			etaConfidence: shipment.etaConfidence,
			vehicle: shipment.vehicle.split(' · ')[0],
			vehicleType: shipment.vehicle.split(' · ')[1] ?? 'Vehicle',
			driver: shipment.driver,
			phone: driverPhones[shipment.driver] ?? 'Contact through Messages',
			location: current,
			current,
			progress: progressByStatus[shipment.status] ?? 0,
			updated: shipment.history?.[0]?.date ?? 'Recently',
			pickup: shipment.pickup,
			destinationFull: shipment.destination,
		}
	})
}

function getDashboardRows(shipments, orders) {
	return shipments.map((shipment) => {
		const order = orders.find((item) => item.id === shipment.orderId)
		const status = shipment.status === 'Delivered'
			? 'Completed'
			: shipment.status === 'Ready for Pickup'
				? 'Pending'
				: shipment.status === 'Delayed' || shipment.status === 'Failed Delivery'
					? 'Delayed'
					: 'On Delivery'
		const date = shipment.deliveryDate

		return {
			id: shipment.id,
			company: shipment.customer,
			category: order?.item ?? 'Freight',
			weight: order?.weight ? `${order.weight} lb` : '—',
			from: shipment.pickup,
			to: shipment.destination,
			date: date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled',
			month: date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
			status,
		}
	})
}

function pageFromHash() {
	const slug = window.location.hash.slice(1)
	return [...primaryItems, ...managementItems].find((item) => item.label.toLowerCase().replaceAll(' ', '-') === slug)?.label ?? 'Dashboard'
}

const primaryItems = [
	{ label: 'Dashboard', icon: 'dashboard' },
	{ label: 'Tracking', icon: 'tracking' },
	{ label: 'Orders', icon: 'orders' },
	{ label: 'Shipments', icon: 'shipments' },
	{ label: 'Warehouse', icon: 'warehouse' },
	{ label: 'Drivers', icon: 'drivers' },
	{ label: 'Messages', icon: 'messages' },
	{ label: 'Invoices & Billing', icon: 'billing' },
]

const managementItems = [
	{ label: 'Analytics', icon: 'analytics' },
	{ label: 'Settings', icon: 'settings' },
]

function NavIcon({ name }) {
	const common = {
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.8,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		viewBox: '0 0 24 24',
		'aria-hidden': true,
	}

	const shapes = {
		dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
		tracking: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0" /><path d="m15 5 3-2 3 2" /></>,
		orders: <><path d="M5 4.5h14v15H5z" /><path d="M8 8h8M8 12h8M8 16h5" /><path d="M9 4.5v-1h6v1" /></>,
		shipments: <><path d="M3 6h11v11H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="19" r="2" /><circle cx="17.5" cy="19" r="2" /></>,
		warehouse: <><path d="m3 10 9-6 9 6v10H3z" /><path d="M8 20v-7h8v7M8 9h.01M12 9h.01M16 9h.01" /></>,
		drivers: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><circle cx="12" cy="9" r="2.5" /><path d="M8 16.5a4 4 0 0 1 8 0" /></>,
		messages: <><path d="M4 5.5h16v12H9l-5 3z" /><path d="M8 10h8M8 14h5" /></>,
		billing: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.2 2.8 1 2.8 2.2-1.1 2-2.8 2c-1.2 0-2.3-.4-3-1.1M12 6v12" /></>,
		analytics: <><path d="M4 19.5h16" /><path d="M6.5 16V11M12 16V5M17.5 16V8" /></>,
		settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19 13.5 1.5 1.2-1.5 2.6-1.9-.6a7 7 0 0 1-1.5.9l-.4 2h-3l-.4-2a7 7 0 0 1-1.5-.9l-1.9.6-1.5-2.6 1.5-1.2a7 7 0 0 1 0-1.8l-1.5-1.2 1.5-2.6 1.9.6a7 7 0 0 1 1.5-.9l.4-2h3l.4 2a7 7 0 0 1 1.5.9l1.9-.6 1.5 2.6-1.5 1.2a7 7 0 0 1 0 1.8Z" transform="translate(-1 -1) scale(1.08)" /></>,
		help: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 12h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a1 1 0 0 1 1-1Zm16 0h-2.5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2v-4a1 1 0 0 0-1-1Z" /></>,
		logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /></>,
	}

	return <svg {...common}>{shapes[name]}</svg>
}

function NavigationGroup({ title, items, activeLabel, onSelect }) {
	return (
		<section className="sidebar-group" aria-label={title}>
			<h2 className="sidebar-group-title">{title}</h2>
			<nav className="sidebar-nav">
				{items.map(({ label, icon }) => (
					<a
						className={`sidebar-link${label === activeLabel ? ' is-active' : ''}`}
						href={`#${label.toLowerCase().replaceAll(' ', '-')}`}
						onClick={(event) => { event.preventDefault(); onSelect(label) }}
						key={label}
						aria-current={label === activeLabel ? 'page' : undefined}
					>
						<span className="sidebar-link-icon"><NavIcon name={icon} /></span>
						<span>{label}</span>
					</a>
				))}
			</nav>
		</section>
	)
}

const trackingStatuses = ['Order Created', 'Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered']

let googleMapsPromise

function loadGoogleMaps(apiKey) {
	if (window.google?.maps) return Promise.resolve(window.google.maps)
	if (googleMapsPromise) return googleMapsPromise

	googleMapsPromise = new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`
		script.async = true
		script.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('Google Maps did not initialize'))
		script.onerror = () => reject(new Error('Google Maps failed to load'))
		document.head.append(script)
	})

	return googleMapsPromise
}

function LeafletRouteMap({ shipment }) {
	const mapElement = useRef(null)
	const [mapMessage, setMapMessage] = useState('Loading road route...')

	useEffect(() => {
		if (!mapElement.current) return undefined
		let cancelled = false
		const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(shipment.currentCoordinates, 6)
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19,
		}).addTo(map)
		const markers = [
			[shipment.originCoordinates, 'Pickup', '#7544c8'],
			[shipment.currentCoordinates, 'Last recorded location', '#49a978'],
			[shipment.destinationCoordinates, 'Destination', '#df8a36'],
		]
		markers.forEach(([coordinates, title, color]) => L.circleMarker(coordinates, {
			radius: 7,
			color: '#fff',
			weight: 2,
			fillColor: color,
			fillOpacity: 1,
		}).bindTooltip(title).addTo(map))

		const [originLat, originLng] = shipment.originCoordinates
		const [destinationLat, destinationLng] = shipment.destinationCoordinates
		const routeUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`
		fetch(routeUrl).then((response) => {
			if (!response.ok) throw new Error('Route service unavailable')
			return response.json()
		}).then((data) => {
			if (cancelled || data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found')
			const route = L.geoJSON(data.routes[0].geometry, { style: { color: '#7544c8', weight: 5, opacity: 0.9 } }).addTo(map)
			map.fitBounds(route.getBounds().pad(0.12))
			setMapMessage('')
		}).catch(() => {
			if (!cancelled) setMapMessage('Road directions are temporarily unavailable; showing shipment locations.')
		})

		return () => {
			cancelled = true
			map.remove()
		}
	}, [shipment.id, shipment.currentCoordinates, shipment.destinationCoordinates, shipment.originCoordinates])

	if (!shipment.originCoordinates || !shipment.currentCoordinates || !shipment.destinationCoordinates) {
		return <div className="tracking-map"><div className="google-map-message" role="status">Map coordinates are unavailable for this address.</div></div>
	}

	return <div className="tracking-map" role="img" aria-label={`OpenStreetMap driving route from ${shipment.origin} to ${shipment.destination}`}><div className="leaflet-route-map" ref={mapElement} />{mapMessage && <div className="google-map-message" role="status">{mapMessage}</div>}<span className="map-location-note">Marker shows last recorded location</span></div>
}

function GoogleRouteMap({ shipment, apiKey }) {
	const mapElement = useRef(null)
	const [mapMessage, setMapMessage] = useState('Loading Google Maps...')

	useEffect(() => {
		let cancelled = false

		loadGoogleMaps(apiKey).then((maps) => {
			if (cancelled || !mapElement.current) return
			setMapMessage('Calculating driving route...')
			const map = new maps.Map(mapElement.current, {
				center: { lat: 39.5, lng: -98.35 },
				zoom: 5,
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true,
				mapTypeId: maps.MapTypeId.ROADMAP,
				styles: [
					{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
					{ featureType: 'landscape', stylers: [{ color: '#f7f7f9' }] },
					{ featureType: 'water', stylers: [{ color: '#e8f3fa' }] },
					{ featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
					{ featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e1eb' }] },
				],
			})
			const directions = new maps.DirectionsRenderer({
				map,
				polylineOptions: { strokeColor: '#7544c8', strokeWeight: 5 },
			})
			new maps.DirectionsService().route({
				origin: shipment.origin,
				destination: shipment.destination,
				travelMode: maps.TravelMode.DRIVING,
			}).then((result) => {
				if (cancelled) return
				directions.setDirections(result)
				setMapMessage('')
			}).catch(() => {
				if (!cancelled) setMapMessage('Could not calculate a driving route for this shipment.')
			})
		}).catch(() => {
			if (!cancelled) setMapMessage('Google Maps failed to load. Check the API key and enabled APIs.')
		})

		return () => { cancelled = true }
	}, [apiKey, shipment.destination, shipment.origin])

	return (
		<div className="tracking-map" aria-label={`Google map route from ${shipment.origin} to ${shipment.destination}`}>
			<div className="google-route-map" ref={mapElement} />
			{mapMessage && <div className="google-map-message" role="status">{mapMessage}</div>}
		</div>
	)
}

function TrackingRouteMap({ shipment }) {
	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
	return apiKey ? <GoogleRouteMap shipment={shipment} apiKey={apiKey} /> : <LeafletRouteMap shipment={shipment} />
}

function TrackingDashboard() {
	const trackingShipments = getTrackingShipments()
	const [query, setQuery] = useState('')
	const [status, setStatus] = useState('All')
	const [selectedId, setSelectedId] = useState(trackingShipments[0]?.id ?? '')
	const visibleShipments = trackingShipments.filter((shipment) => {
		const matchesQuery = `${shipment.id} ${shipment.order} ${shipment.destination} ${shipment.origin} ${shipment.driver}`.toLowerCase().includes(query.trim().toLowerCase())
		return matchesQuery && (status === 'All' || shipment.status === status)
	})
	const selected = visibleShipments.find((shipment) => shipment.id === selectedId) ?? visibleShipments[0]
	const statuses = ['All', ...new Set(trackingShipments.map((shipment) => shipment.status))]
	const counts = {
		active: trackingShipments.filter((shipment) => shipment.status !== 'Delivered').length,
		inTransit: trackingShipments.filter((shipment) => shipment.status === 'In Transit').length,
		delivered: trackingShipments.filter((shipment) => shipment.status === 'Delivered').length,
		delayed: trackingShipments.filter((shipment) => shipment.status === 'Delayed' || shipment.status === 'Failed Delivery').length,
	}

	return (
		<div className="tracking-workspace">
			<header className="tracking-page-header">
				<div><p className="tracking-eyebrow">LOGISTICS / LIVE OPERATIONS</p><h1>Shipment tracking</h1><p className="tracking-subtitle">Monitor every delivery, from pickup to destination.</p></div>
				<div className="tracking-live-indicator"><i /> Connected data <span>{trackingShipments.length} shipments</span></div>
			</header>

			<section className="tracking-summary" aria-label="Shipment overview">
				{[
					['Active shipments', counts.active, 'Currently on the road'],
					['In transit', counts.inTransit, 'Moving between hubs'],
					['Delivered', counts.delivered, 'Completed successfully'],
					['Delayed', counts.delayed, 'Needs attention'],
				].map(([label, value, note], index) => <article className="tracking-stat" key={label}><span className={`tracking-stat-mark mark-${index}`} /><span className="tracking-stat-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}
			</section>

			<section className="tracking-list-panel" aria-labelledby="tracking-list-title">
				<div className="tracking-list-heading"><div><h2 id="tracking-list-title">Shipments</h2><p>{visibleShipments.length} shipments found</p></div>
					<label className="tracking-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracking or order ID" aria-label="Search tracking or order ID" /></label>
				</div>
				<div className="tracking-filter-row" role="group" aria-label="Filter shipments by status">
					{statuses.map((item) => <button type="button" key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item}<span>{item === 'All' ? trackingShipments.length : trackingShipments.filter((shipment) => shipment.status === item).length}</span></button>)}
				</div>
				<div className="tracking-table-scroll"><table className="tracking-table"><thead><tr><th>Tracking / Order ID</th><th>Destination</th><th>Status</th><th>ML-predicted ETA</th><th>Assigned vehicle</th><th><span className="sr-only">Details</span></th></tr></thead>
					<tbody>{visibleShipments.map((shipment) => <tr key={shipment.id} className={selected?.id === shipment.id ? 'is-selected' : ''}>
						<td><button className="tracking-row-select" type="button" onClick={() => setSelectedId(shipment.id)}><strong>{shipment.id}</strong><span>{shipment.order}</span></button></td>
						<td><strong>{shipment.destination}</strong><span>From {shipment.origin}</span></td>
						<td><span className={`tracking-status status-${shipment.status.toLowerCase().replaceAll(' ', '-')}`}><i />{shipment.status}</span></td>
						<td><strong>{shipment.eta}</strong><span>{shipment.etaConfidence} confidence</span></td>
						<td><strong>{shipment.vehicle}</strong><span>{shipment.vehicleType}</span></td>
						<td><button className="tracking-open-button" type="button" onClick={() => setSelectedId(shipment.id)} aria-label={`View ${shipment.id}`}>View <span aria-hidden="true">&#8594;</span></button></td>
					</tr>)}
					{visibleShipments.length === 0 && <tr><td className="tracking-no-results" colSpan="6">No shipments match this search or status filter.</td></tr>}</tbody>
				</table></div>
			</section>

			{selected && <section className="tracking-detail-panel" aria-labelledby="tracking-detail-title">
				<div className="tracking-detail-heading"><div><p className="tracking-eyebrow">SHIPMENT DETAILS</p><h2 id="tracking-detail-title">{selected.id}</h2></div><span className={`tracking-status status-${selected.status.toLowerCase().replaceAll(' ', '-')}`}><i />{selected.status}</span></div>
				<div className="tracking-detail-grid">
					<div className="tracking-detail-main">
						<TrackingRouteMap shipment={selected} />
						<div className="tracking-route-points"><div><span className="route-pin pickup-pin" /><small>Pickup</small><strong>{selected.pickup}</strong></div><span className="route-connector" /><div><span className="route-pin destination-pin" /><small>Destination</small><strong>{selected.destinationFull}</strong></div></div>
						<div className="tracking-progress-wrap"><div className="tracking-progress-heading"><h3>Delivery progress</h3><span>{Math.round((selected.progress / (trackingStatuses.length - 1)) * 100)}% complete</span></div><ol className="tracking-progress">{trackingStatuses.map((step, index) => <li key={step} className={index < selected.progress ? 'complete' : index === selected.progress ? 'current' : ''}><span className="progress-node">{index < selected.progress ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{step}</span></li>)}</ol></div>
					</div>
					<aside className="tracking-detail-aside">
						<div className="tracking-eta-card"><span>ML-PREDICTED DELIVERY</span><strong>{selected.eta}</strong><small><i /> Prediction confidence: {selected.etaConfidence}</small></div>
						<div className="tracking-driver-card"><div className="tracking-card-title"><h3>Driver &amp; vehicle</h3><span className="driver-online"><i /> On route</span></div><div className="driver-profile"><span className="driver-avatar">{selected.driver.split(' ').map((part) => part[0]).join('')}</span><div><strong>{selected.driver}</strong><small>{selected.phone}</small></div></div><div className="driver-facts"><span>Vehicle<strong>{selected.vehicle}</strong></span><span>Type<strong>{selected.vehicleType}</strong></span></div></div>
						<div className="tracking-timeline-card"><div className="tracking-card-title"><h3>Status timeline</h3><span>Latest update · {selected.updated}</span></div><ol>{trackingStatuses.slice(0, selected.progress + 1).slice().reverse().map((step, index) => <li key={step} className={index === 0 ? 'timeline-latest' : ''}><i /><div><strong>{index === 0 && (selected.status === 'Delayed' || selected.status === 'Failed Delivery') ? selected.status : step}</strong><small>{index === 0 ? `${selected.location} · ${selected.updated}` : index === selected.progress ? `Pickup confirmed · ${selected.origin}` : 'Shipment milestone completed'}</small></div></li>)}</ol></div>
					</aside>
				</div>
			</section>}
		</div>
	)
}

function MetricCard({ icon, label, value, onViewData }) {
	return (
		<article className="metric-card">
			<div className="metric-heading">
				<span className="metric-icon"><NavIcon name={icon} /></span>
				<span className="metric-label">{label}</span>
				<button className="metric-more" type="button" onClick={onViewData} aria-label={`View ${label} data`} title="View related data">...</button>
			</div>
			<div className="metric-bottom">
				<strong className="metric-value">{value}</strong>
				<span className="metric-empty-note">Current records</span>
			</div>
		</article>
	)
}

function ShipmentsChart({ shipments }) {
	const now = new Date()
	const months = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1)
		return { date, label: date.toLocaleDateString('en-US', { month: 'short' }), count: 0 }
	})
	shipments.forEach((shipment) => {
		if (!shipment.deliveryDate) return
		const date = new Date(`${shipment.deliveryDate}T12:00:00`)
		const month = months.find((item) => item.date.getMonth() === date.getMonth() && item.date.getFullYear() === date.getFullYear())
		if (month) month.count += 1
	})
	const maxCount = Math.max(...months.map((month) => month.count), 1)
	const points = months.map((month, index) => `${74 + index * 83},${178 - (month.count / maxCount) * 132}`).join(' ')
	const ticks = [34, 82, 130, 178]
	const tickLabels = ticks.map((_, index) => Math.ceil((maxCount * (ticks.length - 1 - index)) / (ticks.length - 1)))

	return (
		<section className="dashboard-panel analytics-panel" aria-labelledby="analytics-title">
			<div className="panel-heading analytics-heading">
				<h2 id="analytics-title">Shipments Analytics</h2>
				<span className="panel-heading-divider" />
				<div className="chart-legend"><span><i className="legend-dot this-year" />Shipments by delivery month</span></div>
			</div>
			<div className="chart-wrap">
				<svg className="shipments-chart" viewBox="0 0 620 250" role="img" aria-label={`Shipment deliveries by month, ${shipments.length} total shipments`}>
					{ticks.map((y, index) => <g key={y}><line className="chart-gridline" x1="47" x2="610" y1={y} y2={y} /><text className="chart-axis-label" x="16" y={y + 4}>{tickLabels[index]}</text></g>)}
					<polyline className="chart-line this-year-line" points={points} />
					{months.map((month, index) => <circle key={`${month.label}-${index}`} className="chart-point" cx={74 + index * 83} cy={178 - (month.count / maxCount) * 132} r="3" />)}
					{months.map((month, index) => <text className="chart-month" key={`${month.label}-${index}`} x={74 + index * 83} y="216">{month.label}</text>)}
				</svg>
			</div>
		</section>
	)
}

function TrackingPanel({ shipment, onOpenTracking }) {
	return (
		<section className="dashboard-panel tracking-panel" aria-labelledby="tracking-title">
			<div className="panel-heading tracking-heading">
				<h2 id="tracking-title">Tracking History</h2>
				{shipment && <button className="tracking-open-link" type="button" onClick={onOpenTracking}>All tracking <span aria-hidden="true">→</span></button>}
			</div>
			{shipment ? (
				<>
					<div className="tracking-id-card">
						<span><small>Tracking ID</small><strong>{shipment.id}</strong></span>
						<span className="tracking-pill">{shipment.status}</span>
					</div>
					<ol className="tracking-timeline">
						<li className="timeline-stop current-stop"><span className="timeline-dot" /><span><small>Current Location</small><strong>{shipment.current}</strong></span></li>
						<li className="timeline-stop"><span className="timeline-dot" /><span><small>Pickup</small><strong>{shipment.origin}</strong></span></li>
						<li className="timeline-stop"><span className="timeline-dot" /><span><small>Destination</small><strong>{shipment.destination}</strong></span></li>
					</ol>
				</>
			) : <p className="panel-empty-state">No tracking data yet.</p>}
		</section>
	)
}

function LocationPanel({ shipments }) {
	const destinations = shipments.reduce((counts, shipment) => {
		const destination = shipment.destination.toLowerCase()
		const country = destination.includes('canada') ? 'canada' : destination.includes('mexico') ? 'mexico' : 'united-states'
		counts[country] += 1
		return counts
	}, { 'united-states': 0, canada: 0, mexico: 0, other: 0 })
	const total = shipments.length
	const percentages = Object.fromEntries(Object.entries(destinations).map(([country, count]) => [country, total ? Math.round((count / total) * 100) : 0]))
	let stop = 0
	const gradient = total
		? Object.entries(percentages).map(([country, percentage]) => {
			const start = stop
			stop += percentage
			return `var(--location-${country}) ${start}% ${stop}%`
		}).join(', ')
		: '#eeedf0 0 100%'

	return (
		<section className="dashboard-panel location-panel" aria-labelledby="location-title">
			<div className="panel-heading"><h2 id="location-title">Traffic by Location</h2></div>
			<div className={`location-chart${total ? '' : ' is-empty'}`} style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Shipment destinations by region, ${total} shipments`} />
			<ul className="location-legend">
				{[['united-states', 'United States'], ['canada', 'Canada'], ['mexico', 'Mexico'], ['other', 'Other']].map(([key, label]) => <li key={key}><i className={`location-dot ${key}`} /><span>{label}</span><strong>{percentages[key]}%</strong></li>)}
			</ul>
		</section>
	)
}

function ShipmentsTable({ shipmentRows }) {
	const [query, setQuery] = useState('')
	const [status, setStatus] = useState('All statuses')
	const [month, setMonth] = useState('All months')
	const filteredRows = shipmentRows.filter((row) => {
		const matchesQuery = `${row.id} ${row.company} ${row.category} ${row.from} ${row.to}`.toLowerCase().includes(query.toLowerCase())
		const matchesStatus = status === 'All statuses' || row.status === status
		const matchesMonth = month === 'All months' || row.month === month
		return matchesQuery && matchesStatus && matchesMonth
	})
	const months = [...new Set(shipmentRows.map((row) => row.month).filter(Boolean))]
	const hasFilters = query !== '' || status !== 'All statuses' || month !== 'All months'

	return (
		<section className="dashboard-panel shipments-panel" id="shipments-data" aria-labelledby="shipments-title" tabIndex={-1}>
			<div className="shipments-toolbar">
				<h2 id="shipments-title">Shipments Data</h2>
				<label className="shipment-search">
					<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
					<input type="search" placeholder="Search id, company, etc" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search shipments" />
				</label>
				<label className="toolbar-select filter-select">
					<span className="select-prefix" aria-hidden="true">Filter</span>
					<select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter shipments by status">
						<option>All statuses</option><option>On Delivery</option><option>Pending</option><option>Completed</option><option>Delayed</option>
					</select>
				</label>
				<label className="toolbar-select date-select">
					<span className="select-prefix" aria-hidden="true">Date</span>
					<select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Select month">
						<option>All months</option>{months.map((item) => <option key={item}>{item}</option>)}
					</select>
				</label>
				{hasFilters && <button className="clear-filters-button" type="button" onClick={() => { setQuery(''); setStatus('All statuses'); setMonth('All months') }}>Clear filters</button>}
			</div>
			<div className="shipments-table-scroll">
				<table className="dashboard-shipments-table">
					<thead><tr><th>Shipping ID</th><th>Company</th><th>Product Category</th><th>Weight</th><th>Route</th><th>Date</th><th>Status</th></tr></thead>
					<tbody>
						{filteredRows.map((row, index) => (
							<tr key={`${row.id}-${row.date}-${index}`}>
								<td className="shipment-id">{row.id}</td><td>{row.company}</td><td>{row.category}</td><td>{row.weight}</td>
								<td><span className="route-from">{row.from}</span><span className="route-to">{row.to}</span></td><td>{row.date}</td>
								<td><span className={`shipment-status status-${row.status.toLowerCase().replace(' ', '-')}`}>{row.status}</span></td>
							</tr>
						))}
						{filteredRows.length === 0 && <tr><td className="empty-table" colSpan="7">{hasFilters ? 'No shipments match your filters.' : 'No shipment data yet.'}</td></tr>}
					</tbody>
				</table>
			</div>
		</section>
	)
}

function EmptyModule({ title, onBack }) {
	const icon = [...primaryItems, ...managementItems].find((item) => item.label === title)?.icon ?? 'dashboard'
	return (
		<section className="dashboard-panel module-empty" aria-live="polite">
			<span className="module-empty-icon"><NavIcon name={icon} /></span>
			<h1>{title}</h1>
			<p>No {title.toLowerCase()} data available yet.</p>
			<button type="button" onClick={onBack}>Back to Dashboard</button>
		</section>
	)
}

function AnalyticsWorkspace({ orders, shipments, shipmentRows }) {
	const delivered = shipments.filter((shipment) => shipment.status === 'Delivered').length
	const inProgress = shipments.filter((shipment) => ['Picked Up', 'In Transit', 'Out for Delivery', 'Delayed'].includes(shipment.status)).length
	const completionRate = shipments.length ? `${Math.round((delivered / shipments.length) * 100)}%` : '0%'

	return (
		<div className="dashboard-content analytics-workspace">
			<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">MANAGEMENT / PERFORMANCE</p><h1>Analytics</h1><p>Shipment activity and fulfillment performance across your operation.</p></div></header>
			<section className="metrics-grid analytics-metrics" aria-label="Operational performance">
				<MetricCard icon="orders" label="Orders" value={orders.length} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="shipments" label="Shipments" value={shipments.length} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="tracking" label="In progress" value={inProgress} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="dashboard" label="Delivered" value={delivered} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<article className="metric-card"><div className="metric-heading"><span className="metric-icon"><NavIcon name="analytics" /></span><span className="metric-label">Completion rate</span></div><div className="metric-bottom"><strong className="metric-value">{completionRate}</strong><span className="metric-empty-note">Delivered shipments</span></div></article>
			</section>
			<section className="insights-grid analytics-insights" aria-label="Shipment analytics">
				<ShipmentsChart shipments={shipments} />
				<LocationPanel shipments={shipments} />
			</section>
			<div id="analytics-shipments"><ShipmentsTable shipmentRows={shipmentRows} /></div>
		</div>
	)
}

function SettingsWorkspace({ settings, saveMessage, onSave }) {
	const [form, setForm] = useState(settings)
	const update = (event) => {
		const { name, value, checked, type } = event.target
		setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
	}

	return (
		<div className="dashboard-content settings-workspace">
			<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">MANAGEMENT / PREFERENCES</p><h1>Settings</h1><p>Manage your workspace details and notification preferences.</p></div></header>
			<section className="dashboard-panel settings-panel" aria-labelledby="settings-title">
				<div className="panel-heading"><h2 id="settings-title">Workspace preferences</h2></div>
				<form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<label className="settings-field">Company name<input name="company" required value={form.company} onChange={update} /></label>
					<label className="settings-field">Time zone<select name="timezone" value={form.timezone} onChange={update}><option value="America/Los_Angeles">Pacific Time</option><option value="America/Denver">Mountain Time</option><option value="America/Chicago">Central Time</option><option value="America/New_York">Eastern Time</option><option value="UTC">UTC</option></select></label>
					<label className="settings-checkbox"><input type="checkbox" name="emailNotifications" checked={form.emailNotifications} onChange={update} /><span><strong>Email notifications</strong><small>Receive updates about shipment status changes.</small></span></label>
					<div className="settings-actions"><p role="status">{saveMessage}</p><button className="settings-save-button" type="submit">Save settings</button></div>
				</form>
			</section>
		</div>
	)
}

export default function Dashboard() {
	const [activePage, setActivePage] = useState(pageFromHash)
	const [showHelp, setShowHelp] = useState(false)
	const [settings, setSettings] = useState(readSettings)
	const [settingsMessage, setSettingsMessage] = useState('')
	const orders = readList(ORDERS_KEY, sampleOrders)
	const shipments = readList(SHIPMENTS_KEY, sampleShipments)
	const shipmentRows = getDashboardRows(shipments, orders)
	const trackingShipments = getTrackingShipments()
	const activeTracking = trackingShipments[0]
	const counts = {
		total: shipments.length,
		pending: orders.filter((order) => order.status === 'Pending').length,
		delivery: shipments.filter((shipment) => ['Picked Up', 'In Transit', 'Out for Delivery', 'Delayed'].includes(shipment.status)).length,
		completed: shipments.filter((shipment) => shipment.status === 'Delivered').length,
	}
	const navigatePage = (label) => {
		const slug = label.toLowerCase().replaceAll(' ', '-')
		window.history.pushState(null, '', label === 'Dashboard' ? '/dashboard' : `/dashboard#${slug}`)
		setActivePage(label)
	}
	const saveSettings = (nextSettings) => {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
			setSettings(nextSettings)
			setSettingsMessage('Settings saved.')
		} catch {
			setSettingsMessage('Settings could not be saved in this browser.')
		}
	}

	useEffect(() => {
		const syncPage = () => setActivePage(pageFromHash())
		window.addEventListener('hashchange', syncPage)
		window.addEventListener('popstate', syncPage)
		return () => {
			window.removeEventListener('hashchange', syncPage)
			window.removeEventListener('popstate', syncPage)
		}
	}, [])

	return (
		<div className="dashboard-layout">
		<aside className="logicraft-sidebar" aria-label="Main sidebar">
			<a className="sidebar-brand" href="/" aria-label="Logicraft home">
				<span className="sidebar-brand-mark" aria-hidden="true"><span /></span>
				<span className="sidebar-brand-name">LOGICRAFT</span>
			</a>

			<div className="sidebar-groups">
				<NavigationGroup title="Main" items={primaryItems} activeLabel={activePage} onSelect={navigatePage} />
				<NavigationGroup title="Management" items={managementItems} activeLabel={activePage} onSelect={navigatePage} />
			</div>

			<footer className="sidebar-footer">
				<button className="sidebar-link sidebar-help-button" type="button" onClick={() => setShowHelp(true)}>
					<span className="sidebar-link-icon"><NavIcon name="help" /></span>
					<span>Help &amp; Support</span>
				</button>
				<div className="sidebar-profile">
					<span className="sidebar-avatar" aria-hidden="true">LC</span>
					<span className="sidebar-profile-label">User Profile</span>
					<button className="sidebar-logout" type="button" onClick={() => window.location.assign('/')} aria-label="Log out and return to home" title="Log out">
						<NavIcon name="logout" />
					</button>
				</div>
			</footer>
		</aside>
		<main className="dashboard-main">
			{activePage === 'Tracking' ? <TrackingDashboard /> : activePage === 'Orders' ? <OrdersDashboard /> : activePage === 'Shipments' ? <ShipmentsDashboard /> : activePage === 'Warehouse' ? <WarehouseDashboard /> : activePage === 'Drivers' ? <DriversDashboard /> : activePage === 'Messages' ? <MessagesDashboard /> : activePage === 'Invoices & Billing' ? <InvoicesDashboard /> : activePage === 'Analytics' ? <AnalyticsWorkspace orders={orders} shipments={shipments} shipmentRows={shipmentRows} /> : activePage === 'Settings' ? <SettingsWorkspace settings={settings} saveMessage={settingsMessage} onSave={saveSettings} /> : activePage === 'Dashboard' ? <div className="dashboard-content" id="dashboard-overview">
				<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">LOGICRAFT / OPERATIONS</p><h1>Dashboard</h1><p>Your orders, shipments, and delivery activity at a glance.</p></div><div className="dashboard-quick-actions"><button type="button" onClick={() => navigatePage('Orders')}>Manage orders</button><button type="button" onClick={() => navigatePage('Shipments')}>Manage shipments</button></div></header>
				<section className="metrics-grid" aria-label="Shipment overview">
					<MetricCard icon="shipments" label="Total Shipments" value={counts.total} onViewData={() => navigatePage('Shipments')} />
					<MetricCard icon="tracking" label="Pending Orders" value={counts.pending} onViewData={() => navigatePage('Orders')} />
					<MetricCard icon="warehouse" label="In Delivery" value={counts.delivery} onViewData={() => navigatePage('Tracking')} />
					<MetricCard icon="dashboard" label="Completed" value={counts.completed} onViewData={() => navigatePage('Shipments')} />
				</section>
				<section className="insights-grid" aria-label="Shipment insights">
					<ShipmentsChart shipments={shipments} />
					<TrackingPanel shipment={activeTracking} onOpenTracking={() => navigatePage('Tracking')} />
					<LocationPanel shipments={shipments} />
				</section>
				<ShipmentsTable shipmentRows={shipmentRows} />
			</div> : <EmptyModule title={activePage} onBack={() => navigatePage('Dashboard')} />}
		</main>
		{showHelp && <div className="dashboard-dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowHelp(false) }}><section className="dashboard-help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><h2 id="help-title">Help &amp; Support</h2><p>Support details will be available here when they are configured.</p><button type="button" onClick={() => setShowHelp(false)}>Close</button></section></div>}
		</div>
	)
}
```

### `src/Drivers.jsx`

```jsx
import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const DRIVERS_KEY = 'logicraft-drivers-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const VEHICLES = ['VAN-204 · Box truck', 'VAN-118 · Cargo van', 'TRK-053 · Semi truck', 'VAN-092 · Box truck', 'VAN-311 · Refrigerated van']

const sampleDrivers = [
	{ id: 'DRV-032', name: 'Christina Kamberina', phone: '+1 (312) 555-0184', email: 'christina.k@logicraft.example', licenseNumber: 'IL-C4821-3904', licenseClass: 'Class A', licenseExpiry: '2028-04-18', availability: 'Available', vehicle: 'VAN-204 · Box truck', completedTrips: 86, onTimeRate: 96, rating: 4.9, tripHistory: [{ shipmentId: 'SHP-2026-08421', route: 'Newark, NJ → Chicago, IL', status: 'In Transit', date: 'Oct 01, 2026' }, { shipmentId: 'SHP-2026-08214', route: 'Detroit, MI → Cleveland, OH', status: 'Delivered', date: 'Sep 28, 2026' }, { shipmentId: 'SHP-2026-08183', route: 'Milwaukee, WI → Chicago, IL', status: 'Delivered', date: 'Sep 25, 2026' }] },
	{ id: 'DRV-018', name: 'Daniel Brooks', phone: '+1 (617) 555-0127', email: 'daniel.b@logicraft.example', licenseNumber: 'MA-B1377-8540', licenseClass: 'Class B', licenseExpiry: '2027-11-02', availability: 'Available', vehicle: 'VAN-118 · Cargo van', completedTrips: 54, onTimeRate: 93, rating: 4.8, tripHistory: [{ shipmentId: 'SHP-2026-07950', route: 'New York, NY → Boston, MA', status: 'Delivered', date: 'Sep 22, 2026' }, { shipmentId: 'SHP-2026-07881', route: 'Providence, RI → Boston, MA', status: 'Delivered', date: 'Sep 19, 2026' }] },
	{ id: 'DRV-053', name: 'Marcus Lee', phone: '+1 (512) 555-0166', email: 'marcus.lee@logicraft.example', licenseNumber: 'TX-A9012-1473', licenseClass: 'Class A', licenseExpiry: '2029-01-15', availability: 'Off Duty', vehicle: 'TRK-053 · Semi truck', completedTrips: 112, onTimeRate: 89, rating: 4.7, tripHistory: [{ shipmentId: 'SHP-2026-07718', route: 'Dallas, TX → Houston, TX', status: 'Delivered', date: 'Sep 17, 2026' }, { shipmentId: 'SHP-2026-07595', route: 'Austin, TX → San Antonio, TX', status: 'Delivered', date: 'Sep 12, 2026' }] },
	{ id: 'DRV-092', name: 'Avery Chen', phone: '+1 (206) 555-0141', email: 'avery.chen@logicraft.example', licenseNumber: 'WA-C2044-6218', licenseClass: 'Class C', licenseExpiry: '2028-08-30', availability: 'Available', vehicle: 'VAN-092 · Box truck', completedTrips: 68, onTimeRate: 98, rating: 5.0, tripHistory: [{ shipmentId: 'SHP-2026-08396', route: 'Portland, OR → Seattle, WA', status: 'Delivered', date: 'Oct 01, 2026' }, { shipmentId: 'SHP-2026-08220', route: 'Tacoma, WA → Seattle, WA', status: 'Delivered', date: 'Sep 27, 2026' }] },
	{ id: 'DRV-311', name: 'Nina Patel', phone: '+1 (215) 555-0178', email: 'nina.patel@logicraft.example', licenseNumber: 'PA-B6204-0351', licenseClass: 'Class B', licenseExpiry: '2027-06-21', availability: 'Available', vehicle: 'VAN-311 · Refrigerated van', completedTrips: 42, onTimeRate: 94, rating: 4.8, tripHistory: [{ shipmentId: 'SHP-2026-08111', route: 'Baltimore, MD → Philadelphia, PA', status: 'Delivered', date: 'Sep 24, 2026' }] },
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function nowLabel() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function DriverAvailability({ status }) {
	return <span className={`driver-availability driver-availability-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>
}

function DriverForm({ driver, onClose, onSave }) {
	const [form, setForm] = useState(() => driver ?? { name: '', phone: '', email: '', licenseNumber: '', licenseClass: 'Class B', licenseExpiry: '', availability: 'Available', vehicle: 'Unassigned' })
	const setValue = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

	return (
		<div className="drivers-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="drivers-modal" role="dialog" aria-modal="true" aria-labelledby="driver-form-title">
				<header className="drivers-modal-heading"><div><span className="drivers-kicker">FLEET / {driver ? 'PROFILE UPDATE' : 'NEW PROFILE'}</span><h2 id="driver-form-title">{driver ? 'Edit driver' : 'Add driver'}</h2></div><button className="drivers-icon-button" type="button" onClick={onClose} aria-label="Close driver form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<div className="drivers-form-grid"><label className="drivers-field">Full name<input name="name" value={form.name} onChange={setValue} required placeholder="Driver name" /></label><label className="drivers-field">Phone<input name="phone" type="tel" value={form.phone} onChange={setValue} required placeholder="+1 (555) 000-0000" /></label><label className="drivers-field">Email<input name="email" type="email" value={form.email} onChange={setValue} placeholder="driver@example.com" /></label><label className="drivers-field">License number<input name="licenseNumber" value={form.licenseNumber} onChange={setValue} required placeholder="License ID" /></label><label className="drivers-field">License class<select name="licenseClass" value={form.licenseClass} onChange={setValue}><option>Class A</option><option>Class B</option><option>Class C</option></select></label><label className="drivers-field">License expiry<input name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={setValue} required /></label><label className="drivers-field">Availability<select name="availability" value={form.availability} onChange={setValue}><option>Available</option><option>Off Duty</option></select></label><label className="drivers-field">Assigned vehicle<select name="vehicle" value={form.vehicle} onChange={setValue}><option>Unassigned</option>{VEHICLES.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select></label></div>
					<footer className="drivers-form-actions"><button className="drivers-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="drivers-primary-button" type="submit">{driver ? 'Save driver' : 'Add driver'}</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function DriversDashboard() {
	const [drivers, setDrivers] = useState(() => readList(DRIVERS_KEY, sampleDrivers))
	const [shipments, setShipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [selectedId, setSelectedId] = useState(() => readList(DRIVERS_KEY, sampleDrivers)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [availabilityFilter, setAvailabilityFilter] = useState('All')
	const [formOpen, setFormOpen] = useState(false)
	const [editingDriver, setEditingDriver] = useState(null)
	const [assignmentShipment, setAssignmentShipment] = useState('')
	const [assignmentVehicle, setAssignmentVehicle] = useState('')

	useEffect(() => { try { localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers)) } catch {} }, [drivers])
	useEffect(() => { try { localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(shipments)) } catch {} }, [shipments])

	const activeShipmentStatuses = ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delayed']
	const tripFor = (driver) => shipments.find((shipment) => shipment.driver === driver.name && activeShipmentStatuses.includes(shipment.status))
	const filteredDrivers = drivers.filter((driver) => {
		const status = tripFor(driver) ? 'On Trip' : driver.availability
		return `${driver.name} ${driver.phone} ${driver.email} ${driver.licenseNumber} ${driver.vehicle}`.toLowerCase().includes(query.trim().toLowerCase())
			&& (availabilityFilter === 'All' || (availabilityFilter === 'On Trip' ? Boolean(tripFor(driver)) : status === availabilityFilter))
	})
	const selectedDriver = filteredDrivers.find((driver) => driver.id === selectedId) ?? filteredDrivers[0]
	const activeDriverCount = drivers.filter((driver) => driver.availability === 'Available' && !tripFor(driver)).length
	const onTripCount = drivers.filter((driver) => Boolean(tripFor(driver))).length
	const completedTrips = drivers.reduce((sum, driver) => sum + driver.completedTrips, 0)
	const performance = Math.round(drivers.reduce((sum, driver) => sum + driver.onTimeRate, 0) / Math.max(drivers.length, 1))
	const currentTrip = selectedDriver ? tripFor(selectedDriver) : null
	const pastTrips = selectedDriver?.tripHistory.filter((trip) => trip.shipmentId !== currentTrip?.id) ?? []
	const assignableShipments = shipments.filter((shipment) => activeShipmentStatuses.includes(shipment.status))

	const saveDriver = (form) => {
		if (editingDriver) {
			setDrivers((current) => current.map((driver) => driver.id === editingDriver.id ? { ...driver, ...form } : driver))
			const linkedShipments = shipments.map((shipment) => shipment.driver === editingDriver.name ? { ...shipment, driver: form.name, vehicle: form.vehicle } : shipment)
			setShipments(linkedShipments)
			const orders = readList(ORDERS_KEY, sampleOrders)
			const updatedOrders = orders.map((order) => {
				const shipment = linkedShipments.find((item) => item.orderId === order.id && item.driver === form.name)
				return shipment ? { ...order, driver: form.name, vehicle: form.vehicle } : order
			})
			try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
		} else {
			const driver = { ...form, id: `DRV-${String(Date.now()).slice(-3)}`, completedTrips: 0, onTimeRate: 100, rating: 5, tripHistory: [] }
			setDrivers((current) => [driver, ...current])
			setSelectedId(driver.id)
		}
		setFormOpen(false)
		setEditingDriver(null)
	}

	const assignShipment = (event) => {
		event.preventDefault()
		if (!selectedDriver || !assignmentShipment || selectedDriver.availability !== 'Available' || currentTrip) return
		const shipment = shipments.find((item) => item.id === assignmentShipment)
		if (!shipment) return
		const nextShipment = {
			...shipment,
			driver: selectedDriver.name,
			vehicle: assignmentVehicle || selectedDriver.vehicle || 'Unassigned',
			history: [{ status: 'Driver assignment updated', date: nowLabel(), location: `${selectedDriver.name} · ${assignmentVehicle || selectedDriver.vehicle}` }, ...(shipment.history ?? [])],
		}
		setShipments((current) => current.map((item) => item.id === shipment.id ? nextShipment : item))
		const orders = readList(ORDERS_KEY, sampleOrders)
		const updatedOrders = orders.map((order) => order.id === shipment.orderId ? { ...order, driver: nextShipment.driver, vehicle: nextShipment.vehicle, shipment: shipment.id, tracking: shipment.tracking, history: [{ label: 'Shipment assigned', date: nowLabel(), note: `${shipment.id} · ${nextShipment.driver} · ${nextShipment.vehicle}` }, ...(order.history ?? [])] } : order)
		try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
		setDrivers((current) => current.map((driver) => driver.id === selectedDriver.id ? { ...driver, vehicle: nextShipment.vehicle } : driver))
		setAssignmentShipment('')
	}

	return (
		<div className="drivers-workspace">
			<header className="drivers-page-heading"><div><span className="drivers-kicker">OPERATIONS / FLEET DIRECTORY</span><h1>Drivers</h1><p>People, vehicles, and trips across your fleet.</p></div><button className="drivers-primary-button" type="button" onClick={() => { setEditingDriver(null); setFormOpen(true) }}><span aria-hidden="true">＋</span> Add driver</button></header>

			<section className="drivers-summary-grid" aria-label="Driver overview">
				{[
					['Total drivers', drivers.length, 'Profiles in the directory', 'total'],
					['Available', activeDriverCount, 'Ready for assignment', 'available'],
					['On trip', onTripCount, 'Currently on active shipments', 'trip'],
					['Completed trips', completedTrips, 'Across the driver team', 'completed'],
					['On-time performance', `${performance}%`, 'Average delivery rate', 'performance'],
				].map(([label, value, note, tone]) => <article className={`drivers-glass-card drivers-stat drivers-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="drivers-content-grid">
				<section className="drivers-glass-card drivers-list-panel" aria-labelledby="drivers-list-title">
					<div className="drivers-section-heading"><div><h2 id="drivers-list-title">Driver directory</h2><p>{filteredDrivers.length} of {drivers.length} drivers</p></div><span className="drivers-register-mark">FLEET ROSTER <b>/{String(filteredDrivers.length).padStart(2, '0')}</b></span></div>
					<div className="drivers-filters"><label className="drivers-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search driver, phone, license" aria-label="Search drivers" /></label><label className="drivers-filter-field"><span>Availability</span><select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option>All</option><option>Available</option><option>On Trip</option><option>Off Duty</option></select></label></div>
					<div className="drivers-table-scroll"><table className="drivers-table"><thead><tr><th>Driver</th><th>Contact</th><th>License</th><th>Vehicle</th><th>Current trip</th><th>Status</th></tr></thead><tbody>
						{filteredDrivers.map((driver) => { const trip = tripFor(driver); return <tr key={driver.id} className={selectedDriver?.id === driver.id ? 'is-selected' : ''}><td><button type="button" className="driver-select-button" onClick={() => setSelectedId(driver.id)}><span className="driver-table-avatar">{driver.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{driver.name}</strong><small>{driver.id}</small></span></button></td><td><strong>{driver.phone}</strong><span>{driver.email}</span></td><td><strong>{driver.licenseClass}</strong><span>{driver.licenseNumber}</span></td><td><strong>{driver.vehicle}</strong></td><td><strong>{trip?.id ?? '—'}</strong><span>{trip ? `${trip.pickup.split(',')[0]} → ${trip.destination.split(',')[0]}` : 'No active trip'}</span></td><td><DriverAvailability status={trip ? 'On Trip' : driver.availability} /></td></tr> })}
						{filteredDrivers.length === 0 && <tr><td className="drivers-empty-row" colSpan="6">No drivers match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selectedDriver ? <aside className="drivers-glass-card drivers-detail-panel" aria-labelledby="driver-detail-title">
					<div className="drivers-detail-heading"><span className="driver-detail-avatar">{selectedDriver.name.split(' ').map((part) => part[0]).join('')}</span><div><span className="drivers-kicker">DRIVER PROFILE / {selectedDriver.id}</span><h2 id="driver-detail-title">{selectedDriver.name}</h2><p>{selectedDriver.email}</p></div><button className="drivers-icon-button" type="button" onClick={() => { setEditingDriver(selectedDriver); setFormOpen(true) }} aria-label="Edit driver profile" title="Edit driver"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19.8 7.7a2.1 2.1 0 0 0-3-3L4 16.5Z" /><path d="m14.9 6.6 3 3" /></svg></button></div>
					<div className="drivers-profile-status"><DriverAvailability status={currentTrip ? 'On Trip' : selectedDriver.availability} /><span>{selectedDriver.completedTrips} completed trips</span></div>
					<div className="drivers-detail-section"><h3>Contact &amp; license</h3><div className="drivers-facts"><span>Phone<strong>{selectedDriver.phone}</strong></span><span>Email<strong>{selectedDriver.email}</strong></span><span>License<strong>{selectedDriver.licenseClass} · {selectedDriver.licenseNumber}</strong></span><span>Expires<strong>{new Date(`${selectedDriver.licenseExpiry}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span><span>Assigned vehicle<strong>{selectedDriver.vehicle}</strong></span></div></div>
					{currentTrip && <div className="drivers-current-trip"><span className="drivers-kicker">CURRENT TRIP</span><strong>{currentTrip.id} · {currentTrip.orderId}</strong><span>{currentTrip.pickup} → {currentTrip.destination}</span><span>Tracking {currentTrip.tracking} · {currentTrip.status}</span><span>ETA · {currentTrip.eta}</span></div>}
					<div className="drivers-performance"><div><h3>Performance</h3><strong>{selectedDriver.onTimeRate}% <small>on-time</small></strong></div><div className="drivers-performance-track"><i style={{ width: `${selectedDriver.onTimeRate}%` }} /></div><span>★ {selectedDriver.rating.toFixed(1)} driver rating · {selectedDriver.completedTrips} trips completed</span></div>
					<div className="drivers-assign-section"><h3>Assign shipment &amp; vehicle</h3><form onSubmit={assignShipment}><label className="drivers-field">Shipment<select disabled={selectedDriver.availability !== 'Available' || Boolean(currentTrip)} value={assignmentShipment} onChange={(event) => { const shipment = shipments.find((item) => item.id === event.target.value); setAssignmentShipment(event.target.value); setAssignmentVehicle(shipment?.vehicle && shipment.vehicle !== 'Not assigned' ? shipment.vehicle : selectedDriver.vehicle) }}><option value="">Choose an active shipment</option>{assignableShipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} · {shipment.customer}</option>)}</select></label><label className="drivers-field">Vehicle<select disabled={selectedDriver.availability !== 'Available' || Boolean(currentTrip)} value={assignmentVehicle || selectedDriver.vehicle} onChange={(event) => setAssignmentVehicle(event.target.value)}>{VEHICLES.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select></label><button className="drivers-secondary-button" type="submit" disabled={!assignmentShipment || selectedDriver.availability !== 'Available' || Boolean(currentTrip)}>Assign to trip</button></form>{(selectedDriver.availability !== 'Available' || currentTrip) && <p className="drivers-assignment-note">Only available drivers without an active trip can be assigned.</p>}</div>
					<div className="drivers-history-section"><div className="drivers-history-heading"><h3>Trip history</h3><span>{pastTrips.length + (currentTrip ? 1 : 0)} records</span></div><ol className="drivers-history">{currentTrip && <li className="is-current"><i /><div><strong>{currentTrip.id} · {currentTrip.status}</strong><span>{currentTrip.pickup} → {currentTrip.destination}</span></div><time>{currentTrip.deliveryDate}</time></li>}{pastTrips.map((trip, index) => <li key={`${trip.shipmentId}-${index}`}><i /><div><strong>{trip.shipmentId} · {trip.status}</strong><span>{trip.route}</span></div><time>{trip.date}</time></li>)}</ol></div>
				</aside> : <aside className="drivers-glass-card drivers-empty-detail"><strong>No driver selected</strong><span>Change filters or add a driver profile.</span></aside>}
			</div>
			{formOpen && <DriverForm driver={editingDriver} onClose={() => { setFormOpen(false); setEditingDriver(null) }} onSave={saveDriver} />}
		</div>
	)
}
```

### `src/index.css`

```css
:root {
  --text: #6b6375;
  --text-h: #08060d;
  --bg: #fff;
  --border: #e5e4e7;
  --code-bg: #f4f3ec;
  --accent: #aa3bff;
  --accent-bg: rgba(170, 59, 255, 0.1);
  --accent-border: rgba(170, 59, 255, 0.5);
  --social-bg: rgba(244, 243, 236, 0.5);
  --shadow:
    rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.05) 0 4px 6px -2px;

  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  --heading: system-ui, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, Consolas, monospace;

  font: 18px/145% var(--sans);
  letter-spacing: 0.18px;
  color-scheme: light;
  color: var(--text);
  background: var(--bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (max-width: 1024px) {
    font-size: 16px;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #9ca3af;
    --text-h: #f3f4f6;
    --bg: #16171d;
    --border: #2e303a;
    --code-bg: #1f2028;
    --accent: #c084fc;
    --accent-bg: rgba(192, 132, 252, 0.15);
    --accent-border: rgba(192, 132, 252, 0.5);
    --social-bg: rgba(47, 48, 58, 0.5);
    --shadow:
      rgba(0, 0, 0, 0.4) 0 10px 15px -3px, rgba(0, 0, 0, 0.25) 0 4px 6px -2px;
  }

  #social .button-icon {
    filter: invert(1) brightness(2);
  }
}

body {
  margin: 0;
}

#root {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

h1,
h2 {
  font-family: var(--heading);
  font-weight: 500;
  color: var(--text-h);
}

h1 {
  font-size: 56px;
  letter-spacing: -1.68px;
  margin: 32px 0;
  @media (max-width: 1024px) {
    font-size: 36px;
    margin: 20px 0;
  }
}
h2 {
  font-size: 24px;
  line-height: 118%;
  letter-spacing: -0.24px;
  margin: 0 0 8px;
  @media (max-width: 1024px) {
    font-size: 20px;
  }
}
p {
  margin: 0;
}

code,
.counter {
  font-family: var(--mono);
  display: inline-flex;
  border-radius: 4px;
  color: var(--text-h);
}

code {
  font-size: 15px;
  line-height: 135%;
  padding: 4px 8px;
  background: var(--code-bg);
}
.backend-connection {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.94);
  color: #e2e8f0;
  box-shadow: 0 8px 26px rgba(15, 23, 42, 0.2);
  font: 500 12px/1.2 Inter, system-ui, sans-serif;
}

.backend-connection-indicator {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #fbbf24;
}

.backend-connection-connected .backend-connection-indicator {
  background: #34d399;
}

.backend-connection-offline .backend-connection-indicator {
  background: #fb7185;
}

.backend-connection button {
  border: 0;
  border-radius: 999px;
  padding: 5px 10px;
  background: #e2e8f0;
  color: #0f172a;
  font: inherit;
  cursor: pointer;
}
```

### `src/Invoices.jsx`

```jsx
import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const INVOICES_KEY = 'logicraft-invoices-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'

const sampleInvoices = [
	{
		id: 'INV-2026-00918', orderId: 'ORD-2026-10438', customer: 'Evergreen Supply Co.', amount: 8420.5, currency: 'USD',
		issuedOn: '2026-09-20', dueOn: '2026-09-27', status: 'Paid', paidOn: '2026-09-25', memo: 'Freight service · Portland to Seattle',
		history: [{ action: 'Payment received', date: 'Sep 25, 2026', detail: 'Paid in full · ACH transfer' }, { action: 'Invoice sent', date: 'Sep 20, 2026', detail: 'Invoice delivered to warehouse@evergreen.example' }],
	},
	{
		id: 'INV-2026-00924', orderId: 'ORD-2026-10482', customer: 'Northstar Retail', amount: 3675, currency: 'USD',
		issuedOn: '2026-10-01', dueOn: '2026-10-15', status: 'Pending', paidOn: '', memo: 'Line-haul freight · Newark to Chicago',
		history: [{ action: 'Invoice sent', date: 'Oct 01, 2026', detail: 'Invoice delivered to ops@northstar.example' }],
	},
	{
		id: 'INV-2026-00897', orderId: 'ORD-2026-10476', customer: 'Harbor & Pine', amount: 2180, currency: 'USD',
		issuedOn: '2026-09-16', dueOn: '2026-09-30', status: 'Pending', paidOn: '', memo: 'Home goods freight · Queens to Boston',
		history: [{ action: 'Payment reminder sent', date: 'Oct 01, 2026', detail: 'Payment due date has passed' }, { action: 'Invoice sent', date: 'Sep 16, 2026', detail: 'Invoice delivered to logistics@harborpine.example' }],
	},
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function localDate() {
	const today = new Date()
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function shortDate(value) {
	if (!value) return '—'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(amount, currency = 'USD') {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0)
}

function formatTimestamp() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function invoiceStatus(invoice) {
	return invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.dueOn < localDate() ? 'Overdue' : invoice.status
}

function InvoiceStatus({ status }) {
	return <span className={`billing-status billing-status-${status.toLowerCase()}`}><i />{status}</span>
}

function InvoiceDialog({ orders, invoices, onClose, onCreate }) {
	const availableOrders = orders.filter((order) => order.status !== 'Cancelled')
	const [orderId, setOrderId] = useState(availableOrders[0]?.id ?? '')
	const [amount, setAmount] = useState('')
	const [issuedOn, setIssuedOn] = useState(localDate())
	const [dueOn, setDueOn] = useState('')
	const [memo, setMemo] = useState('')
	const selectedOrder = availableOrders.find((order) => order.id === orderId)

	return (
		<div className="billing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="billing-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-form-title">
				<header className="billing-modal-heading"><div><span className="billing-kicker">ACCOUNTS RECEIVABLE / NEW</span><h2 id="invoice-form-title">Create invoice</h2></div><button className="billing-icon-button" type="button" onClick={onClose} aria-label="Close invoice form">×</button></header>
				{availableOrders.length ? <form onSubmit={(event) => { event.preventDefault(); if (selectedOrder) onCreate(selectedOrder, { amount: Number(amount), issuedOn, dueOn, memo }) }}>
					<label className="billing-field">Order<select required value={orderId} onChange={(event) => setOrderId(event.target.value)}>{availableOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.customer}</option>)}</select></label>
					{selectedOrder && <div className="billing-order-preview"><span><small>BILL TO</small><strong>{selectedOrder.customer}</strong></span><span><small>ORDER</small><strong>{selectedOrder.id}</strong></span><span><small>ROUTE</small><strong>{selectedOrder.pickup} → {selectedOrder.delivery}</strong></span><span><small>ITEM</small><strong>{selectedOrder.item} · {selectedOrder.quantity} units</strong></span><small className="billing-existing-invoices">{invoices.filter((invoice) => invoice.orderId === selectedOrder.id).length ? `${invoices.filter((invoice) => invoice.orderId === selectedOrder.id).length} existing invoice(s). Supplemental invoices are supported.` : 'No previous invoices for this order.'}</small></div>}
					<div className="billing-form-grid"><label className="billing-field">Invoice amount (USD)<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label><label className="billing-field">Invoice date<input type="date" required value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} /></label><label className="billing-field">Payment due<input type="date" required min={issuedOn} value={dueOn} onChange={(event) => setDueOn(event.target.value)} /></label><label className="billing-field billing-field-wide">Description<input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Freight service or billing note" /></label></div>
					<footer className="billing-form-actions"><button className="billing-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="billing-primary-button" type="submit">Create invoice</button></footer>
				</form> : <div className="billing-no-orders"><strong>No billable orders available</strong><span>Only non-cancelled orders can be invoiced.</span><button className="billing-secondary-button" type="button" onClick={onClose}>Close</button></div>}
			</section>
		</div>
	)
}

export default function InvoicesDashboard() {
	const [invoices, setInvoices] = useState(() => readList(INVOICES_KEY, sampleInvoices))
	const [orders] = useState(() => readList(ORDERS_KEY, sampleOrders))
	const [shipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [selectedId, setSelectedId] = useState(() => readList(INVOICES_KEY, sampleInvoices)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [issuedDateFilter, setIssuedDateFilter] = useState('')
	const [dialogOpen, setDialogOpen] = useState(false)

	useEffect(() => { try { localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices)) } catch {} }, [invoices])

	const enrichedInvoices = invoices.map((invoice) => ({ ...invoice, displayStatus: invoiceStatus(invoice) }))
	const filteredInvoices = enrichedInvoices.filter((invoice) => {
		const matchesQuery = `${invoice.id} ${invoice.orderId} ${invoice.customer}`.toLowerCase().includes(query.trim().toLowerCase())
		return matchesQuery && (statusFilter === 'All' || invoice.displayStatus === statusFilter) && (!issuedDateFilter || invoice.issuedOn === issuedDateFilter)
	})
	const selected = filteredInvoices.find((invoice) => invoice.id === selectedId) ?? filteredInvoices[0]
	const totals = {
		all: invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		paid: invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		pending: invoices.filter((invoice) => invoiceStatus(invoice) === 'Pending').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		overdue: invoices.filter((invoice) => invoiceStatus(invoice) === 'Overdue').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
	}
	const counts = {
		total: invoices.length,
		paid: invoices.filter((invoice) => invoice.status === 'Paid').length,
		pending: invoices.filter((invoice) => invoiceStatus(invoice) === 'Pending').length,
		overdue: invoices.filter((invoice) => invoiceStatus(invoice) === 'Overdue').length,
	}
	const reportTotal = totals.paid + totals.pending + totals.overdue
	const invoiceableOrders = orders.filter((order) => order.status !== 'Cancelled')

	const createInvoice = (order, details) => {
		const invoice = {
			id: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
			orderId: order.id,
			customer: order.customer,
			amount: details.amount,
			currency: 'USD',
			issuedOn: details.issuedOn,
			dueOn: details.dueOn,
			status: 'Pending',
			paidOn: '',
			memo: details.memo || `Freight service · ${order.pickup} to ${order.delivery}`,
			history: [{ action: 'Invoice created', date: formatTimestamp(), detail: `Invoice sent for ${formatMoney(details.amount)}` }],
		}
		setInvoices((current) => [invoice, ...current])
		setSelectedId(invoice.id)
		setQuery('')
		setStatusFilter('All')
		setIssuedDateFilter('')
		setDialogOpen(false)
	}

	const markPaid = (invoice) => {
		if (invoice.status === 'Paid') return
		const paidOn = localDate()
		setInvoices((current) => current.map((entry) => entry.id === invoice.id ? {
			...entry,
			status: 'Paid',
			paidOn,
			history: [{ action: 'Payment received', date: formatTimestamp(), detail: `Paid in full · ${formatMoney(entry.amount)}` }, ...entry.history],
		} : entry))
	}

	return (
		<div className="billing-workspace">
			<header className="billing-page-heading"><div><span className="billing-kicker">OPERATIONS / ACCOUNTS RECEIVABLE</span><h1>Invoices &amp; Billing</h1><p>Invoice records, payment status, and customer balances.</p></div><button className="billing-primary-button" type="button" onClick={() => setDialogOpen(true)}><span aria-hidden="true">＋</span> Create invoice <small>{invoiceableOrders.length} billable orders</small></button></header>

			<section className="billing-summary-grid" aria-label="Billing overview">
				{[
					['Total invoices', counts.total, formatMoney(totals.all), 'total'],
					['Paid invoices', counts.paid, formatMoney(totals.paid), 'paid'],
					['Pending payments', counts.pending, formatMoney(totals.pending), 'pending'],
					['Overdue invoices', counts.overdue, formatMoney(totals.overdue), 'overdue'],
				].map(([label, count, amount, tone]) => <article className={`billing-glass-card billing-stat billing-stat-${tone}`} key={tone}><span>{label}</span><strong>{count}</strong><small>{amount}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="billing-main-grid">
				<section className="billing-glass-card billing-register" aria-labelledby="invoice-register-title">
					<div className="billing-section-heading"><div><h2 id="invoice-register-title">Invoice register</h2><p>{filteredInvoices.length} of {invoices.length} invoices</p></div><span className="billing-register-mark">BILLING LOG <b>/{String(filteredInvoices.length).padStart(2, '0')}</b></span></div>
					<div className="billing-filters"><label className="billing-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, order, customer" aria-label="Search invoices" /></label><label className="billing-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Overdue</option></select></label><label className="billing-filter-field"><span>Invoice date</span><input type="date" value={issuedDateFilter} onChange={(event) => setIssuedDateFilter(event.target.value)} aria-label="Filter by invoice date" /></label>{(query || statusFilter !== 'All' || issuedDateFilter) && <button className="billing-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setIssuedDateFilter('') }}>Reset</button>}</div>
					<div className="billing-table-scroll"><table className="billing-table"><thead><tr><th>Invoice</th><th>Customer / Order</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>
						{filteredInvoices.map((invoice) => <tr key={invoice.id} className={selected?.id === invoice.id ? 'is-selected' : ''}><td><button type="button" className="billing-select-button" onClick={() => setSelectedId(invoice.id)}><strong>{invoice.id}</strong><span>{invoice.memo}</span></button></td><td><strong>{invoice.customer}</strong><span>{invoice.orderId}</span></td><td>{shortDate(invoice.issuedOn)}</td><td>{shortDate(invoice.dueOn)}</td><td><strong>{formatMoney(invoice.amount, invoice.currency)}</strong></td><td><InvoiceStatus status={invoice.displayStatus} /></td></tr>)}
						{filteredInvoices.length === 0 && <tr><td className="billing-empty-row" colSpan="6">No invoices match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selected ? <aside className="billing-glass-card billing-detail-panel" aria-labelledby="invoice-detail-title">
					<div className="billing-detail-heading"><div><span className="billing-kicker">INVOICE DETAILS</span><h2 id="invoice-detail-title">{selected.id}</h2><p>{selected.orderId} · {selected.customer}</p></div><InvoiceStatus status={selected.displayStatus} /></div>
					<div className="billing-amount-block"><span>AMOUNT DUE</span><strong>{formatMoney(selected.amount, selected.currency)}</strong><small>{selected.status === 'Paid' ? `Paid ${shortDate(selected.paidOn)}` : `Due ${shortDate(selected.dueOn)}`}</small></div>
					<div className="billing-detail-facts"><span>Bill to<strong>{selected.customer}</strong></span><span>Order<strong>{selected.orderId}</strong></span><span>Invoice date<strong>{shortDate(selected.issuedOn)}</strong></span><span>Payment due<strong>{shortDate(selected.dueOn)}</strong></span><span>Shipment<strong>{shipments.find((shipment) => shipment.orderId === selected.orderId)?.id ?? orders.find((order) => order.id === selected.orderId)?.shipment ?? 'Not assigned'}</strong></span><span>Tracking<strong>{shipments.find((shipment) => shipment.orderId === selected.orderId)?.tracking ?? orders.find((order) => order.id === selected.orderId)?.tracking ?? 'Not assigned'}</strong></span></div>
					<p className="billing-memo">{selected.memo}</p>
					{selected.status !== 'Paid' && <button className="billing-mark-paid-button" type="button" onClick={() => markPaid(selected)}>Mark as paid</button>}
					<div className="billing-history"><div className="billing-history-heading"><h3>Billing history</h3><span>{selected.history.length} events</span></div><ol>{selected.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.action}-${entry.date}-${index}`}><i /><div><strong>{entry.action}</strong><span>{entry.detail}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="billing-glass-card billing-empty-detail"><strong>No invoice selected</strong><span>Create an invoice or adjust the filters.</span></aside>}
			</div>

			<section className="billing-glass-card billing-report" aria-labelledby="billing-report-title"><div className="billing-section-heading"><div><h2 id="billing-report-title">Payment report</h2><p>Invoice value by payment state</p></div><span className="billing-report-period">CURRENT INVOICE BOOK</span></div><div className="billing-report-content"><div className="billing-report-bar" role="img" aria-label={`Paid ${formatMoney(totals.paid)}, pending ${formatMoney(totals.pending)}, overdue ${formatMoney(totals.overdue)}`}><i className="report-paid" style={{ width: `${reportTotal ? totals.paid / reportTotal * 100 : 0}%` }} /><i className="report-pending" style={{ width: `${reportTotal ? totals.pending / reportTotal * 100 : 0}%` }} /><i className="report-overdue" style={{ width: `${reportTotal ? totals.overdue / reportTotal * 100 : 0}%` }} /></div><div className="billing-report-legend"><span><i className="report-paid-dot" />Paid<strong>{formatMoney(totals.paid)}</strong></span><span><i className="report-pending-dot" />Pending<strong>{formatMoney(totals.pending)}</strong></span><span><i className="report-overdue-dot" />Overdue<strong>{formatMoney(totals.overdue)}</strong></span><span className="billing-report-total">Total billed<strong>{formatMoney(reportTotal)}</strong></span></div></div></section>
			{dialogOpen && <InvoiceDialog orders={invoiceableOrders} invoices={invoices} onClose={() => setDialogOpen(false)} onCreate={createInvoice} />}
		</div>
	)
}
```

### `src/landing.css`

```css
/* Landing Page Hero Styles (Matching Figma Desktop 1440x1041) */

.landing-page {
  min-height: 100vh;
  width: 100%;
  background-color: #ffffff;
  color: #0f172a;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter',
    system-ui, sans-serif;
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}

/* Hero Section with exact Figma spacing */
.hero-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  /* Keep the hero headline directly below the navbar. */
  padding-top: 52px;
  /* Bottom spacing: 64px on desktop, responsive clamp */
  padding-bottom: clamp(32px, 4.4vw, 64px);
  /* Left and right padding: 48px on desktop, responsive clamp */
  padding-left: clamp(16px, 3.3vw, 48px);
  padding-right: clamp(16px, 3.3vw, 48px);
  box-sizing: border-box;
}

.hero-copy {
  width: 100%;
  margin: 0 auto clamp(42px, 5vw, 72px);
  text-align: center;
}

.hero-copy h1 {
  margin: 0 0 18px;
  color: #111111;
  font-size: clamp(36px, 4vw, 56px);
  line-height: 1.02;
  letter-spacing: -2.5px;
  font-weight: 600;
  white-space: nowrap;
}

.hero-copy p {
  max-width: 690px;
  margin: 0 auto;
  color: #606060;
  font-size: clamp(14px, 1.1vw, 17px);
  line-height: 1.55;
  letter-spacing: 0;
}

/* Video Card Container - exactly 1350px max-width on 1440px desktop */
.hero-video-container {
  width: 100%;
  max-width: 1350px;
  margin: 0 auto;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .hero-copy h1 {
    letter-spacing: -1.4px;
    white-space: normal;
  }

  .hero-copy p {
    line-height: 1.45;
  }
}

.hero-video-card {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  background-color: #000000;
  box-shadow: 
    0 10px 30px -10px rgba(0, 0, 0, 0.12),
    0 0 1px 1px rgba(0, 0, 0, 0.04);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.why-section {
  width: min(calc(100% - 16px), 1350px);
  min-height: 147px;
  margin: 0 auto;
  padding: 30px 48px;
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 14px;
  box-sizing: border-box;
  color: #ffffff;
  background-color: #9d1e2b;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent 28px,
    rgba(255, 255, 255, 0.08) 29px,
    transparent 30px
  );
}

.why-label {
  align-self: center;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.why-section p {
  max-width: 100%;
  margin: 0;
  font-size: 18px;
  line-height: 1.45;
  text-align: center;
}

.solutions-section {
  width: min(100% - 32px, 1350px);
  margin: 0 auto;
  padding: clamp(54px, 7vw, 100px) 0 80px;
}

.solutions-section h2 {
  margin: 0 0 clamp(48px, 7vw, 92px);
  color: #0d1016;
  font-size: clamp(54px, 7vw, 92px);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -3px;
}

.solution-row {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 12px;
  min-height: 390px;
  margin-bottom: 46px;
}

.solution-row-reverse {
  grid-template-columns: 1.25fr 1fr;
}

.solution-details {
  padding: 26px 34px;
  color: #ffffff;
  background: linear-gradient(105deg, #ad9798, #454143 78%);
  font-family: 'Iosevka Charon', 'Iosevka', monospace;
  text-align: left;
}

.solution-details h3 {
  margin: 0 0 28px;
  font-size: 36px;
  line-height: 1.2;
  font-weight: 400;
}

.solution-details h3 span {
  margin-right: 8px;
  font-size: 0.75em;
}

.solution-details ul {
  margin: 0;
  padding-left: 24px;
  display: grid;
  gap: 12px;
  list-style: none;
  font-size: 20px;
  line-height: 1.25;
}

.solution-details li::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  margin: 0 12px 3px -16px;
  background: currentColor;
}

.solution-media {
  min-height: 390px;
  overflow: hidden;
  background: #e8e1d7;
}

.solution-media video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

/* Video element */
.hero-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-info-overlay {
  position: absolute;
  inset: auto 0 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  padding: 32px;
  color: #ffffff;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7),
    rgba(0, 0, 0, 0.08) 85%,
    transparent
  );
}

.video-info-copy {
  max-width: 390px;
}

.video-info-copy p {
  margin: 0 0 26px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 11px;
  line-height: 1.45;
  text-transform: uppercase;
  letter-spacing: 0.55px;
}

.video-info-actions {
  display: flex;
  align-items: center;
  gap: 34px;
}

.video-quote-button,
.video-about-link {
  color: #ffffff;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
}

.video-quote-button {
  min-height: 35px;
  padding: 0 20px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: rgba(8, 8, 8, 0.88);
  transition: background-color 160ms ease;
}

.video-quote-button:hover,
.video-quote-button:focus-visible {
  background: #000000;
}

.video-quote-button span {
  font-size: 7px;
}

.video-about-link {
  opacity: 0.82;
  transition: opacity 160ms ease;
}

.video-about-link:hover,
.video-about-link:focus-visible {
  opacity: 1;
}

.video-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(155px, 1fr));
  min-width: min(48%, 520px);
  background: rgba(80, 80, 80, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.video-stat {
  min-height: 150px;
  padding: 22px 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

.video-stat + .video-stat {
  border-left: 1px solid rgba(255, 255, 255, 0.16);
}

.video-stat strong {
  font-size: 34px;
  line-height: 1;
  font-weight: 400;
  letter-spacing: 1px;
}

.video-stat strong span {
  margin-left: 5px;
  font-size: 16px;
}

.video-stat > span {
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.26);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  white-space: nowrap;
}

/* Minimalist Video Controls Overlay (Appears on Hover) */
.video-controls-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: none;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px 20px;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0) 25%
  );
  opacity: 0;
  transition: opacity 0.25s ease;
  z-index: 3;
}

.hero-video-card:hover .video-controls-overlay,
.hero-video-card:focus-within .video-controls-overlay,
.video-controls-overlay.always-visible {
  opacity: 1;
}

.video-controls-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  pointer-events: auto;
}

.control-pill-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  padding: 4px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.control-btn {
  background: transparent;
  border: none;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s ease, transform 0.15s ease;
  outline: none;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

@media (max-width: 760px) {
  .video-info-overlay {
    align-items: stretch;
    flex-direction: column;
    padding: 22px;
  }

  .video-info-copy {
    max-width: 100%;
  }

  .video-info-copy p {
    margin-bottom: 18px;
  }

  .video-stats {
    min-width: 100%;
  }

  .video-stat {
    min-height: 110px;
    padding: 15px 12px 13px;
  }

  .video-stat strong {
    font-size: 27px;
  }

  .video-stat > span {
    font-size: 8px;
  }

  .why-section {
    width: calc(100% - 32px);
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    padding: 22px;
  }

  .why-section p {
    font-size: 18px;
  }

  .solutions-section {
    width: calc(100% - 32px);
    padding-top: 56px;
  }

  .solutions-section h2 {
    letter-spacing: -2px;
  }

  .solution-row,
  .solution-row-reverse {
    grid-template-columns: 1fr;
    margin-bottom: 24px;
  }

  .solution-row-reverse .solution-media {
    order: -1;
  }

  .solution-media,
  .solution-details {
    min-height: 230px;
  }

  .solution-details {
    padding: 24px;
  }

  .solution-details h3 {
    margin-bottom: 30px;
    font-size: 30px;
  }

  .solution-details ul {
    padding-left: 24px;
    gap: 14px;
    font-size: 17px;
  }
}
```

### `src/landing.jsx`

```jsx
import { useState, useRef, useEffect } from 'react'
import './landing.css'
import Navbar from './Navbar.jsx'

export default function Landing() {
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Ensure autoplay starts smoothly even if browser restricts it
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true
      videoRef.current.muted = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
          })
          .catch((error) => {
            console.warn('Autoplay prevented or interrupted:', error)
            setIsPlaying(false)
          })
      }
    }
  }, [])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const nextMuted = !videoRef.current.muted
    videoRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const toggleFullscreen = () => {
    if (!cardRef.current) return
    if (!document.fullscreenElement) {
      cardRef.current.requestFullscreen?.().catch(console.error)
    } else {
      document.exitFullscreen?.().catch(console.error)
    }
  }

  return (
    <main className="landing-page">
      <Navbar />
      <section className="hero-section" id="home" aria-label="Hero Section">
        <div className="hero-copy">
          <h1>Move Smarter. Deliver Faster.</h1>
          <p>
            LogiCraft connects fleets, warehouses, shipments, and transportation
            operations in one intelligent platform—giving you the visibility and
            control to move goods efficiently from pickup to delivery.
          </p>
        </div>
        <div className="hero-video-container">
          <div className="hero-video-card" ref={cardRef}>
            <video
              ref={videoRef}
              className="hero-video"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              {/* Primary file in public directory */}
              <source
                src="/WhatsApp%20Video%202026-09-29%20at%2010.25.29%20AM.mp4"
                type="video/mp4"
              />
              <source
                src="/WhatsApp Video 2026-09-29 at 10.25.29 AM.mp4"
                type="video/mp4"
              />
              {/* Fallback alias */}
              <source src="/hero-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            <div className="video-info-overlay">
              <div className="video-info-copy">
                <p>
                  Reliable freight, transportation, and logistics solutions
                  designed to keep your supply chain moving with efficiency,
                  visibility, and confidence.
                </p>
                <div className="video-info-actions">
                  <a className="video-quote-button" href="#get-started">
                    <span aria-hidden="true">&#9632;</span>
                    Get a Quote
                  </a>
                  <a className="video-about-link" href="#about-us">
                    About Us
                  </a>
                </div>
              </div>

              <div className="video-stats" aria-label="Logistics performance metrics">
                <div className="video-stat">
                  <strong>98<span>%</span></strong>
                  <span>On-time delivery rate</span>
                </div>
                <div className="video-stat">
                  <strong>24/7</strong>
                  <span>Real-time tracking</span>
                </div>
              </div>
            </div>

            {/* Video Controls Overlay */}
            <div
              className={`video-controls-overlay ${!isPlaying ? 'always-visible' : ''}`}
            >
              <div className="video-controls-bar">
                {/* Left side: Live / Status Pill */}
                <div className="control-pill-group">
                  <span className="video-status-badge">
                    <span className="status-dot"></span>
                    {isPlaying ? 'Playing' : 'Paused'}
                  </span>
                </div>

                {/* Right side: Interactive Playback Controls */}
                <div className="control-pill-group">
                  <button
                    type="button"
                    className="control-btn"
                    onClick={togglePlay}
                    title={isPlaying ? 'Pause video' : 'Play video'}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="control-btn"
                    onClick={toggleMute}
                    title={isMuted ? 'Unmute video' : 'Mute video'}
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    className="control-btn"
                    onClick={toggleFullscreen}
                    title={
                      isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                    aria-label={
                      isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
                    }
                  >
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="why-section" id="about-us" aria-label="Why LogiCraft">
        <span className="why-label">why logicraft?</span>
        <p>
          From fleet operations to warehouse workflows and shipment tracking,
          LogiCraft brings every moving part of your logistics operation
          together in one connected platform.
        </p>
      </section>

      <section className="solutions-section" id="solutions" aria-labelledby="solutions-title">
        <h2 id="solutions-title"><span id="get-started">Solutions</span></h2>

        <div className="solution-row">
          <article className="solution-details">
            <h3><span>01</span> Fleet management</h3>
            <ul>
              <li>Real-time vehicle tracking</li>
              <li>Route monitoring &amp; optimization</li>
              <li>Vehicle maintenance management</li>
              <li>Driver &amp; trip management</li>
              <li>Fleet performance analytics</li>
            </ul>
          </article>
          <div className="solution-media">
            <video autoPlay loop muted playsInline preload="metadata" aria-label="Fleet management operations">
              <source src="/fleet%20managment.mp4" type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="solution-row solution-row-reverse">
          <div className="solution-media">
            <video autoPlay loop muted playsInline preload="metadata" aria-label="Warehouse management operations">
              <source src="/warehouse%20managment.mp4" type="video/mp4" />
            </video>
          </div>
          <article className="solution-details">
            <h3><span>02</span> Warehouse management</h3>
            <ul>
              <li>Real-time inventory tracking</li>
              <li>Barcode &amp; package scanning</li>
              <li>Warehouse workflow management</li>
              <li>Smart picking &amp; dispatching</li>
              <li>Inventory &amp; stock analytics</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  )
}

export { Landing }
```

### `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeBackendPersistence } from './api.js'

const root = createRoot(document.getElementById('root'))

initializeBackendPersistence().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
```

### `src/Messages.jsx`

```jsx
import { useEffect, useState } from 'react'

const CONVERSATIONS_KEY = 'logicraft-conversations-v1'
const NOTIFICATIONS_KEY = 'logicraft-message-notifications-v1'

const sampleConversations = [
	{
		id: 'CONV-DRIVER-032', name: 'Christina Kamberina', role: 'Driver', initials: 'CK', presence: 'On trip', unread: 2,
		context: 'SHP-2026-08421', contextLabel: 'In transit · Newark to Chicago',
		latest: 'Traffic has slowed near Joliet. Still on track for the current ETA.', updated: '1:25 PM',
		messages: [
			{ id: 'MSG-001', from: 'me', text: 'Please send an update when you reach the I-80 checkpoint.', time: '1:08 PM' },
			{ id: 'MSG-002', from: 'contact', text: 'Just passed Gary, Indiana. Roads are clear so far.', time: '1:16 PM' },
			{ id: 'MSG-003', from: 'contact', text: 'Traffic has slowed near Joliet. Still on track for the current ETA.', time: '1:25 PM' },
		],
	},
	{
		id: 'CONV-CUSTOMER-10482', name: 'Northstar Retail', role: 'Customer', initials: 'NR', presence: 'Online', unread: 1,
		context: 'ORD-2026-10482', contextLabel: 'Order active · Delivery Oct 03',
		latest: 'Could you confirm the receiving dock for this delivery?', updated: '12:52 PM',
		messages: [
			{ id: 'MSG-004', from: 'me', text: 'Your order is in transit. Current predicted delivery is Oct 03 at 10:30 AM.', time: '12:43 PM' },
			{ id: 'MSG-005', from: 'contact', text: 'Could you confirm the receiving dock for this delivery?', time: '12:52 PM' },
		],
	},
	{
		id: 'CONV-WAREHOUSE-01', name: 'Newark Warehouse Team', role: 'Warehouse', initials: 'NW', presence: 'Team channel', unread: 0,
		context: 'SKU-EL-104', contextLabel: 'Inbound receipt · RCV-2026-0418',
		latest: 'Dock 02 is ready for the 9:30 AM electronics delivery.', updated: '11:42 AM',
		messages: [
			{ id: 'MSG-006', from: 'contact', text: 'Dock 02 is ready for the 9:30 AM electronics delivery.', time: '11:42 AM' },
			{ id: 'MSG-007', from: 'me', text: 'Thanks. Please check the carton count against PO-11842.', time: '11:47 AM' },
		],
	},
	{
		id: 'CONV-DISPATCH-01', name: 'Dispatch Desk', role: 'Team', initials: 'DD', presence: 'Team channel', unread: 0,
		context: 'SHP-2026-08396', contextLabel: 'Delivered · Seattle, WA',
		latest: 'Shipment SHP-2026-08396 was signed for at 9:42 AM.', updated: '9:44 AM',
		messages: [
			{ id: 'MSG-008', from: 'contact', text: 'Shipment SHP-2026-08396 was signed for at 9:42 AM.', time: '9:44 AM' },
			{ id: 'MSG-009', from: 'me', text: 'Received. I have updated the order record.', time: '9:49 AM' },
		],
	},
]

const sampleNotifications = [
	{ id: 'NOT-001', conversationId: 'CONV-DRIVER-032', title: 'Driver update', detail: 'Traffic slowdown reported near Joliet', time: '1:25 PM', type: 'driver', read: false },
	{ id: 'NOT-002', conversationId: 'CONV-CUSTOMER-10482', title: 'Customer question', detail: 'Receiving dock confirmation requested', time: '12:52 PM', type: 'customer', read: false },
	{ id: 'NOT-003', conversationId: 'CONV-WAREHOUSE-01', title: 'Pickup request', detail: 'Newark dock is ready for inbound goods', time: '11:42 AM', type: 'warehouse', read: true },
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function initials(name) {
	return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function clockTime() {
	return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function ConversationDialog({ onClose, onCreate }) {
	const [name, setName] = useState('')
	const [role, setRole] = useState('Driver')
	const [context, setContext] = useState('')

	return (
		<div className="messages-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="messages-modal" role="dialog" aria-modal="true" aria-labelledby="new-conversation-title">
				<header className="messages-modal-heading"><div><span className="messages-kicker">TEAM INBOX / NEW THREAD</span><h2 id="new-conversation-title">Start a conversation</h2></div><button className="messages-icon-button" type="button" onClick={onClose} aria-label="Close new conversation">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onCreate(name, role, context) }}>
					<label className="messages-field">Recipient<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name or team" /></label>
					<label className="messages-field">Team<select value={role} onChange={(event) => setRole(event.target.value)}><option>Driver</option><option>Customer</option><option>Warehouse</option><option>Team</option></select></label>
					<label className="messages-field">Related order, shipment, or topic<input value={context} onChange={(event) => setContext(event.target.value)} placeholder="Optional reference" /></label>
					<footer className="messages-form-actions"><button className="messages-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="messages-primary-button" type="submit">Create conversation</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function MessagesDashboard() {
	const [conversations, setConversations] = useState(() => readList(CONVERSATIONS_KEY, sampleConversations))
	const [notifications, setNotifications] = useState(() => readList(NOTIFICATIONS_KEY, sampleNotifications))
	const [selectedId, setSelectedId] = useState(() => readList(CONVERSATIONS_KEY, sampleConversations)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [filter, setFilter] = useState('All')
	const [draft, setDraft] = useState('')
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const [newConversationOpen, setNewConversationOpen] = useState(false)

	useEffect(() => { try { localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations)) } catch {} }, [conversations])
	useEffect(() => { try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)) } catch {} }, [notifications])

	const filtered = conversations.filter((conversation) => {
		const matchesQuery = `${conversation.name} ${conversation.role} ${conversation.latest} ${conversation.context}`.toLowerCase().includes(query.trim().toLowerCase())
		const matchesFilter = filter === 'All' || (filter === 'Unread' ? conversation.unread > 0 : conversation.role === filter)
		return matchesQuery && matchesFilter
	})
	const selected = conversations.find((conversation) => conversation.id === selectedId) ?? filtered[0]
	const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unread, 0)
	const unreadNotifications = notifications.filter((notification) => !notification.read).length

	const openConversation = (conversationId) => {
		setSelectedId(conversationId)
		setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation))
		setNotifications((current) => current.map((notification) => notification.conversationId === conversationId ? { ...notification, read: true } : notification))
		setNotificationsOpen(false)
	}

	const sendMessage = () => {
		const text = draft.trim()
		if (!text || !selected) return
		const time = clockTime()
		setConversations((current) => current.map((conversation) => conversation.id === selected.id ? {
			...conversation,
			unread: 0,
			latest: text,
			updated: time,
			messages: [...conversation.messages, { id: `MSG-${Date.now()}`, from: 'me', text, time }],
		} : conversation))
		setNotifications((current) => current.map((notification) => notification.conversationId === selected.id ? { ...notification, read: true } : notification))
		setDraft('')
	}

	const createConversation = (name, role, context) => {
		const conversation = {
			id: `CONV-${Date.now()}`, name: name.trim(), role, initials: initials(name.trim()), presence: role === 'Team' || role === 'Warehouse' ? 'Team channel' : 'New contact', unread: 0,
			context: context.trim(), contextLabel: context.trim() ? `Reference · ${context.trim()}` : 'No linked order or shipment',
			latest: 'Start a new conversation', updated: clockTime(), messages: [],
		}
		setConversations((current) => [conversation, ...current])
		setSelectedId(conversation.id)
		setFilter('All')
		setQuery('')
		setNewConversationOpen(false)
	}

	const markAllRead = () => {
		setConversations((current) => current.map((conversation) => ({ ...conversation, unread: 0 })))
		setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
	}

	return (
		<div className="messages-workspace">
			<header className="messages-page-heading"><div><span className="messages-kicker">OPERATIONS / TEAM COMMUNICATION</span><h1>Messages</h1><p>Keep every delivery conversation connected to its operation.</p></div><div className="messages-header-actions"><button className={`messages-notification-button${notificationsOpen ? ' is-open' : ''}`} type="button" onClick={() => setNotificationsOpen((current) => !current)} aria-expanded={notificationsOpen} aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unreadNotifications > 0 && <i>{unreadNotifications}</i>}</button><button className="messages-primary-button" type="button" onClick={() => setNewConversationOpen(true)}><span aria-hidden="true">＋</span> New message</button>
				{notificationsOpen && <section className="messages-notification-popover" aria-label="Notifications"><div className="messages-notification-heading"><div><strong>Notifications</strong><span>{unreadNotifications} unread</span></div><button type="button" onClick={markAllRead} disabled={!unreadNotifications}>Mark all read</button></div>{notifications.length ? notifications.map((notification) => { const related = conversations.find((conversation) => conversation.id === notification.conversationId); return <button className={`messages-notification-item${notification.read ? '' : ' is-unread'}`} type="button" key={notification.id} onClick={() => related && openConversation(related.id)}><span className={`messages-notification-mark notice-${notification.type}`} aria-hidden="true">{notification.type === 'driver' ? '↗' : notification.type === 'customer' ? '◇' : '↓'}</span><span><strong>{notification.title}</strong><small>{notification.detail}</small><time>{notification.time}</time></span>{!notification.read && <i />}</button> }) : <p className="messages-empty-notifications">You’re all caught up.</p>}</section>}
				</div></header>

			<div className="messages-inbox-layout">
				<aside className="messages-glass-card messages-conversation-panel" aria-label="Conversations">
					<div className="messages-inbox-heading"><div><h2>Inbox</h2><span>{unreadCount} unread</span></div><button type="button" onClick={() => setNewConversationOpen(true)} aria-label="Start a new conversation" title="New conversation">＋</button></div>
					<label className="messages-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
					<div className="messages-filter-tabs" role="group" aria-label="Filter conversations">{['All', 'Unread', 'Driver', 'Customer', 'Warehouse', 'Team'].map((item) => <button type="button" key={item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
					<div className="messages-conversation-list">{filtered.map((conversation) => <button className={`messages-conversation-item${selected?.id === conversation.id ? ' is-selected' : ''}`} type="button" key={conversation.id} onClick={() => openConversation(conversation.id)}><span className={`messages-contact-avatar role-${conversation.role.toLowerCase()}`}>{conversation.initials}</span><span className="messages-conversation-copy"><span className="messages-contact-line"><strong>{conversation.name}</strong><time>{conversation.updated}</time></span><span className="messages-role-line">{conversation.role}<i />{conversation.presence}</span><span className="messages-preview-line">{conversation.latest}</span></span>{conversation.unread > 0 && <span className="messages-unread-count">{conversation.unread}</span>}</button>)}
						{filtered.length === 0 && <p className="messages-empty-list">No conversations match this view.</p>}</div>
				</aside>

				{selected ? <section className="messages-glass-card messages-thread-panel" aria-label={`Conversation with ${selected.name}`}>
					<header className="messages-thread-heading"><span className={`messages-contact-avatar role-${selected.role.toLowerCase()}`}>{selected.initials}</span><div><h2>{selected.name}</h2><p><span className={`messages-presence-dot${selected.presence === 'On trip' ? ' is-traveling' : ''}`} />{selected.role} · {selected.presence}</p></div><span className="messages-thread-context">{selected.contextLabel}</span></header>
					{selected.context && <div className="messages-context-strip"><span>RELATED OPERATION</span><strong>{selected.context}</strong><small>{selected.contextLabel}</small></div>}
					<div className="messages-thread-body" aria-live="polite">{selected.messages.length ? selected.messages.map((message, index) => <article className={`messages-bubble-row${message.from === 'me' ? ' from-me' : ''}`} key={message.id}><span className={`messages-bubble-avatar${message.from === 'me' ? ' avatar-me' : ''}`}>{message.from === 'me' ? 'LC' : selected.initials}</span><div className="messages-bubble-stack">{message.from !== 'me' && index === 0 && <strong className="messages-sender-name">{selected.name}</strong>}<p className="messages-bubble">{message.text}</p><time>{message.time}</time></div></article>) : <div className="messages-thread-empty"><span className="messages-empty-icon">✉</span><strong>Start the conversation</strong><span>Send a message to {selected.name}.</span></div>}</div>
					<form className="messages-composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} rows="2" placeholder={`Message ${selected.name}...`} aria-label={`Message ${selected.name}`} /><div className="messages-composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button className="messages-send-button" type="submit" disabled={!draft.trim()} aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-7-8-1Zm8 1 4-5" /></svg>Send</button></div></form>
				</section> : <section className="messages-glass-card messages-thread-empty"><span className="messages-empty-icon">✉</span><h2>Select a conversation</h2><p>Choose a thread or start a new message.</p><button className="messages-primary-button" type="button" onClick={() => setNewConversationOpen(true)}>New message</button></section>}
			</div>
			{newConversationOpen && <ConversationDialog onClose={() => setNewConversationOpen(false)} onCreate={createConversation} />}
		</div>
	)
}
```

### `src/Navbar.css`

```css
.site-header {
	width: 100%;
	border-bottom: 1px solid #e3e3e3;
	background: #ffffff;
	color: #161616;
}

.site-nav {
	width: 100%;
	min-height: 73px;
	padding: 0 26px 0 33px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 32px;
	box-sizing: border-box;
}

.brand-mark,
.nav-links a,
.nav-button {
	color: inherit;
	text-decoration: none;
}

.brand-mark {
	flex: 0 0 auto;
	font-size: 20px;
	line-height: 1;
	font-weight: 700;
	letter-spacing: -0.7px;
}

.nav-links {
	display: flex;
	align-items: center;
	gap: clamp(28px, 4.1vw, 60px);
	margin-left: auto;
	margin-right: auto;
}

.nav-links a {
	font-size: 14px;
	line-height: 1;
	font-weight: 500;
	white-space: nowrap;
	transition: opacity 160ms ease;
}

.nav-links .nav-link-active {
	padding: 11px 15px;
	border-radius: 999px;
	background: rgba(22, 22, 22, 0.48);
	border: 1px solid rgba(255, 255, 255, 0.42);
	box-shadow: 0 6px 18px rgba(22, 22, 22, 0.12);
	-webkit-backdrop-filter: blur(10px);
	backdrop-filter: blur(10px);
	color: #ffffff;
}

.nav-links a:hover,
.nav-links a:focus-visible {
	opacity: 0.6;
}

.nav-links .nav-link-active:hover,
.nav-links .nav-link-active:focus-visible {
	opacity: 0.9;
}

.nav-actions {
	display: flex;
	align-items: center;
	gap: 14px;
	flex: 0 0 auto;
}

.nav-button {
	min-height: 43px;
	padding: 0 20px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: 1px solid #161616;
	border-radius: 999px;
	box-sizing: border-box;
	font-size: 14px;
	font-weight: 600;
	white-space: nowrap;
	transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.nav-button:hover,
.nav-button:focus-visible {
	transform: translateY(-1px);
}

.nav-button-primary {
	background: #161616;
	color: #ffffff;
	min-width: 112px;
}

.nav-button-primary:hover,
.nav-button-primary:focus-visible {
	background: #333333;
}

.nav-button-secondary {
	background: #ffffff;
	min-width: 85px;
}

.nav-button-secondary:hover,
.nav-button-secondary:focus-visible {
	background: #f2f2f2;
}

@media (max-width: 800px) {
	.site-nav {
		min-height: 66px;
		padding: 0 18px;
	}

	.nav-links {
		gap: 18px;
	}

	.nav-links a {
		font-size: 13px;
	}

	.nav-actions {
		gap: 8px;
	}

	.nav-button {
		min-height: 38px;
		padding: 0 14px;
		font-size: 13px;
	}
}

@media (max-width: 620px) {
	.site-nav {
		gap: 12px;
	}

	.nav-links {
		display: none;
	}

	.nav-actions {
		margin-left: auto;
	}

	.nav-button-primary {
		min-width: auto;
	}
}
```

### `src/Navbar.jsx`

```jsx
import './Navbar.css'

const navigationItems = [
	{ label: 'Home', href: '/' },
	{ label: 'Solutions', href: '#solutions' },
	{ label: 'Features', href: '#solutions' },
	{ label: 'Industries', href: '#solutions' },
	{ label: 'About Us', href: '#about-us' },
]

export default function Navbar() {
	return (
		<header className="site-header">
			<nav className="site-nav" aria-label="Main navigation">
				<a className="brand-mark" href="/" aria-label="LogiCraft home">
					LogiCraft
				</a>

				<div className="nav-links">
					{navigationItems.map((item) => (
						<a
								key={item.label}
								className={item.label === 'Home' ? 'nav-link-active' : ''}
								href={item.href}
								aria-current={item.label === 'Home' ? 'page' : undefined}
						>
								{item.label}
						</a>
					))}
				</div>

				<div className="nav-actions">
					<a className="nav-button nav-button-primary" href="#get-started">
						Get Started
					</a>
					<a className="nav-button nav-button-secondary" href="/dashboard">
						Login
					</a>
				</div>
			</nav>
		</header>
	)
}
```

### `src/orderData.js`

```javascript
export const sampleOrders = [
	{
		id: 'ORD-2026-10482', customer: 'Northstar Retail', email: 'ops@northstar.example', phone: '+1 (312) 555-0184',
		pickup: 'Newark Distribution Center, NJ', delivery: 'Chicago Fulfillment Hub, IL', item: 'Consumer electronics', quantity: 48, weight: 620,
		pickupDate: '2026-10-01', deliveryDate: '2026-10-03', instructions: 'Keep cartons upright. Call receiving 30 minutes before arrival.',
		status: 'Active', shipment: 'SHP-2026-08421', tracking: 'TRK-2026-08421', driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck', eta: 'Oct 03, 10:30 AM',
		history: [{ label: 'Order created', date: 'Oct 01, 8:12 AM', note: 'Order confirmed by Northstar Retail' }, { label: 'Picked up', date: 'Oct 01, 10:40 AM', note: 'Newark Distribution Center' }, { label: 'In transit', date: 'Oct 01, 1:25 PM', note: 'Driver Christina Kamberina · I-80' }],
	},
	{
		id: 'ORD-2026-10476', customer: 'Harbor & Pine', email: 'logistics@harborpine.example', phone: '+1 (617) 555-0127',
		pickup: 'Queens Sorting Center, NY', delivery: 'Boston Retail Warehouse, MA', item: 'Home goods', quantity: 26, weight: 340,
		pickupDate: '2026-10-01', deliveryDate: '2026-10-02', instructions: 'Dock 4. Delivery window 1:00 PM to 4:00 PM.',
		status: 'Pending', shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Awaiting dispatch',
		history: [{ label: 'Order created', date: 'Oct 01, 9:04 AM', note: 'Awaiting dispatch assignment' }],
	},
	{
		id: 'ORD-2026-10438', customer: 'Evergreen Supply Co.', email: 'warehouse@evergreen.example', phone: '+1 (206) 555-0141',
		pickup: 'Portland Cross-Dock, OR', delivery: 'Seattle South Warehouse, WA', item: 'Packaged food', quantity: 110, weight: 840,
		pickupDate: '2026-09-30', deliveryDate: '2026-10-01', instructions: 'Temperature-controlled vehicle required.',
		status: 'Completed', shipment: 'SHP-2026-08396', tracking: 'TRK-2026-08396', driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck', eta: 'Delivered Oct 01, 9:42 AM',
		history: [{ label: 'Order created', date: 'Sep 30, 7:32 AM', note: 'Order confirmed by Evergreen Supply Co.' }, { label: 'Picked up', date: 'Sep 30, 11:15 AM', note: 'Portland Cross-Dock' }, { label: 'In transit', date: 'Sep 30, 2:20 PM', note: 'Route to Seattle, WA' }, { label: 'Delivered', date: 'Oct 01, 9:42 AM', note: 'Received by warehouse team' }],
	},
	{
		id: 'ORD-2026-10391', customer: 'Summit Outfitters', email: 'receiving@summit.example', phone: '+1 (512) 555-0192',
		pickup: 'Dallas North Warehouse, TX', delivery: 'Austin Central Depot, TX', item: 'Outdoor equipment', quantity: 32, weight: 510,
		pickupDate: '2026-09-29', deliveryDate: '2026-09-30', instructions: 'Use loading entrance on the east side.',
		status: 'Cancelled', shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Cancelled',
		history: [{ label: 'Order created', date: 'Sep 29, 8:16 AM', note: 'Order received' }, { label: 'Cancelled', date: 'Sep 29, 9:02 AM', note: 'Cancelled by customer' }],
	},
]
```

### `src/Orders.jsx`

```jsx
import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'

const STORAGE_KEY = 'logicraft-orders-v1'
const ORDER_STATUSES = ['Pending', 'Active', 'Completed', 'Cancelled']

function readOrders() {
	try {
		const savedOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
		return Array.isArray(savedOrders) ? savedOrders : sampleOrders
	} catch {
		return sampleOrders
	}
}

function todayLocal() {
	const today = new Date()
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function displayDate(value) {
	if (!value) return 'Not set'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OrderStatus({ status }) {
	return <span className={`order-status order-status-${status.toLowerCase()}`}><i />{status}</span>
}

function OrderForm({ order, onClose, onSave }) {
	const [form, setForm] = useState(() => order ?? {
		customer: '', email: '', phone: '', pickup: '', delivery: '', item: '', quantity: '1', weight: '',
		pickupDate: todayLocal(), deliveryDate: '', instructions: '',
	})
	const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

	return (
		<div className="orders-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="orders-modal" role="dialog" aria-modal="true" aria-labelledby="order-form-title">
				<header className="orders-modal-heading"><div><span className="orders-kicker">ORDER DESK / {order ? 'EDIT' : 'NEW'}</span><h2 id="order-form-title">{order ? 'Edit order' : 'Create an order'}</h2></div><button className="orders-icon-button" type="button" onClick={onClose} aria-label="Close order form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<div className="orders-form-section"><h3>Customer</h3><div className="orders-form-grid">
						<label className="orders-field">Customer / business<input name="customer" value={form.customer} onChange={updateField} required placeholder="Business or contact name" /></label>
						<label className="orders-field">Email<input name="email" type="email" value={form.email} onChange={updateField} placeholder="name@company.com" /></label>
						<label className="orders-field">Phone<input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+1 (555) 000-0000" /></label>
					</div></div>
					<div className="orders-form-section"><h3>Route</h3><div className="orders-form-grid">
						<label className="orders-field">Pickup location<input name="pickup" value={form.pickup} onChange={updateField} required placeholder="Address, city, state" /></label>
						<label className="orders-field">Delivery location<input name="delivery" value={form.delivery} onChange={updateField} required placeholder="Address, city, state" /></label>
						<label className="orders-field">Pickup date<input name="pickupDate" type="date" value={form.pickupDate} onChange={updateField} required /></label>
						<label className="orders-field">Delivery date<input name="deliveryDate" type="date" value={form.deliveryDate} onChange={updateField} required min={form.pickupDate} /></label>
					</div></div>
					<div className="orders-form-section"><h3>Items &amp; handling</h3><div className="orders-form-grid">
						<label className="orders-field">Item details<input name="item" value={form.item} onChange={updateField} required placeholder="What is being shipped?" /></label>
						<label className="orders-field">Quantity<input name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={updateField} required /></label>
						<label className="orders-field">Weight (lb)<input name="weight" type="number" min="0.1" step="0.1" value={form.weight} onChange={updateField} required placeholder="0.0" /></label>
						<label className="orders-field orders-field-wide">Special instructions<textarea name="instructions" value={form.instructions} onChange={updateField} rows="3" placeholder="Access notes, handling needs, delivery windows..." /></label>
					</div></div>
					<footer className="orders-form-actions"><button className="orders-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="orders-primary-button" type="submit">{order ? 'Save changes' : 'Create order'}</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function OrdersDashboard() {
	const [orders, setOrders] = useState(readOrders)
	const [selectedId, setSelectedId] = useState(() => readOrders()[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [dateFilter, setDateFilter] = useState('')
	const [formOpen, setFormOpen] = useState(false)
	const [editingOrder, setEditingOrder] = useState(null)

	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)) } catch {}
	}, [orders])

	const counts = {
		total: orders.length,
		pending: orders.filter((order) => order.status === 'Pending').length,
		active: orders.filter((order) => order.status === 'Active').length,
		completed: orders.filter((order) => order.status === 'Completed').length,
		cancelled: orders.filter((order) => order.status === 'Cancelled').length,
	}
	const filteredOrders = orders.filter((order) => {
		const searchMatch = `${order.id} ${order.customer} ${order.email}`.toLowerCase().includes(query.trim().toLowerCase())
		return searchMatch && (statusFilter === 'All' || order.status === statusFilter) && (!dateFilter || order.pickupDate === dateFilter)
	})
	const selectedOrder = filteredOrders.find((order) => order.id === selectedId) ?? filteredOrders[0]

	const saveOrder = (form) => {
		const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
		if (editingOrder) {
			setOrders((current) => current.map((order) => order.id === editingOrder.id ? {
				...order,
				...form,
				history: [{ label: 'Order details updated', date: timestamp, note: 'Order information was edited' }, ...order.history],
			} : order))
			setSelectedId(editingOrder.id)
		} else {
			const newOrder = {
				...form,
				id: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
				quantity: Number(form.quantity),
				weight: Number(form.weight),
				status: 'Pending',
				shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Awaiting dispatch',
				history: [{ label: 'Order created', date: timestamp, note: 'Order created in the order desk' }],
			}
			setOrders((current) => [newOrder, ...current])
			setSelectedId(newOrder.id)
			setQuery('')
			setStatusFilter('All')
			setDateFilter('')
		}
		setFormOpen(false)
		setEditingOrder(null)
	}

	const updateStatus = (order, nextStatus) => {
		if (nextStatus === order.status) return
		const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
		setOrders((current) => current.map((item) => item.id === order.id ? {
			...item,
			status: nextStatus,
			history: [{ label: `Status changed to ${nextStatus}`, date: timestamp, note: `Updated from ${order.status}` }, ...item.history],
		} : item))
	}

	const openNewOrder = () => { setEditingOrder(null); setFormOpen(true) }
	const openEditOrder = (order) => { setEditingOrder(order); setFormOpen(true) }

	return (
		<div className="orders-workspace">
			<header className="orders-page-heading"><div><span className="orders-kicker">OPERATIONS / ORDER DESK</span><h1>Orders</h1><p>One clear view from customer request to final delivery.</p></div><button className="orders-primary-button" type="button" onClick={openNewOrder}><span aria-hidden="true">＋</span> Add new order</button></header>

			<section className="orders-summary-grid" aria-label="Order overview">
				{[
					['Total orders', counts.total, 'Across all order states', 'total'],
					['Pending', counts.pending, 'Awaiting dispatch', 'pending'],
					['Active', counts.active, 'In fulfillment', 'active'],
					['Completed', counts.completed, 'Successfully delivered', 'completed'],
					['Cancelled', counts.cancelled, 'Closed before delivery', 'cancelled'],
				].map(([label, value, note, tone]) => <article className={`orders-glass-card orders-stat orders-stat-${tone}`} key={tone}><span className="orders-stat-label">{label}</span><strong>{value}</strong><small>{note}</small><span className="orders-stat-orbit" aria-hidden="true" /></article>)}
			</section>

			<div className="orders-content-grid">
				<section className="orders-glass-card orders-list-panel" aria-labelledby="orders-list-title">
					<div className="orders-section-heading"><div><h2 id="orders-list-title">Order register</h2><p>{filteredOrders.length} of {orders.length} orders</p></div><span className="orders-register-mark">ORDER LOG <b>/{String(filteredOrders.length).padStart(2, '0')}</b></span></div>
					<div className="orders-filters">
						<label className="orders-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find order or customer" aria-label="Search Order ID or customer" /></label>
						<label className="orders-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
						<label className="orders-filter-field"><span>Pickup date</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by pickup date" /></label>
						{(query || statusFilter !== 'All' || dateFilter) && <button className="orders-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setDateFilter('') }}>Reset</button>}
					</div>
					<div className="orders-table-scroll"><table className="orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Route</th><th>Pickup</th><th>Delivery</th><th>Status</th></tr></thead><tbody>
						{filteredOrders.map((order) => <tr key={order.id} className={selectedOrder?.id === order.id ? 'is-selected' : ''}>
							<td><button className="order-select-button" type="button" onClick={() => setSelectedId(order.id)}><strong>{order.id}</strong><span>{order.item}</span></button></td>
							<td><strong>{order.customer}</strong><span>{order.phone}</span></td>
							<td><span className="orders-route-from">{order.pickup.split(',')[0]}</span><span className="orders-route-to">{order.delivery.split(',')[0]}</span></td>
							<td>{displayDate(order.pickupDate)}</td><td>{displayDate(order.deliveryDate)}</td><td><OrderStatus status={order.status} /></td>
						</tr>)}
						{filteredOrders.length === 0 && <tr><td className="orders-empty-row" colSpan="6">No orders match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selectedOrder ? <aside className="orders-glass-card orders-detail-panel" aria-labelledby="order-detail-title">
					<div className="orders-detail-top"><div><span className="orders-kicker">SELECTED ORDER</span><h2 id="order-detail-title">{selectedOrder.id}</h2><p>Created for {selectedOrder.customer}</p></div><button className="orders-icon-button" type="button" onClick={() => openEditOrder(selectedOrder)} aria-label="Edit selected order" title="Edit order"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19.8 7.7a2.1 2.1 0 0 0-3-3L4 16.5Z" /><path d="m14.9 6.6 3 3" /></svg></button></div>
					<div className="orders-detail-status"><OrderStatus status={selectedOrder.status} /><label><span>Manage status</span><select value={selectedOrder.status} onChange={(event) => updateStatus(selectedOrder, event.target.value)} aria-label="Update order status">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div>
					<div className="orders-detail-section"><h3>Delivery route</h3><div className="orders-route-card"><div className="orders-route-stop"><i className="pickup-marker" /><div><small>PICKUP</small><strong>{selectedOrder.pickup}</strong><span>{displayDate(selectedOrder.pickupDate)}</span></div></div><div className="orders-route-line" /><div className="orders-route-stop"><i className="delivery-marker" /><div><small>DELIVER TO</small><strong>{selectedOrder.delivery}</strong><span>{displayDate(selectedOrder.deliveryDate)}</span></div></div></div></div>
					<div className="orders-detail-section"><h3>Items &amp; handling</h3><div className="orders-detail-facts"><span>Item<strong>{selectedOrder.item}</strong></span><span>Quantity<strong>{selectedOrder.quantity} units</strong></span><span>Weight<strong>{selectedOrder.weight} lb</strong></span><span>Instructions<strong>{selectedOrder.instructions || 'No special instructions'}</strong></span></div></div>
					<div className="orders-detail-section"><h3>Shipment &amp; delivery</h3><div className="orders-shipment-facts"><span>Shipment<strong>{selectedOrder.shipment}</strong></span><span>Tracking ID<strong>{selectedOrder.tracking}</strong></span><span>Driver<strong>{selectedOrder.driver}</strong></span><span>Vehicle<strong>{selectedOrder.vehicle}</strong></span><span>Delivery estimate<strong>{selectedOrder.eta}</strong></span></div></div>
					<div className="orders-detail-section orders-history-section"><h3>Order history</h3><ol className="orders-history">{selectedOrder.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.label}-${entry.date}-${index}`}><i /><div><strong>{entry.label}</strong><span>{entry.note}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="orders-glass-card orders-detail-empty"><strong>No order selected</strong><span>Adjust your filters or create an order.</span></aside>}
			</div>

			{formOpen && <OrderForm order={editingOrder} onClose={() => { setFormOpen(false); setEditingOrder(null) }} onSave={saveOrder} />}
		</div>
	)
}
```

### `src/shipmentData.js`

```javascript
export const sampleShipments = [
	{
		id: 'SHP-2026-08421', tracking: 'TRK-2026-08421', orderId: 'ORD-2026-10482', customer: 'Northstar Retail',
		pickup: 'Newark Distribution Center, NJ', destination: 'Chicago Fulfillment Hub, IL', driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck',
		status: 'In Transit', deliveryDate: '2026-10-03', eta: 'Oct 03, 10:30 AM', etaConfidence: '94%', etaType: 'ML predicted',
		currentLocation: 'I-80, near Joliet, IL', history: [
			{ status: 'In Transit', date: 'Oct 01, 1:25 PM', location: 'I-80, near Joliet, IL' },
			{ status: 'Picked Up', date: 'Oct 01, 10:40 AM', location: 'Newark Distribution Center, NJ' },
			{ status: 'Ready for Pickup', date: 'Oct 01, 8:12 AM', location: 'Newark Distribution Center, NJ' },
		],
	},
	{
		id: 'SHP-2026-08396', tracking: 'TRK-2026-08396', orderId: 'ORD-2026-10438', customer: 'Evergreen Supply Co.',
		pickup: 'Portland Cross-Dock, OR', destination: 'Seattle South Warehouse, WA', driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck',
		status: 'Delivered', deliveryDate: '2026-10-01', eta: 'Delivered Oct 01, 9:42 AM', etaConfidence: '99%', etaType: 'ML predicted',
		currentLocation: 'Seattle South Warehouse, WA', history: [
			{ status: 'Delivered', date: 'Oct 01, 9:42 AM', location: 'Seattle South Warehouse, WA' },
			{ status: 'Out for Delivery', date: 'Oct 01, 7:10 AM', location: 'Seattle, WA' },
			{ status: 'In Transit', date: 'Sep 30, 2:20 PM', location: 'Route to Seattle, WA' },
			{ status: 'Picked Up', date: 'Sep 30, 11:15 AM', location: 'Portland Cross-Dock, OR' },
		],
	},
]
```

### `src/Shipments.jsx`

```jsx
import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENT_STATUSES = ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Failed Delivery']
const FLEET = [
	{ driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck' },
	{ driver: 'Daniel Brooks', vehicle: 'VAN-118 · Cargo van' },
	{ driver: 'Marcus Lee', vehicle: 'TRK-053 · Semi truck' },
	{ driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck' },
	{ driver: 'Nina Patel', vehicle: 'VAN-311 · Refrigerated van' },
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function nowLabel() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function dateLabel(value) {
	if (!value) return 'Not scheduled'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ShipmentStatus({ status }) {
	return <span className={`shipment-status-pill shipment-status-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>
}

function NewShipmentDialog({ orders, onClose, onCreate }) {
	const availableOrders = orders.filter((order) => order.shipment === 'Not assigned' && order.status !== 'Cancelled')
	const [orderId, setOrderId] = useState(availableOrders[0]?.id ?? '')
	const [driver, setDriver] = useState(FLEET[0].driver)
	const [vehicle, setVehicle] = useState(FLEET[0].vehicle)
	const selectedOrder = availableOrders.find((order) => order.id === orderId)

	return (
		<div className="shipments-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="shipments-modal" role="dialog" aria-modal="true" aria-labelledby="new-shipment-title">
				<header className="shipments-modal-heading"><div><span className="shipments-kicker">DISPATCH / NEW SHIPMENT</span><h2 id="new-shipment-title">Create shipment</h2></div><button className="shipments-icon-button" type="button" onClick={onClose} aria-label="Close shipment form">×</button></header>
				{availableOrders.length ? <form onSubmit={(event) => { event.preventDefault(); if (selectedOrder) onCreate(selectedOrder, driver, vehicle) }}>
					<label className="shipments-field">Order to dispatch<select required value={orderId} onChange={(event) => setOrderId(event.target.value)}>{availableOrders.map((order) => <option value={order.id} key={order.id}>{order.id} · {order.customer}</option>)}</select></label>
					{selectedOrder && <div className="shipment-order-preview"><span><small>PICKUP</small><strong>{selectedOrder.pickup}</strong></span><span><small>DESTINATION</small><strong>{selectedOrder.delivery}</strong></span><span><small>ITEMS</small><strong>{selectedOrder.item} · {selectedOrder.quantity} units · {selectedOrder.weight} lb</strong></span><span><small>DELIVERY DATE</small><strong>{dateLabel(selectedOrder.deliveryDate)}</strong></span></div>}
					<div className="shipments-form-grid"><label className="shipments-field">Assigned driver<select value={driver} onChange={(event) => { setDriver(event.target.value); setVehicle(FLEET.find((item) => item.driver === event.target.value)?.vehicle ?? '') }}>{FLEET.map((item) => <option key={item.driver}>{item.driver}</option>)}</select></label><label className="shipments-field">Assigned vehicle<select value={vehicle} onChange={(event) => setVehicle(event.target.value)}>{FLEET.map((item) => <option key={item.vehicle}>{item.vehicle}</option>)}</select></label></div>
					<p className="shipments-eta-note">An ML-predicted ETA will be added when a route model is available. The order delivery date is used as the schedule target.</p>
					<footer className="shipments-form-actions"><button className="shipments-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="shipments-primary-button" type="submit">Create &amp; assign</button></footer>
				</form> : <div className="shipments-no-orders"><strong>No orders ready for dispatch</strong><span>Create a new order or check that an order is not already assigned to a shipment.</span><button className="shipments-secondary-button" type="button" onClick={onClose}>Close</button></div>}
			</section>
		</div>
	)
}

export default function ShipmentsDashboard() {
	const [shipments, setShipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [orders, setOrders] = useState(() => readList(ORDERS_KEY, sampleOrders))
	const [selectedId, setSelectedId] = useState(() => readList(SHIPMENTS_KEY, sampleShipments)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [dateFilter, setDateFilter] = useState('')
	const [createOpen, setCreateOpen] = useState(false)

	useEffect(() => {
		try { localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(shipments)) } catch {}
	}, [shipments])

	const filteredShipments = shipments.filter((shipment) => {
		const searchMatch = `${shipment.id} ${shipment.tracking} ${shipment.orderId} ${shipment.customer} ${shipment.pickup} ${shipment.destination} ${shipment.driver}`.toLowerCase().includes(query.trim().toLowerCase())
		return searchMatch && (statusFilter === 'All' || shipment.status === statusFilter) && (!dateFilter || shipment.deliveryDate === dateFilter)
	})
	const selected = filteredShipments.find((shipment) => shipment.id === selectedId) ?? filteredShipments[0]
	const counts = {
		total: shipments.length,
		ready: shipments.filter((shipment) => shipment.status === 'Ready for Pickup').length,
		transit: shipments.filter((shipment) => shipment.status === 'In Transit' || shipment.status === 'Picked Up').length,
		delivery: shipments.filter((shipment) => shipment.status === 'Out for Delivery').length,
		attention: shipments.filter((shipment) => shipment.status === 'Delayed' || shipment.status === 'Failed Delivery').length,
	}

	const syncOrder = (shipment, nextStatus = shipment.status, assignment = {}) => {
		const currentOrders = readList(ORDERS_KEY, sampleOrders)
		const orderStatus = nextStatus === 'Delivered' ? 'Completed' : nextStatus === 'Failed Delivery' ? 'Active' : 'Active'
		const updatedOrders = currentOrders.map((order) => order.id === shipment.orderId ? {
			...order,
			...assignment,
			shipment: shipment.id,
			tracking: shipment.tracking,
			status: orderStatus,
			eta: shipment.eta,
			history: [{ label: `Shipment ${nextStatus.toLowerCase()}`, date: nowLabel(), note: `${shipment.id} · ${shipment.currentLocation}` }, ...(order.history ?? [])],
		} : order)
		setOrders(updatedOrders)
		try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
	}

	const createShipment = (order, driver, vehicle) => {
		const suffix = String(Date.now()).slice(-6)
		const shipment = {
			id: `SHP-${new Date().getFullYear()}-${suffix}`,
			tracking: `TRK-${new Date().getFullYear()}-${suffix}`,
			orderId: order.id,
			customer: order.customer,
			pickup: order.pickup,
			destination: order.delivery,
			driver,
			vehicle,
			status: 'Ready for Pickup',
			deliveryDate: order.deliveryDate,
			eta: `Scheduled · ${dateLabel(order.deliveryDate)}`,
			etaConfidence: 'Pending route model',
			etaType: 'Schedule target',
			currentLocation: order.pickup,
			history: [{ status: 'Ready for Pickup', date: nowLabel(), location: order.pickup }],
		}
		setShipments((current) => [shipment, ...current])
		setSelectedId(shipment.id)
		setQuery('')
		setStatusFilter('All')
		setDateFilter('')
		setCreateOpen(false)
		syncOrder(shipment, shipment.status, { driver, vehicle })
	}

	const updateShipment = (shipment, changes, historyStatus) => {
		const nextShipment = { ...shipment, ...changes }
		if (historyStatus) nextShipment.history = [{ status: historyStatus, date: nowLabel(), location: nextShipment.currentLocation }, ...shipment.history]
		setShipments((current) => current.map((item) => item.id === shipment.id ? nextShipment : item))
		syncOrder(nextShipment, nextShipment.status, { driver: nextShipment.driver, vehicle: nextShipment.vehicle })
	}

	return (
		<div className="shipments-workspace">
			<header className="shipments-page-heading"><div><span className="shipments-kicker">OPERATIONS / DISPATCH BOARD</span><h1>Shipments</h1><p>Every load, assigned and accounted for.</p></div><button className="shipments-primary-button" type="button" onClick={() => setCreateOpen(true)}><span aria-hidden="true">＋</span> Create shipment</button></header>

			<section className="shipments-summary-grid" aria-label="Shipment overview">
				{[
					['Total shipments', counts.total, 'Orders in the shipment desk', 'total'],
					['Ready for pickup', counts.ready, 'Assigned and awaiting collection', 'ready'],
					['On the road', counts.transit, 'Picked up or in transit', 'transit'],
					['Out for delivery', counts.delivery, 'Final-mile deliveries', 'delivery'],
					['Needs attention', counts.attention, 'Delayed or failed attempts', 'attention'],
				].map(([label, value, note, tone]) => <article className={`shipments-glass-card shipments-stat shipments-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="shipments-content-grid">
				<section className="shipments-glass-card shipments-list-panel" aria-labelledby="shipments-list-title">
					<div className="shipments-section-heading"><div><h2 id="shipments-list-title">Shipment register</h2><p>{filteredShipments.length} of {shipments.length} shipments</p></div><span className="shipments-register-stamp">DISPATCH LOG <b>/{String(filteredShipments.length).padStart(2, '0')}</b></span></div>
					<div className="shipments-filters"><label className="shipments-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipment, tracking, order, driver" aria-label="Search shipments" /></label><label className="shipments-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label className="shipments-filter-field"><span>Delivery date</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by delivery date" /></label>{(query || statusFilter !== 'All' || dateFilter) && <button className="shipments-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setDateFilter('') }}>Reset</button>}</div>
					<div className="shipments-status-tabs" role="group" aria-label="Filter shipments by status">{['All', ...SHIPMENT_STATUSES].map((status) => <button type="button" key={status} className={statusFilter === status ? 'selected' : ''} onClick={() => setStatusFilter(status)}>{status}<span>{status === 'All' ? shipments.length : shipments.filter((shipment) => shipment.status === status).length}</span></button>)}</div>
					<div className="shipments-table-scroll"><table className="shipments-table"><thead><tr><th>Shipment / Tracking</th><th>Order</th><th>Pickup / Destination</th><th>Driver &amp; vehicle</th><th>Status</th><th>ML ETA</th></tr></thead><tbody>
						{filteredShipments.map((shipment) => <tr key={shipment.id} className={selected?.id === shipment.id ? 'is-selected' : ''}><td><button className="shipment-select-button" type="button" onClick={() => setSelectedId(shipment.id)}><strong>{shipment.id}</strong><span>{shipment.tracking}</span></button></td><td><strong>{shipment.orderId}</strong><span>{shipment.customer}</span></td><td><span className="shipments-route-start">{shipment.pickup.split(',')[0]}</span><span className="shipments-route-end">{shipment.destination.split(',')[0]}</span></td><td><strong>{shipment.driver}</strong><span>{shipment.vehicle}</span></td><td><ShipmentStatus status={shipment.status} /></td><td><strong>{shipment.eta}</strong><span>{shipment.etaType === 'ML predicted' ? `${shipment.etaConfidence} confidence` : shipment.etaType}</span></td></tr>)}
						{filteredShipments.length === 0 && <tr><td className="shipments-empty-row" colSpan="6">No shipments match these filters. Create a shipment from an unassigned order.</td></tr>}
					</tbody></table></div>
				</section>

				{selected ? <aside className="shipments-glass-card shipments-detail-panel" aria-labelledby="shipment-detail-title">
					<div className="shipments-detail-heading"><div><span className="shipments-kicker">SHIPMENT MANIFEST</span><h2 id="shipment-detail-title">{selected.id}</h2><p>{selected.orderId} · {selected.customer}</p></div><ShipmentStatus status={selected.status} /></div>
					<div className="shipments-manifest-route"><div><i className="manifest-pickup" /><small>PICKUP</small><strong>{selected.pickup}</strong></div><span /><div><i className="manifest-destination" /><small>DESTINATION</small><strong>{selected.destination}</strong></div></div>
					<div className="shipments-detail-facts"><span>Tracking ID<strong>{selected.tracking}</strong></span><span>Current location<strong>{selected.currentLocation}</strong></span><span>Delivery date<strong>{dateLabel(selected.deliveryDate)}</strong></span><span>Estimated delivery<strong>{selected.eta}</strong></span></div>
					<div className="shipments-assignment-section"><h3>Dispatch assignment</h3><div className="shipments-assignment-grid"><label className="shipments-field">Driver<select value={selected.driver} onChange={(event) => updateShipment(selected, { driver: event.target.value }, 'Driver reassigned')}>{FLEET.map((item) => <option key={item.driver}>{item.driver}</option>)}</select></label><label className="shipments-field">Vehicle<select value={selected.vehicle} onChange={(event) => updateShipment(selected, { vehicle: event.target.value }, 'Vehicle reassigned')}>{FLEET.map((item) => <option key={item.vehicle}>{item.vehicle}</option>)}</select></label></div></div>
					<div className="shipments-status-section"><label className="shipments-field">Update shipment status<select value={selected.status} onChange={(event) => updateShipment(selected, { status: event.target.value }, event.target.value)}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><p>Status changes are added to shipment history and synced to the linked order.</p></div>
					<div className="shipments-history-section"><div className="shipments-history-heading"><h3>Shipment history</h3><span>{selected.history.length} events</span></div><ol className="shipments-history">{selected.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.status}-${entry.date}-${index}`}><i /><div><strong>{entry.status}</strong><span>{entry.location}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="shipments-glass-card shipments-empty-detail"><strong>No shipment selected</strong><span>Change filters or create a shipment.</span></aside>}
			</div>
			{createOpen && <NewShipmentDialog orders={orders} onClose={() => setCreateOpen(false)} onCreate={createShipment} />}
		</div>
	)
}
```

### `src/Warehouse.jsx`

```jsx
import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'

const INVENTORY_KEY = 'logicraft-warehouse-inventory-v1'
const INBOUND_KEY = 'logicraft-warehouse-inbound-v1'
const TASKS_KEY = 'logicraft-warehouse-pick-tasks-v1'
const ACTIVITY_KEY = 'logicraft-warehouse-activity-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const STORAGE_CAPACITY = 10000

const initialInventory = [
	{ id: 'SKU-EL-104', name: 'Wireless charging dock', category: 'Electronics', location: 'A-01-03', onHand: 420, reserved: 82, reorderPoint: 100, unit: 'units' },
	{ id: 'SKU-HG-221', name: 'Stoneware dinner set', category: 'Home goods', location: 'B-03-07', onHand: 74, reserved: 22, reorderPoint: 80, unit: 'sets' },
	{ id: 'SKU-FD-030', name: 'Organic ground coffee', category: 'Food & beverage', location: 'C-02-01', onHand: 1620, reserved: 190, reorderPoint: 250, unit: 'cases' },
	{ id: 'SKU-PK-512', name: 'Shipping cartons · M', category: 'Packaging', location: 'D-01-12', onHand: 2830, reserved: 360, reorderPoint: 400, unit: 'cartons' },
	{ id: 'SKU-CL-118', name: 'Surface cleaner · 1 gal', category: 'Cleaning', location: 'C-04-04', onHand: 38, reserved: 4, reorderPoint: 45, unit: 'cases' },
	{ id: 'SKU-OT-901', name: 'Trail pack 28L', category: 'Outdoor', location: 'B-01-02', onHand: 1940, reserved: 218, reorderPoint: 180, unit: 'units' },
]

const initialInbound = [
	{ id: 'RCV-2026-0418', supplier: 'Evergreen Supply Co.', purchaseOrder: 'PO-11842', itemId: 'SKU-EL-104', quantity: 240, eta: 'Oct 02 · 9:30 AM', dock: 'Dock 02', status: 'Expected' },
	{ id: 'RCV-2026-0417', supplier: 'Harbor Home Imports', purchaseOrder: 'PO-11831', itemId: 'SKU-HG-221', quantity: 120, eta: 'Oct 02 · 1:00 PM', dock: 'Dock 04', status: 'Expected' },
	{ id: 'RCV-2026-0414', supplier: 'Packwell Distribution', purchaseOrder: 'PO-11796', itemId: 'SKU-PK-512', quantity: 500, eta: 'Oct 01 · 8:15 AM', dock: 'Dock 01', status: 'Received' },
]

function readStorage(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function initialTasks() {
	const orders = readStorage(ORDERS_KEY, sampleOrders)
	const tasks = readStorage(TASKS_KEY, [])
	const taskByOrder = new Map(tasks.map((task) => [task.orderId, task]))
	orders.forEach((order) => {
		if (order.shipment !== 'Not assigned' && order.shipment) {
			const existing = taskByOrder.get(order.id)
			if (existing) taskByOrder.set(order.id, { ...existing, status: 'Dispatched', shipmentId: order.shipment })
		} else if (order.status !== 'Cancelled' && !taskByOrder.has(order.id)) {
			taskByOrder.set(order.id, { id: `PICK-${order.id}`, orderId: order.id, customer: order.customer, item: order.item, quantity: order.quantity, destination: order.delivery, status: 'Awaiting Pick', shipmentId: '' })
		}
	})
	return [...taskByOrder.values()]
}

function timeLabel() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StockFlag({ item }) {
	const available = item.onHand - item.reserved
	const low = available <= item.reorderPoint
	return <span className={`warehouse-stock-flag ${low ? 'is-low' : 'is-healthy'}`}><i />{low ? 'Low stock' : 'In stock'}</span>
}

function ReceiveGoodsDialog({ inventory, initialSku, onClose, onReceive }) {
	const [sku, setSku] = useState(initialSku ?? inventory[0]?.id ?? '')
	const [quantity, setQuantity] = useState('')
	const [reference, setReference] = useState('')
	const selected = inventory.find((item) => item.id === sku)

	return (
		<div className="warehouse-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="warehouse-modal" role="dialog" aria-modal="true" aria-labelledby="receive-goods-title">
				<header className="warehouse-modal-heading"><div><span className="warehouse-kicker">INBOUND / STOCK CONTROL</span><h2 id="receive-goods-title">Receive goods</h2></div><button className="warehouse-icon-button" type="button" onClick={onClose} aria-label="Close receive goods form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); if (selected) onReceive(selected, Number(quantity), reference) }}>
					<label className="warehouse-field">Inventory item<select value={sku} onChange={(event) => setSku(event.target.value)}>{inventory.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>
					{selected && <p className="warehouse-receive-context">Current stock: <strong>{selected.onHand} {selected.unit}</strong><span>Storage location {selected.location}</span></p>}
					<div className="warehouse-form-grid"><label className="warehouse-field">Quantity received<input type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter units received" /></label><label className="warehouse-field">Supplier / reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Supplier or PO number" /></label></div>
					<footer className="warehouse-form-actions"><button className="warehouse-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="warehouse-primary-button" type="submit">Confirm receipt</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function WarehouseDashboard() {
	const [inventory, setInventory] = useState(() => readStorage(INVENTORY_KEY, initialInventory))
	const [inbound, setInbound] = useState(() => readStorage(INBOUND_KEY, initialInbound))
	const [tasks, setTasks] = useState(initialTasks)
	const [activity, setActivity] = useState(() => readStorage(ACTIVITY_KEY, [
		{ id: 'ACT-01', action: 'Pick list started', detail: 'ORD-2026-10476 · Harbor & Pine', time: 'Today · 9:18 AM', type: 'pick' },
		{ id: 'ACT-02', action: 'Inbound checked in', detail: 'RCV-2026-0414 · Dock 01', time: 'Today · 8:15 AM', type: 'inbound' },
		{ id: 'ACT-03', action: 'Cycle count verified', detail: 'SKU-EL-104 · A-01-03', time: 'Today · 7:52 AM', type: 'count' },
	]))
	const [query, setQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('All categories')
	const [lowOnly, setLowOnly] = useState(false)
	const [receiveOpen, setReceiveOpen] = useState(false)
	const [receiveSku, setReceiveSku] = useState('')

	useEffect(() => {
		try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)) } catch {}
	}, [inventory])
	useEffect(() => {
		try { localStorage.setItem(INBOUND_KEY, JSON.stringify(inbound)) } catch {}
	}, [inbound])
	useEffect(() => {
		try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch {}
	}, [tasks])
	useEffect(() => {
		try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity)) } catch {}
	}, [activity])

	const categories = [...new Set(inventory.map((item) => item.category))]
	const filteredInventory = inventory.filter((item) => {
		const available = item.onHand - item.reserved
		return `${item.id} ${item.name} ${item.location}`.toLowerCase().includes(query.trim().toLowerCase())
			&& (categoryFilter === 'All categories' || item.category === categoryFilter)
			&& (!lowOnly || available <= item.reorderPoint)
	})
	const totalStock = inventory.reduce((total, item) => total + item.onHand, 0)
	const lowStockCount = inventory.filter((item) => item.onHand - item.reserved <= item.reorderPoint).length
	const incomingCount = inbound.filter((receipt) => receipt.status !== 'Received').length
	const outgoingCount = tasks.filter((task) => task.status !== 'Dispatched').length
	const availableCapacity = Math.max(0, STORAGE_CAPACITY - totalStock)
	const capacityPercent = Math.round((availableCapacity / STORAGE_CAPACITY) * 100)

	const logActivity = (action, detail, type) => setActivity((current) => [{ id: `ACT-${Date.now()}`, action, detail, time: timeLabel(), type }, ...current].slice(0, 30))

	const receiveStock = (item, quantity, reference) => {
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + quantity } : entry))
		logActivity('Goods received', `${item.id} · +${quantity} ${item.unit}${reference ? ` · ${reference}` : ''}`, 'inbound')
		setReceiveOpen(false)
		setReceiveSku('')
	}

	const confirmInbound = (receipt) => {
		const item = inventory.find((entry) => entry.id === receipt.itemId)
		if (!item) return
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + receipt.quantity } : entry))
		setInbound((current) => current.map((entry) => entry.id === receipt.id ? { ...entry, status: 'Received' } : entry))
		logActivity('Inbound received', `${receipt.id} · ${item.id} +${receipt.quantity} ${item.unit} at ${item.location}`, 'inbound')
	}

	const adjustStock = (item, amount) => {
		if (item.onHand + amount < item.reserved) return
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + amount } : entry))
		logActivity(amount > 0 ? 'Stock adjustment' : 'Stock issued', `${item.id} · ${amount > 0 ? '+' : ''}${amount} ${item.unit} · ${item.location}`, amount > 0 ? 'count' : 'pick')
	}

	const advanceTask = (task) => {
		const stages = ['Awaiting Pick', 'Picking', 'Packing', 'Ready for Dispatch', 'Dispatched']
		const nextStatus = stages[Math.min(stages.indexOf(task.status) + 1, stages.length - 1)]
		if (nextStatus === task.status) return
		setTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, status: nextStatus } : entry))
		logActivity(nextStatus === 'Dispatched' ? 'Order dispatched' : `Order moved to ${nextStatus}`, `${task.orderId} · ${task.customer}`, 'pick')
	}

	return (
		<div className="warehouse-workspace">
			<header className="warehouse-page-heading"><div><span className="warehouse-kicker">OPERATIONS / INVENTORY CONTROL</span><h1>Warehouse</h1><p>Stock, receiving, and dispatch preparation in one place.</p></div><button className="warehouse-primary-button" type="button" onClick={() => { setReceiveSku(''); setReceiveOpen(true) }}><span aria-hidden="true">＋</span> Receive goods</button></header>

			<section className="warehouse-summary-grid" aria-label="Warehouse overview">
				{[
					['Total stock', totalStock.toLocaleString(), 'Units across all SKUs', 'stock'],
					['Incoming goods', incomingCount, 'Expected receipts', 'incoming'],
					['Outgoing goods', outgoingCount, 'Orders in pick / pack', 'outgoing'],
					['Available storage', `${capacityPercent}%`, `${availableCapacity.toLocaleString()} units open`, 'storage'],
					['Low-stock items', lowStockCount, 'At or below reorder point', 'low'],
				].map(([label, value, note, tone]) => <article className={`warehouse-glass-card warehouse-stat warehouse-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="warehouse-main-grid">
				<section className="warehouse-glass-card warehouse-inventory-panel" aria-labelledby="warehouse-inventory-title">
					<div className="warehouse-section-heading"><div><h2 id="warehouse-inventory-title">Inventory</h2><p>{filteredInventory.length} of {inventory.length} stock items</p></div><span className="warehouse-register-mark">STOCK LEDGER <b>/{String(inventory.length).padStart(2, '0')}</b></span></div>
					<div className="warehouse-filters"><label className="warehouse-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, item, location" aria-label="Search inventory" /></label><label className="warehouse-filter-field"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button className={`warehouse-low-toggle${lowOnly ? ' selected' : ''}`} type="button" aria-pressed={lowOnly} onClick={() => setLowOnly((current) => !current)}>Low stock <span>{lowStockCount}</span></button></div>
					<div className="warehouse-table-scroll"><table className="warehouse-table"><thead><tr><th>Item / SKU</th><th>Location</th><th>On hand</th><th>Available</th><th>Reorder point</th><th>Stock level</th><th>Adjust</th></tr></thead><tbody>
						{filteredInventory.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><span>{item.id} · {item.category}</span></td><td><span className="warehouse-location-tag">{item.location}</span></td><td><strong>{item.onHand.toLocaleString()} <small>{item.unit}</small></strong></td><td>{(item.onHand - item.reserved).toLocaleString()}</td><td>{item.reorderPoint}</td><td><StockFlag item={item} /></td><td><div className="warehouse-adjust-control"><button type="button" onClick={() => adjustStock(item, -1)} aria-label={`Remove one ${item.unit} from ${item.name}`} disabled={item.onHand <= item.reserved}>−</button><button type="button" onClick={() => adjustStock(item, 1)} aria-label={`Add one ${item.unit} to ${item.name}`}>＋</button></div></td></tr>)}
						{filteredInventory.length === 0 && <tr><td className="warehouse-empty-row" colSpan="7">No items match the current filters.</td></tr>}
					</tbody></table></div>
					<div className="warehouse-capacity"><div><span>Storage capacity</span><strong>{(STORAGE_CAPACITY - availableCapacity).toLocaleString()} / {STORAGE_CAPACITY.toLocaleString()} units used</strong></div><div className="warehouse-capacity-track"><i style={{ width: `${100 - capacityPercent}%` }} /></div><small>{capacityPercent}% available</small></div>
				</section>

				<div className="warehouse-operations-column">
					<section className="warehouse-glass-card warehouse-inbound-panel" aria-labelledby="warehouse-inbound-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-inbound-title">Incoming goods</h2><p>{incomingCount} expected at receiving</p></div><button className="warehouse-text-button" type="button" onClick={() => { setReceiveSku(''); setReceiveOpen(true) }}>Receive +</button></div><div className="warehouse-inbound-list">
						{inbound.map((receipt) => { const item = inventory.find((entry) => entry.id === receipt.itemId); return <article className={`warehouse-inbound-row${receipt.status === 'Received' ? ' is-received' : ''}`} key={receipt.id}><div className="warehouse-receipt-icon" aria-hidden="true">{receipt.status === 'Received' ? '✓' : '↓'}</div><div className="warehouse-receipt-copy"><strong>{receipt.supplier}</strong><span>{receipt.id} · {receipt.purchaseOrder}</span><span>{item?.name ?? receipt.itemId} · {receipt.quantity} {item?.unit ?? 'units'}</span><small>{receipt.eta} · {receipt.dock}</small></div>{receipt.status === 'Received' ? <span className="warehouse-received-label">Received</span> : <button className="warehouse-receive-button" type="button" onClick={() => confirmInbound(receipt)}>Check in</button>}</article> })}
						{inbound.length === 0 && <p className="warehouse-empty-note">No inbound receipts scheduled.</p>}
					</div></section>

					<section className="warehouse-glass-card warehouse-pick-panel" aria-labelledby="warehouse-pick-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-pick-title">Pick &amp; pack</h2><p>Orders moving toward dispatch</p></div><span className="warehouse-task-count">{outgoingCount} open</span></div><div className="warehouse-pick-list">
						{tasks.filter((task) => task.status !== 'Dispatched').map((task) => { const nextLabel = task.status === 'Awaiting Pick' ? 'Start picking' : task.status === 'Picking' ? 'Start packing' : task.status === 'Packing' ? 'Mark ready' : 'Ready'; return <article className="warehouse-pick-task" key={task.id}><div className="warehouse-task-header"><strong>{task.orderId}</strong><span className={`warehouse-task-state state-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></div><p>{task.customer} · {task.item} · {task.quantity} units</p><div className="warehouse-task-footer"><span>To {task.destination}</span><button type="button" onClick={() => advanceTask(task)} disabled={task.status === 'Ready for Dispatch'}>{nextLabel}{task.status !== 'Ready for Dispatch' && <span aria-hidden="true"> →</span>}</button></div></article> })}
						{outgoingCount === 0 && <p className="warehouse-empty-note">All open orders have been prepared for dispatch.</p>}
					</div></section>
				</div>
			</div>

			<section className="warehouse-glass-card warehouse-activity-panel" aria-labelledby="warehouse-activity-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-activity-title">Warehouse activity</h2><p>Recent movements and handling events</p></div><span className="warehouse-live-mark"><i /> ACTIVITY LOG</span></div><div className="warehouse-activity-list">{activity.map((entry) => <article className="warehouse-activity-row" key={entry.id}><span className={`warehouse-activity-mark activity-${entry.type}`} aria-hidden="true">{entry.type === 'inbound' ? '↓' : entry.type === 'pick' ? '↗' : '◇'}</span><div><strong>{entry.action}</strong><span>{entry.detail}</span></div><time>{entry.time}</time></article>)}</div></section>

			{receiveOpen && <ReceiveGoodsDialog inventory={inventory} initialSku={receiveSku} onClose={() => setReceiveOpen(false)} onReceive={receiveStock} />}
		</div>
	)
}
```

### `vite.config.js`

```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/*.mp4', '**/*.webm', '**/*.mov'],
    },
  },
})
```
