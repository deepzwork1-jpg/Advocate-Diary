def test_register_then_login(client, register):
    register()
    response = client.post(
        "/api/auth/login", json={"email": "ASHA@example.com", "password": "correct-horse"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == "asha@example.com"


def test_password_is_never_returned(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Asha", "email": "asha@example.com", "password": "correct-horse"},
    )
    assert "password" not in str(response.json()["user"])


def test_duplicate_email_is_rejected(client, register):
    register()
    response = client.post(
        "/api/auth/register",
        json={"name": "Other", "email": "Asha@example.com", "password": "another-pass"},
    )
    assert response.status_code == 409


def test_short_password_is_rejected(client):
    response = client.post(
        "/api/auth/register", json={"name": "Asha", "email": "a@example.com", "password": "short"}
    )
    assert response.status_code == 422


def test_wrong_password_and_unknown_email_look_the_same(client, register):
    register()
    wrong = client.post("/api/auth/login", json={"email": "asha@example.com", "password": "nope-nope"})
    unknown = client.post("/api/auth/login", json={"email": "no@example.com", "password": "nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_very_long_password_fails_cleanly(client, register):
    register()
    response = client.post(
        "/api/auth/login", json={"email": "asha@example.com", "password": "x" * 100}
    )
    assert response.status_code == 401


def test_matters_need_a_token(client):
    assert client.get("/api/matters").status_code == 401


def test_bad_token_is_rejected(client):
    response = client.get("/api/matters", headers={"Authorization": "Bearer not-a-token"})
    assert response.status_code == 401
