"""FastAPI entry point for the Anime Streaming App."""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

from config import settings
import db
from anilab.routes import router as anilab_router
from proxy import router as proxy_router
from user_routes import router as user_router
from aniskip import router as skip_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database
    await db.init_db()
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title="Anime Stream Service",
    version="1.0.0",
    description="Private anime streaming service powered by Anilab & Kyoto engines",
    lifespan=lifespan
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(anilab_router, prefix="/api/anime")
app.include_router(proxy_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(skip_router, prefix="/api")

# Static files directory
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Anime Streaming API is running. Build static UI in /static."}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "anime-app"}

if __name__ == "__main__":
    cfg = settings()
    print(f"Starting Anime App on {cfg.host}:{cfg.port}")
    uvicorn.run(app, host=cfg.host, port=cfg.port)
