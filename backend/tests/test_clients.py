import os
import sys
import uuid
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.core.database import SessionLocal
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="module")
def auth_user_a():
    """Register and authenticate User A, returning (token, user_dict)."""
    email = "client_test_user_a@example.com"
    pwd = "UserAPassword123!"
    reg = client.post("/api/auth/register", json={"full_name": "User Alpha", "email": email, "password": pwd})
    if reg.status_code == 409:
        log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    else:
        log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_user_b():
    """Register and authenticate User B, returning (token, user_dict)."""
    email = "client_test_user_b@example.com"
    pwd = "UserBPassword123!"
    reg = client.post("/api/auth/register", json={"full_name": "User Beta", "email": email, "password": pwd})
    if reg.status_code == 409:
        log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    else:
        log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(autouse=True, scope="module")
def cleanup_clients_and_users(db_session: Session):
    """Teardown created test records after tests complete."""
    yield
    test_emails = ["client_test_user_a@example.com", "client_test_user_b@example.com"]
    for email in test_emails:
        u = db_session.query(User).filter(func.lower(User.email) == email).first()
        if u:
            # Delete any invoices and clients for this user
            db_session.query(Invoice).filter(Invoice.user_id == u.id).delete()
            db_session.query(Client).filter(Client.user_id == u.id).delete()
            db_session.delete(u)
    db_session.commit()


