from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Trilha API",
    description="SaaS Educacional com IA",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(billing.router, prefix="/api/billing", tags=["billing"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
