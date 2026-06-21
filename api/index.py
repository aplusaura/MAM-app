from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok", "phase": "loading"}


def _load():
    global app
    try:
        from app.main import app as real_app
        return real_app
    except Exception:
        import traceback
        err = traceback.format_exc()
        fallback = FastAPI()

        @fallback.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
        def error_handler(path: str):
            return {"status": "startup_error", "detail": err}

        return fallback


app = _load()
