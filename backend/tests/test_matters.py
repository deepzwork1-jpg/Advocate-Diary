from datetime import date, timedelta


def add(client, auth, **fields):
    body = {"title": "A v. B", "court": "Bombay High Court", **fields}
    response = client.post("/api/matters", json=body, headers=auth)
    assert response.status_code == 201
    return response.json()


def test_create_and_read(client, auth):
    matter = add(client, auth, case_number="WP 101/2026")
    assert matter["status"] == "active"
    saved = client.get(f"/api/matters/{matter['id']}", headers=auth).json()
    assert saved["case_number"] == "WP 101/2026"


def test_blank_title_is_rejected(client, auth):
    response = client.post("/api/matters", json={"title": "   ", "court": "NCLT"}, headers=auth)
    assert response.status_code == 422


def test_patch_keeps_fields_it_was_not_given(client, auth):
    matter = add(client, auth, notes="Bring the affidavit")
    response = client.patch(
        f"/api/matters/{matter['id']}", json={"status": "adjourned"}, headers=auth
    )
    assert response.status_code == 200
    assert response.json()["status"] == "adjourned"
    assert response.json()["notes"] == "Bring the affidavit"


def test_patch_can_clear_an_optional_field(client, auth):
    matter = add(client, auth, notes="Old note")
    response = client.patch(f"/api/matters/{matter['id']}", json={"notes": None}, headers=auth)
    assert response.json()["notes"] is None


def test_patch_rejects_null_on_required_field(client, auth):
    matter = add(client, auth)
    response = client.patch(f"/api/matters/{matter['id']}", json={"title": None}, headers=auth)
    assert response.status_code == 422


def test_delete_then_missing(client, auth):
    matter = add(client, auth)
    assert client.delete(f"/api/matters/{matter['id']}", headers=auth).status_code == 204
    assert client.get(f"/api/matters/{matter['id']}", headers=auth).status_code == 404


def test_search_filter_and_paging(client, auth):
    for number in range(3):
        add(client, auth, title=f"Sharma v. State {number}")
    add(client, auth, title="Rao v. Union", status="closed")

    first_page = client.get(
        "/api/matters", params={"q": "sharma", "page_size": 2}, headers=auth
    ).json()
    assert first_page["total"] == 3
    assert len(first_page["items"]) == 2
    closed = client.get("/api/matters", params={"status": "closed"}, headers=auth).json()
    assert [m["title"] for m in closed["items"]] == ["Rao v. Union"]


def test_search_treats_percent_as_plain_text(client, auth):
    add(client, auth, title="Plain title")
    response = client.get("/api/matters", params={"q": "%"}, headers=auth).json()
    assert response["total"] == 0


def test_upcoming_skips_past_far_and_closed(client, auth):
    today = date.today()
    add(client, auth, title="Soon", next_hearing=str(today + timedelta(days=2)))
    add(client, auth, title="Past", next_hearing=str(today - timedelta(days=1)))
    add(client, auth, title="Far", next_hearing=str(today + timedelta(days=30)))
    add(client, auth, title="Closed", status="closed", next_hearing=str(today + timedelta(days=1)))

    upcoming = client.get("/api/hearings/upcoming", headers=auth).json()
    assert [m["title"] for m in upcoming] == ["Soon"]


def test_stats(client, auth):
    add(client, auth, next_hearing=str(date.today()))
    add(client, auth, status="closed")
    assert client.get("/api/stats", headers=auth).json() == {
        "active": 1,
        "adjourned": 0,
        "closed": 1,
        "hearings_this_week": 1,
    }


def test_users_cannot_reach_each_others_matters(client, auth, register):
    matter = add(client, auth)
    other = register(email="ravi@example.com")

    assert client.get("/api/matters", headers=other).json()["total"] == 0
    assert client.get(f"/api/matters/{matter['id']}", headers=other).status_code == 404
    patched = client.patch(f"/api/matters/{matter['id']}", json={"title": "Hijacked"}, headers=other)
    assert patched.status_code == 404
    assert client.delete(f"/api/matters/{matter['id']}", headers=other).status_code == 404
    assert client.get(f"/api/matters/{matter['id']}", headers=auth).json()["title"] == "A v. B"