class TestClientCRUDStage3:
    def test_01_authenticated_create(self, auth_user_a):
        """Test 1 & 8: Create client while authenticated; verified ownership."""
        token_a, user_a = auth_user_a
        payload = {
            "name": "Stark Industries",
            "email": "tony@stark.com",
            "company": "Stark Ind",
            "phone": "+1-555-0199",
            "address": "10880 Malibu Point, Malibu, CA",
        }
        res = client.post(
            "/api/clients",
            json=payload,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["name"] == "Stark Industries"
        assert data["email"] == "tony@stark.com"
        assert "id" in data
        assert "user_id" not in data  # Never expose internal user_id in client response

    def test_02_unauthenticated_create(self):
        """Test 2: Create client without authentication returns HTTP 401."""
        res = client.post(
            "/api/clients",
            json={"name": "Ghost Client"},
        )
        assert res.status_code == 401

    def test_03_invalid_token(self):
        """Test 3: Access with invalid token returns HTTP 401."""
        res = client.post(
            "/api/clients",
            json={"name": "Bad Token Client"},
            headers={"Authorization": "Bearer invalid.jwt.token"},
        )
        assert res.status_code == 401

    def test_04_invalid_client_data_blank_name(self, auth_user_a):
        """Test 4 & 5: Blank name or whitespace-only name is rejected with HTTP 422."""
        token_a, _ = auth_user_a
        res1 = client.post(
            "/api/clients",
            json={"name": ""},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res1.status_code == 422

        res2 = client.post(
            "/api/clients",
            json={"name": "    "},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res2.status_code == 422

    def test_06_email_validation(self, auth_user_a):
        """Test 6: Invalid email format is rejected with HTTP 422."""
        token_a, _ = auth_user_a
        res = client.post(
            "/api/clients",
            json={"name": "Valid Name", "email": "not-an-email"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 422

    def test_07_email_normalization(self, auth_user_a):
        """Test 7: Email with whitespace and uppercase is normalized consistently."""
        token_a, _ = auth_user_a
        res = client.post(
            "/api/clients",
            json={"name": "Wayne Enterprises", "email": "  BRUCE@WAYNE.COM  "},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["email"] == "bruce@wayne.com"

    def test_08_create_ownership_in_database(self, auth_user_a, db_session: Session):
        """Test 8: Created client strictly owns the authenticated user's user_id in database."""
        token_a, user_a = auth_user_a
        res = client.post(
            "/api/clients",
            json={"name": "Oscorp Industries"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        client_id = res.json()["id"]

        db_client = db_session.query(Client).filter(Client.id == uuid.UUID(client_id)).first()
        assert db_client is not None
        assert str(db_client.user_id) == user_a["id"]

    def test_09_list_own_clients(self, auth_user_a):
        """Test 9: Listing clients returns items and total metadata."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 3
        assert len(data["items"]) >= 3

    def test_10_search_by_name(self, auth_user_a):
        """Test 10: Search matches client name."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients?search=Wayne",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert any("Wayne Enterprises" in c["name"] for c in data["items"])

    def test_11_search_by_email(self, auth_user_a):
        """Test 11: Search matches client email."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients?search=tony@stark.com",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert any(c["email"] == "tony@stark.com" for c in data["items"])

    def test_12_search_by_company(self, auth_user_a):
        """Test 12: Search matches client company."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients?search=Stark Ind",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert any(c["company"] == "Stark Ind" for c in data["items"])

    def test_13_search_by_phone(self, auth_user_a):
        """Test 13: Search matches client phone."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients?search=0199",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert any(c["phone"] == "+1-555-0199" for c in data["items"])

    def test_14_case_insensitive_search(self, auth_user_a):
        """Test 14: Search matches case-insensitively."""
        token_a, _ = auth_user_a
        res = client.get(
            "/api/clients?search=stark",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert any("Stark" in c["name"] for c in data["items"])

    def test_15_sorting(self, auth_user_a):
        """Test 15: Sorting supports 'name' (alphabetical) and 'recent' (descending)."""
        token_a, _ = auth_user_a
        # Sort by name
        res_name = client.get(
            "/api/clients?sort_by=name",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        names = [c["name"] for c in res_name.json()["items"]]
        assert names == sorted(names)

        # Sort by recent
        res_recent = client.get(
            "/api/clients?sort_by=recent",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        dates = [c["created_at"] for c in res_recent.json()["items"]]
        assert dates == sorted(dates, reverse=True)

    def test_16_pagination(self, auth_user_a):
        """Test 16: Pagination respects limit and offset."""
        token_a, _ = auth_user_a
        res_p1 = client.get(
            "/api/clients?limit=1&offset=0",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        data_p1 = res_p1.json()
        assert len(data_p1["items"]) == 1
        assert data_p1["limit"] == 1
        assert data_p1["offset"] == 0

        res_p2 = client.get(
            "/api/clients?limit=1&offset=1",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        data_p2 = res_p2.json()
        assert len(data_p2["items"]) == 1
        assert data_p2["items"][0]["id"] != data_p1["items"][0]["id"]

    def test_17_get_own_client(self, auth_user_a):
        """Test 17: Get single client by UUID."""
        token_a, _ = auth_user_a
        create_res = client.post(
            "/api/clients",
            json={"name": "Cyberdyne Systems", "email": "sales@cyberdyne.com"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        cid = create_res.json()["id"]

        get_res = client.get(
            f"/api/clients/{cid}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert get_res.status_code == 200
        assert get_res.json()["name"] == "Cyberdyne Systems"

    def test_18_update_own_client(self, auth_user_a):
        """Test 18: Update own client performs partial update."""
        token_a, _ = auth_user_a
        create_res = client.post(
            "/api/clients",
            json={"name": "Initial Name", "phone": "123"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        cid = create_res.json()["id"]

        update_res = client.put(
            f"/api/clients/{cid}",
            json={"name": "Updated Name"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert update_res.status_code == 200
        data = update_res.json()
        assert data["name"] == "Updated Name"
        assert data["phone"] == "123"  # Preserved

    def test_19_delete_own_client(self, auth_user_a):
        """Test 19: Delete own client returns HTTP 204 and removes client from list."""
        token_a, _ = auth_user_a
        create_res = client.post(
            "/api/clients",
            json={"name": "Temporary Client"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        cid = create_res.json()["id"]

        del_res = client.delete(
            f"/api/clients/{cid}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert del_res.status_code == 204

        # Confirm 404 when querying deleted client
        get_res = client.get(
            f"/api/clients/{cid}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert get_res.status_code == 404

    def test_20_21_22_23_critical_user_isolation(self, auth_user_a, auth_user_b):
        """
        Tests 20, 21, 22, 23: Complete multi-user tenant isolation:
        User A creates Client A.
        User B creates Client B.
        User A cannot see, get, update, or delete Client B (all return 404).
        User B cannot see, get, update, or delete Client A (all return 404).
        """
        token_a, _ = auth_user_a
        token_b, _ = auth_user_b

        # User A creates Client A
        res_a = client.post(
            "/api/clients",
            json={"name": "Confidential Alpha Client", "email": "alpha@secret.com"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        cid_a = res_a.json()["id"]

        # User B creates Client B
        res_b = client.post(
            "/api/clients",
            json={"name": "Confidential Beta Client", "email": "beta@secret.com"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        cid_b = res_b.json()["id"]

        # 20. List isolation
        list_a = client.get("/api/clients", headers={"Authorization": f"Bearer {token_a}"})
        items_a = [c["id"] for c in list_a.json()["items"]]
        assert cid_a in items_a
        assert cid_b not in items_a

        list_b = client.get("/api/clients", headers={"Authorization": f"Bearer {token_b}"})
        items_b = [c["id"] for c in list_b.json()["items"]]
        assert cid_b in items_b
        assert cid_a not in items_b

        # 21. Cross-user GET isolation (must return 404)
        get_b_by_a = client.get(f"/api/clients/{cid_b}", headers={"Authorization": f"Bearer {token_a}"})
        assert get_b_by_a.status_code == 404
        assert get_b_by_a.json()["detail"] == "Client not found"

        get_a_by_b = client.get(f"/api/clients/{cid_a}", headers={"Authorization": f"Bearer {token_b}"})
        assert get_a_by_b.status_code == 404
        assert get_a_by_b.json()["detail"] == "Client not found"

        # 22. Cross-user UPDATE isolation (must return 404)
        put_b_by_a = client.put(
            f"/api/clients/{cid_b}",
            json={"name": "Hacked Name"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert put_b_by_a.status_code == 404

        put_a_by_b = client.put(
            f"/api/clients/{cid_a}",
            json={"name": "Hacked Name"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert put_a_by_b.status_code == 404

        # 23. Cross-user DELETE isolation (must return 404)
        del_b_by_a = client.delete(f"/api/clients/{cid_b}", headers={"Authorization": f"Bearer {token_a}"})
        assert del_b_by_a.status_code == 404

        del_a_by_b = client.delete(f"/api/clients/{cid_a}", headers={"Authorization": f"Bearer {token_b}"})
        assert del_a_by_b.status_code == 404

    def test_24_malicious_user_id_injection(self, auth_user_a, auth_user_b, db_session: Session):
        """
        Test 24: Supplying user_id in request body is rejected by schema (extra='forbid')
        and can never override ownership.
        """
        token_a, user_a = auth_user_a
        _, user_b = auth_user_b

        # Attempt to pass user_b's ID in payload
        res = client.post(
            "/api/clients",
            json={"name": "Spoofed Client", "user_id": user_b["id"]},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        # Pydantic extra='forbid' rejects the unauthorized field with 422
        assert res.status_code == 422

    def test_25_26_27_client_with_invoice_delete_protection(self, auth_user_a, db_session: Session):
        """
        Tests 25, 26, 27: Client with existing invoice cannot be deleted (ON DELETE RESTRICT).
        Database rollback occurs; HTTP 409 Conflict is returned.
        Both client and invoice remain intact.
        """
        token_a, user_a = auth_user_a
        u_id = uuid.UUID(user_a["id"])

        # Create Client
        c_res = client.post(
            "/api/clients",
            json={"name": "Protected Client with Invoices"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        cid = uuid.UUID(c_res.json()["id"])

        # Create a direct invoice linked to this client
        inv = Invoice(
            user_id=u_id,
            client_id=cid,
            invoice_number=f"INV-TEST-{uuid.uuid4().hex[:6]}",
            status="draft",
            issue_date=date.today(),
            due_date=date.today() + timedelta(days=14),
            public_token=uuid.uuid4().hex,
        )
        db_session.add(inv)
        db_session.commit()
        db_session.refresh(inv)

        # 25. Attempt to delete client -> must fail with HTTP 409
        del_res = client.delete(
            f"/api/clients/{cid}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert del_res.status_code == 409
        assert "existing invoices" in del_res.json()["detail"].lower()

        # 26. Invoice remains in database
        db_session.expire_all()
        check_inv = db_session.query(Invoice).filter(Invoice.id == inv.id).first()
        assert check_inv is not None

        # 27. Client remains in database
        check_client = db_session.query(Client).filter(Client.id == cid).first()
        assert check_client is not None

    def test_28_no_security_information_leaks(self, auth_user_a):
        """Test 28: Responses never leak internal security details or password hashes."""
        token_a, _ = auth_user_a
        res = client.get("/api/clients", headers={"Authorization": f"Bearer {token_a}"})
        assert res.status_code == 200
        data = res.json()
        assert "password_hash" not in res.text
        assert "password" not in res.text
        for item in data.get("items", []):
            assert "user_id" not in item
            assert "password" not in item
            assert "password_hash" not in item


if __name__ == "__main__":
    pytest.main(["-v", __file__])
