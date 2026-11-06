# URL Shortener

A small FastAPI service that turns long links into short ones and counts visits. It stores data with Python's built-in `sqlite3`, so the SQL is written by hand.

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/links` | Create a short link from `{"url": "https://..."}` |
| GET | `/links/{code}` | See the target and visit count |
| GET | `/{code}` | Follow the link |

Only `http` and `https` links are accepted. Run the tests with `python -m pytest`.
