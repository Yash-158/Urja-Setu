# ⚡ Urja Setu: AI-Driven Power Utility Feedback System

![Django REST Framework](https://img.shields.io/badge/Backend-DRF-red)
![JavaScript](https://img.shields.io/badge/Frontend-Vanilla%20JS-yellow)
![YOLOv8](https://img.shields.io/badge/AI-Computer%20Vision-purple)
![SSIP Hackathon](https://img.shields.io/badge/Event-SSIP%20Gujarat-blue)

> **SSIP Hackathon Project**: A decoupled web platform solving the "Public Feedback for Power Utility Systems" challenge. It automates hazard reporting using Computer Vision to detect electrical faults from citizen-uploaded images.

## 📖 Project Overview
**Urja Setu** modernizes how citizens report electrical hazards (broken poles, sparking transformers) in Gujarat. 

Instead of a traditional monolithic app, we built a **Headless Architecture**:
1.  **Citizen App**: A lightweight mobile-first web interface for quick reporting.
2.  **Technician Dashboard**: A separate portal for ground staff to view assignments and map locations.
3.  **Intelligent Backend**: A Django REST API that processes images using **YOLOv8** to identify the asset (e.g., "Transformer") and prioritize the ticket based on severity.

### ⚙️ Architecture
* **Backend**: Django REST Framework (serving JSON APIs)
* **Frontend**: Standalone HTML5/CSS3/JavaScript (consuming APIs)
* **AI Engine**: YOLOv8 (Object Detection & Classification)
* **Database**: SQLite (Dev) / PostgreSQL (Prod)
* **Maps**: OpenStreetMap (Nominatim API) for Geocoding

## 📸 Screenshots

| Citizen Reporting | AI Threat Detection | Admin Dashboard |
|:---:|:---:|:---:|
| <img src="screenshots/citizen_upload.png" width="250"> | <img src="screenshots/ai_analysis.png" width="250"> | <img src="screenshots/admin_map.png" width="250"> |

## 🚀 How to Run locally

This project uses a decoupled architecture, so you need to run the Backend and Frontend separately.

### Prerequisites
- Python 3.10+
- Node.js (optional, for development tools)
- VS Code with "Live Server" extension

### Step 1: Start the Backend API

1.  **Navigate to the backend directory:**
    ```bash
    cd urja_setu_backend
    ```

2.  **Create and Activate Virtual Environment:**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Environment Variables (Crucial):**
    - Copy `.env.example` to `.env`.
    - Open `.env` and update the values.
    - **Note**: Email credentials in `.env` are required for OTP/Notifications to work.

5.  **Run Migrations:**
    ```bash
    python manage.py migrate
    ```

6.  **Start the Server:**
    ```bash
    python manage.py runserver 8000
    ```
    - Server will start at `http://127.0.0.1:8000/`.
    - Swagger Documentation: `http://127.0.0.1:8000/api/schema/swagger-ui/`

### Step 2: Start the Frontend Apps

1.  **Configure API Endpoint (Important):**
    - The frontend is configured to talk to `http://127.0.0.1:8001/api` by default in `Frontend Citizen/js/config.js` and `Frontend Technician and admin/js/config.js`.
    - **ACTION**: If your Django server is running on port **8000** (as above), you **MUST update `BASE_URL`** in both `config.js` files to `http://127.0.0.1:8000/api`.

2.  **Run Citizen App:**
    - Open `Frontend Citizen/index.html` in VS Code.
    - Right-click and select "Open with Live Server".

3.  **Run Technician/Admin App:**
    - Open `Frontend Technician and admin/index.html` in VS Code.
    - Right-click and select "Open with Live Server".

## 🧠 AI Integration
The system uses YOLOv8 to analyze uploaded images.
- When a citizen uploads a report, the backend automatically triggers an analysis task (see `api/tasks.py`).
- Ensure `ultralytics` is installed and the model weights (`api/best.pt`) are available.