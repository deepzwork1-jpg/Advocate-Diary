import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def client():
    # StaticPool keeps one connection, so the in-memory database survives across requests.
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def register(client):
    """Create a user and return the headers that sign requests in as them."""

    def _register(email="asha@example.com", password="correct-horse"):
        response = client.post(
            "/api/auth/register", json={"name": "Asha", "email": email, "password": password}
        )
        assert response.status_code == 201
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _register


@pytest.fixture
def auth(register):
    return register()
