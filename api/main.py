from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.complaints import router as complaints_router

app = FastAPI(title="Customer Complaint Management API", version="1.0")

allow_origins=["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(complaints_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
