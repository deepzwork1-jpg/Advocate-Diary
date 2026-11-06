from datetime import date, timedelta

from tests.test_matters import add

TODAY = date.today()


def day(offset):
    return str(TODAY + timedelta(days=offset))


def record(client, auth, matter, **fields):
    body = {"hearing_date": day(0), "outcome": "heard", **fields}
    return client.post(f"/api/matters/{matter['id']}/hearings", json=body, headers=auth)


def read(client, auth, matter):
    return client.get(f"/api/matters/{matter['id']}", headers=auth).json()


def test_adjournment_moves_the_next_date(client, auth):
    matter = add(client, auth, next_hearing=day(0))
    response = record(client, auth, matter, outcome="adjourned", next_date=day(14))
    assert response.status_code == 201
    saved = read(client, auth, matter)
    assert saved["status"] == "adjourned"
    assert saved["next_hearing"] == day(14)


def test_disposal_closes_the_matter(client, auth):
    matter = add(client, auth, next_hearing=day(0))
    record(client, auth, matter, outcome="disposed")
    saved = read(client, auth, matter)
    assert saved["status"] == "closed"
    assert saved["next_hearing"] is None


def test_used_date_is_cleared_when_no_new_date_is_given(client, auth):
    matter = add(client, auth, next_hearing=day(0))
    record(client, auth, matter)
    assert read(client, auth, matter)["next_hearing"] is None


def test_older_hearing_does_not_undo_a_later_one(client, auth):
    matter = add(client, auth)
    record(client, auth, matter, hearing_date=day(-1), outcome="disposed")
    record(client, auth, matter, hearing_date=day(-30), outcome="adjourned", next_date=day(-10))
    saved = read(client, auth, matter)
    assert saved["status"] == "closed"
    assert saved["next_hearing"] is None


def test_next_date_must_follow_the_hearing(client, auth):
    matter = add(client, auth)
    assert record(client, auth, matter, next_date=day(0)).status_code == 422


def test_disposed_matter_cannot_have_a_next_date(client, auth):
    matter = add(client, auth)
    assert record(client, auth, matter, outcome="disposed", next_date=day(5)).status_code == 422


def test_hearings_list_newest_first(client, auth):
    matter = add(client, auth)
    record(client, auth, matter, hearing_date=day(-30))
    record(client, auth, matter, hearing_date=day(-1))
    hearings = client.get(f"/api/matters/{matter['id']}/hearings", headers=auth).json()
    assert [h["hearing_date"] for h in hearings] == [day(-1), day(-30)]


def test_task_flow(client, auth):
    matter = add(client, auth)
    created = client.post(
        f"/api/matters/{matter['id']}/tasks",
        json={"title": "File reply", "due_date": day(2)},
        headers=auth,
    )
    assert created.status_code == 201
    assert created.json()["matter_title"] == matter["title"]

    task_id = created.json()["id"]
    assert len(client.get("/api/tasks", params={"done": False}, headers=auth).json()) == 1
    assert client.patch(f"/api/tasks/{task_id}", json={"done": True}, headers=auth).json()["done"]
    assert client.get("/api/tasks", params={"done": False}, headers=auth).json() == []
    assert client.delete(f"/api/tasks/{task_id}", headers=auth).status_code == 204


def test_users_cannot_reach_each_others_records(client, auth, register):
    matter = add(client, auth)
    task = client.post(
        f"/api/matters/{matter['id']}/tasks", json={"title": "Private"}, headers=auth
    ).json()
    other = register(email="ravi@example.com")

    assert record(client, other, matter).status_code == 404
    assert client.get(f"/api/matters/{matter['id']}/hearings", headers=other).status_code == 404
    assert client.get(f"/api/matters/{matter['id']}/activity", headers=other).status_code == 404
    assert client.patch(f"/api/tasks/{task['id']}", json={"done": True}, headers=other).status_code == 404
    assert client.get("/api/tasks", headers=other).json() == []
    assert client.get("/api/activity", headers=other).json() == []


def test_deleting_a_matter_removes_its_records_and_keeps_the_timeline(client, auth):
    matter = add(client, auth)
    record(client, auth, matter)
    client.post(f"/api/matters/{matter['id']}/tasks", json={"title": "Task"}, headers=auth)

    assert client.delete(f"/api/matters/{matter['id']}", headers=auth).status_code == 204
    assert client.get("/api/tasks", headers=auth).json() == []
    entries = client.get("/api/activity", headers=auth).json()
    assert entries[0]["message"] == f"Deleted {matter['title']}"
    assert all(entry["matter_id"] is None for entry in entries)


def test_calendar_shows_scheduled_and_recorded(client, auth):
    matter = add(client, auth, next_hearing=day(3))
    record(client, auth, matter, hearing_date=day(-2), next_date=day(3))
    add(client, auth, title="Closed one", status="closed", next_hearing=day(3))

    entries = client.get(
        "/api/calendar", params={"start": day(-5), "end": day(5)}, headers=auth
    ).json()
    assert [(e["date"], e["kind"]) for e in entries] == [(day(-2), "recorded"), (day(3), "scheduled")]


def test_calendar_rejects_a_huge_range(client, auth):
    response = client.get(
        "/api/calendar", params={"start": day(0), "end": day(400)}, headers=auth
    )
    assert response.status_code == 422


def test_analytics(client, auth):
    matter = add(client, auth)
    add(client, auth, court="NCLT Mumbai")
    record(client, auth, matter, hearing_date=day(-1), outcome="adjourned")
    record(client, auth, matter, hearing_date=day(0), outcome="heard")
    client.post(
        f"/api/matters/{matter['id']}/tasks",
        json={"title": "Late", "due_date": day(-1)},
        headers=auth,
    )

    data = client.get("/api/analytics", headers=auth).json()
    assert data["adjournment_rate"] == 50
    assert data["open_tasks"] == 1
    assert data["overdue_tasks"] == 1
    assert {row["label"] for row in data["by_court"]} == {"Bombay High Court", "NCLT Mumbai"}
    assert len(data["hearings_by_month"]) == 6
    assert sum(row["count"] for row in data["hearings_by_month"]) == 2


def test_csv_export_neutralises_formulas(client, auth):
    add(client, auth, title="=HYPERLINK(1)", case_number="WP 1/2026")
    response = client.get("/api/matters/export", headers=auth)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "'=HYPERLINK(1)" in response.text
    assert "WP 1/2026" in response.text
