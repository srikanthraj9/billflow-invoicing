import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
import pytest
import jwt

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.main import app
from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.user import User
from app.models.business_settings import BusinessSettings

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    """Provides a database session for test teardown and direct DB asserts."""
    db = SessionLocal()
    yield db
    db.close()


@pytest.fixture(autouse=True, scope="module")
def cleanup_test_users(db_session: Session):
    """Clean up test users created during the test run."""
    yield
    test_emails = [
        "alex_test_unique@example.com",
        "alex_case_test@example.com",
        "user_a_iso@example.com",
        "user_b_iso@example.com",
        "inactive_test@example.com",
    ]
    for email in test_emails:
        u = db_session.query(User).filter(func.lower(User.email) == email).first()
        if u:
            db_session.delete(u)
    db_session.commit()


class TestAuthenticationStage2:
    def test_01_successful_registration(self, db_session: Session):
        """Test 1 & 2 & 3: Registration, password hashing, and absence of password_hash in response."""
        email = "alex_test_unique@example.com"
        # Cleanup pre-existing if any
        existing = db_session.query(User).filter(func.lower(User.email) == email).first()
        if existing:
            db_session.delete(existing)
            db_session.commit()

        payload = {
            "full_name": "Alex Morgan",
            "email": f"  {email.upper()}  ",  # tests whitespace and casing normalization
            "password": "SecurePassword123!",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 201, res.text
        data = res.json()

        # 3. password and password_hash never appear in response
        assert "password" not in data
        assert "password_hash" not in data
        assert data["email"] == email
        assert data["full_name"] == "Alex Morgan"
        assert data["is_active"] is True
        assert "id" in data

        # 2. Verify password is encrypted in database
        db_user = db_session.query(User).filter(User.email == email).first()
        assert db_user is not None
        assert db_user.password_hash != "SecurePassword123!"
        assert db_user.password_hash.startswith("$2b$")

        # Verify default BusinessSettings was created
        bs = db_session.query(BusinessSettings).filter(BusinessSettings.user_id == db_user.id).first()
        assert bs is not None
        assert bs.currency == "INR"
        assert bs.invoice_prefix == "INV"

    def test_04_duplicate_email(self):
        """Test 4: Duplicate email returns HTTP 409."""
        payload = {
            "full_name": "Alex Duplicate",
            "email": "alex_test_unique@example.com",
            "password": "SecurePassword123!",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 409
        assert "already exists" in res.json()["detail"].lower()

    def test_05_duplicate_email_different_casing(self):
        """Test 5: Duplicate email with different casing returns HTTP 409."""
        payload = {
            "full_name": "Alex Duplicate Casing",
            "email": "ALEX_TEST_UNIQUE@EXAMPLE.COM",
            "password": "SecurePassword123!",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 409
        assert "already exists" in res.json()["detail"].lower()

    def test_06_invalid_email(self):
        """Test 6: Invalid email syntax is rejected with HTTP 422."""
        payload = {
            "full_name": "Bad Email User",
            "email": "not-an-email",
            "password": "SecurePassword123!",
        }
        res = client.post("/api/auth/register", json=payload)
        assert res.status_code == 422

    def test_07_weak_password(self):
        """Test 7: Password < 8 characters or missing number/special char is rejected."""
        # Less than 8 characters
        res1 = client.post(
            "/api/auth/register",
            json={"full_name": "Short", "email": "short@example.com", "password": "Pass1!"},
        )
        assert res1.status_code == 422

        # 8+ chars but without number or special character
        res2 = client.post(
            "/api/auth/register",
            json={"full_name": "NoSymbol", "email": "nosymbol@example.com", "password": "JustLettersLong"},
        )
        assert res2.status_code == 422

    def test_08_successful_login(self):
        """Test 8: Successful login issues valid access token and safe user."""
        payload = {
            "email": "alex_test_unique@example.com",
            "password": "SecurePassword123!",
        }
        res = client.post("/api/auth/login", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 3600
        assert "user" in data
        assert data["user"]["email"] == "alex_test_unique@example.com"
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]

    def test_09_incorrect_password(self):
        """Test 9: Incorrect password returns HTTP 401 generic error."""
        payload = {
            "email": "alex_test_unique@example.com",
            "password": "WrongPassword123!",
        }
        res = client.post("/api/auth/login", json=payload)
        assert res.status_code == 401
        assert res.json()["detail"] == "Invalid email or password"

    def test_10_unknown_email(self):
        """Test 10: Unknown email returns identical generic HTTP 401 error."""
        payload = {
            "email": "nonexistent_9999@example.com",
            "password": "AnyPassword123!",
        }
        res = client.post("/api/auth/login", json=payload)
        assert res.status_code == 401
        assert res.json()["detail"] == "Invalid email or password"

    def test_11_inactive_user(self, db_session: Session):
        """Test 11: Inactive user account is rejected with HTTP 403."""
        # Create an inactive user directly
        inactive_email = "inactive_test@example.com"
        user = db_session.query(User).filter(User.email == inactive_email).first()
        if not user:
            from app.core.security import hash_password

            user = User(
                full_name="Inactive User",
                email=inactive_email,
                password_hash=hash_password("Password123!"),
                is_active=False,
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)
        else:
            user.is_active = False
            db_session.commit()

        # Login attempt
        res_login = client.post(
            "/api/auth/login",
            json={"email": inactive_email, "password": "Password123!"},
        )
        assert res_login.status_code == 403
        assert "inactive" in res_login.json()["detail"].lower()

        # /me attempt with token for inactive user
        token = create_access_token(user.id)
        res_me = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_me.status_code == 403
        assert "inactive" in res_me.json()["detail"].lower()

    def test_12_valid_jwt(self, db_session: Session):
        """Test 12: Valid JWT can be decoded with PyJWT, verifying claims."""
        user = db_session.query(User).filter(User.email == "alex_test_unique@example.com").first()
        token = create_access_token(user.id)
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        assert payload["sub"] == str(user.id)
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload

    def test_13_invalid_jwt(self):
        """Test 13: Invalid JWT returns HTTP 401."""
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid.malformed.token"},
        )
        assert res.status_code == 401
        assert "credentials" in res.json()["detail"].lower()

    def test_14_expired_jwt(self, db_session: Session):
        """Test 14: Expired JWT returns HTTP 401."""
        user = db_session.query(User).filter(User.email == "alex_test_unique@example.com").first()
        expired_token = create_access_token(user.id, expires_delta=timedelta(minutes=-5))
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()

    def test_15_forged_jwt(self, db_session: Session):
        """Test 15: JWT signed with wrong secret is rejected."""
        user = db_session.query(User).filter(User.email == "alex_test_unique@example.com").first()
        forged_token = jwt.encode(
            {"sub": str(user.id), "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=60)},
            "wrong_secret_key_12345678901234567890",
            algorithm="HS256",
        )
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {forged_token}"},
        )
        assert res.status_code == 401
        assert "credentials" in res.json()["detail"].lower()

    def test_16_missing_authorization_header(self):
        """Test 16: Missing Authorization header returns HTTP 401."""
        res = client.get("/api/auth/me")
        assert res.status_code == 401

    def test_17_get_me_valid_token(self):
        """Test 17: /api/auth/me with valid token returns authenticated user profile."""
        login_res = client.post(
            "/api/auth/login",
            json={"email": "alex_test_unique@example.com", "password": "SecurePassword123!"},
        )
        token = login_res.json()["access_token"]
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "alex_test_unique@example.com"
        assert data["full_name"] == "Alex Morgan"
        assert "password_hash" not in data

    def test_18_get_me_invalid_token(self):
        """Test 18: /api/auth/me with invalid token returns HTTP 401."""
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer thisisnotvalid"},
        )
        assert res.status_code == 401

    def test_19_get_me_expired_token(self, db_session: Session):
        """Test 19: /api/auth/me with expired token returns HTTP 401."""
        user = db_session.query(User).filter(User.email == "alex_test_unique@example.com").first()
        expired_token = create_access_token(user.id, expires_delta=timedelta(seconds=-10))
        res = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()

    def test_20_user_uuid_recovered_from_jwt(self, db_session: Session):
        """Test 20: User UUID is correctly extracted and maps to PostgreSQL user."""
        user = db_session.query(User).filter(User.email == "alex_test_unique@example.com").first()
        token = create_access_token(user.id)
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        recovered_id = uuid.UUID(payload["sub"])
        assert recovered_id == user.id

    def test_21_security_multi_user_isolation(self, db_session: Session):
        """
        Test 21 & Security: Create two distinct users (User A and User B).
        Verify tokens for User A identify User A, and tokens for User B identify User B.
        Validates foundation for resource.user_id == current_user.id.
        """
        # Register User A
        email_a = "user_a_iso@example.com"
        res_a = client.post(
            "/api/auth/register",
            json={"full_name": "User Alpha", "email": email_a, "password": "AlphaPassword123!"},
        )
        if res_a.status_code == 409:
            login_a = client.post(
                "/api/auth/login",
                json={"email": email_a, "password": "AlphaPassword123!"},
            )
            token_a = login_a.json()["access_token"]
            id_a = login_a.json()["user"]["id"]
        else:
            id_a = res_a.json()["id"]
            login_a = client.post(
                "/api/auth/login",
                json={"email": email_a, "password": "AlphaPassword123!"},
            )
            token_a = login_a.json()["access_token"]

        # Register User B
        email_b = "user_b_iso@example.com"
        res_b = client.post(
            "/api/auth/register",
            json={"full_name": "User Beta", "email": email_b, "password": "BetaPassword123!"},
        )
        if res_b.status_code == 409:
            login_b = client.post(
                "/api/auth/login",
                json={"email": email_b, "password": "BetaPassword123!"},
            )
            token_b = login_b.json()["access_token"]
            id_b = login_b.json()["user"]["id"]
        else:
            id_b = res_b.json()["id"]
            login_b = client.post(
                "/api/auth/login",
                json={"email": email_b, "password": "BetaPassword123!"},
            )
            token_b = login_b.json()["access_token"]

        # Validate User A's token returns User A
        me_a = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
        assert me_a.status_code == 200
        assert me_a.json()["id"] == id_a
        assert me_a.json()["email"] == email_a

        # Validate User B's token returns User B
        me_b = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_b}"})
        assert me_b.status_code == 200
        assert me_b.json()["id"] == id_b
        assert me_b.json()["email"] == email_b

        # Strict isolation check: IDs must never collide
        assert id_a != id_b


if __name__ == "__main__":
    pytest.main(["-v", __file__])
