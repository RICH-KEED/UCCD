# UCCD Setup Guide

Follow these step-by-step commands to set up and run the Unified Complaint & Case Dashboard on your local machine.

---

### Step 1: Configure Environment Variables

Create your `.env` file from the template:
```bash
cp .env.example .env
```
Open `.env` and fill in the following variables:
- **`POSTGRES_URL`**: Your Neon DB connection string.
- **`GROQ_API_KEY`**: Your Groq API key for AI functions.
- **`SARVAM_ACCESS_TOKEN`**: Sarvam translation API token (optional).

---

### Step 2: Start Infrastructure & API Services

Build the containers and launch all backend services (Zookeeper, Kafka, Redis, and the FastAPI API):
```bash
docker compose up -d
```
*(Alternatively, if you have `make` installed, you can run `make up`)*.

> [!NOTE]
> All Python dependencies from `requirements.txt` are **automatically installed inside the Docker container** during the image build process. You do **not** need to install Python or run `pip` commands on your local host machine.
> 
> If you ever update `requirements.txt` and need to re-install dependencies, run:
> ```bash
> docker compose up -d --build
> ```

---

### Step 3: Setup Local Kafka Topics

Create the message streaming topics on your local Kafka instance:
```bash
docker compose run --rm api python scripts/create_kafka_topics.py
```
Access to fetch at 'http://localhost:8888/api/v1/dashboard/kpis' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
:8888/api/v1/dashboard/kpis:1  Failed to load resource: net::ERR_FAILED
sla-breaches:1 Access to fetch at 'http://localhost:8888/api/v1/complaints?sla_breached=true&limit=50' from origin 'http://localhost:5173' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
:8888/api/v1/complaints?sla_breached=true&limit=50:1  Failed to load resource: net::ERR_FAILED
---

### Step 4: Start the Frontend Application

*(Run these commands from inside the `frontend` folder)*:

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the development server**:
   ```bash
   npm run dev
   ```
The dashboard will be available at `http://localhost:5173`.

---

### Step 5: Demo Logins

Use these default credentials to explore the platform:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Agent** | `agent@example.com` | `Test@123` *(or the password set in your .env)* |
| **Supervisor** | `supervisor@example.com` | `Test@123` *(or the password set in your .env)* |
