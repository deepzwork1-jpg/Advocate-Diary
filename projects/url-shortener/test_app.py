import pytest
from fastapi.testclient import TestClient

from app import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("SHORTENER_DB", str(tmp_path / "links.db"))
    with TestClient(app, follow_redirects=False) as test_client:
        yield test_client


def shorten(client, url="https://example.com/page"):
    response = client.post("/links", json={"url": url})
    assert response.status_code == 201
    return response.json()["code"]


def test_short_link_redirects(client):
    response = client.get(f"/{shorten(client)}")
    assert response.status_code == 307
    assert response.headers["location"] == "https://example.com/page"


def test_visits_are_counted(client):
    code = shorten(client)
    client.get(f"/{code}")
    client.get(f"/{code}")
    assert client.get(f"/links/{code}").json()["visits"] == 2


def test_codes_are_unique(client):
    assert shorten(client) != shorten(client)


def test_unknown_code_is_404(client):
    assert client.get("/missing").status_code == 404
    assert client.get("/links/missing").status_code == 404


@pytest.mark.parametrize("url", ["not a url", "javascript:alert(1)", "ftp://example.com"])
def test_unsafe_urls_are_rejected(client, url):
    assert client.post("/links", json={"url": url}).status_code == 422
