import io
import os
import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.main import app
from app.models.business_settings import BusinessSettings
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.user import User
from app.services.storage import extract_safe_storage_path

client = TestClient(app)


@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()


def create_test_image(
    image_format: str = "PNG",
    size: tuple[int, int] = (100, 100),
    color: str = "blue",
) -> bytes:
    """Generates an in-memory valid image binary."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=image_format)
    buf.seek(0)
    return buf.getvalue()


@pytest.fixture(scope="module")
def auth_user_settings_a():
    """Registers and authenticates User A for settings tests."""
    email = "settings_test_user_a@example.com"
    pwd = "UserAPassword123!"
    client.post(
        "/api/auth/register",
        json={"full_name": "Settings Merchant Alpha", "email": email, "password": pwd},
    )
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def auth_user_settings_b():
    """Registers and authenticates User B for settings tests."""
    email = "settings_test_user_b@example.com"
    pwd = "UserBPassword123!"
    client.post(
        "/api/auth/register",
        json={"full_name": "Settings Merchant Beta", "email": email, "password": pwd},
    )
    log = client.post("/api/auth/login", json={"email": email, "password": pwd})
    data = log.json()
    return data["access_token"], data["user"]


@pytest.fixture(scope="module")
def client_for_settings_user_a(auth_user_settings_a):
    """Creates a client belonging to User A for invoice tests."""
    token, _ = auth_user_settings_a
    res = client.post(
        "/api/clients",
        json={"name": "Settings Client One", "email": "client1@example.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    return res.json()


@pytest.fixture(autouse=True, scope="module")
def cleanup_settings_test_data(db_session: Session):
    """Teardown created test records after tests complete."""
    yield
    test_emails = [
        "settings_test_user_a@example.com",
        "settings_test_user_b@example.com",
        "settings_autocreate_user@example.com",
    ]
    for email in test_emails:
        u = db_session.query(User).filter(func.lower(User.email) == email).first()
        if u:
            db_session.query(InvoiceItem).filter(
                InvoiceItem.invoice_id.in_(
                    db_session.query(Invoice.id).filter(Invoice.user_id == u.id)
                )
            ).delete(synchronize_session=False)
            db_session.query(Invoice).filter(Invoice.user_id == u.id).delete()
            db_session.query(Client).filter(Client.user_id == u.id).delete()
            db_session.query(BusinessSettings).filter(BusinessSettings.user_id == u.id).delete()
            db_session.delete(u)
    db_session.commit()


@pytest.fixture
def mock_storage():
    """Mocks Supabase storage client upload and remove operations."""
    with patch("app.services.storage.get_supabase_client") as mock_get_client:
        mock_client = MagicMock()
        mock_storage_bucket = MagicMock()
        mock_client.storage.from_.return_value = mock_storage_bucket
        mock_storage_bucket.upload.return_value = {"Key": "uploaded"}
        mock_storage_bucket.remove.return_value = [{"Key": "removed"}]
        mock_get_client.return_value = mock_client
        yield mock_storage_bucket


class TestSettingsStage7:
    # ==========================================
    # 1. AUTHENTICATION (Tests 1-4)
    # ==========================================
    def test_01_unauthenticated_get_settings(self):
        """GET /api/settings without JWT returns 401."""
        res = client.get("/api/settings")
        assert res.status_code == 401

    def test_02_unauthenticated_put_settings(self):
        """PUT /api/settings without JWT returns 401."""
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Acme Corp",
                "businessEmail": "acme@example.com",
            },
        )
        assert res.status_code == 401

    def test_03_unauthenticated_upload_logo(self):
        """POST /api/settings/logo without JWT returns 401."""
        img = create_test_image("PNG")
        res = client.post(
            "/api/settings/logo",
            files={"file": ("logo.png", img, "image/png")},
        )
        assert res.status_code == 401

    def test_04_unauthenticated_delete_logo(self):
        """DELETE /api/settings/logo without JWT returns 401."""
        res = client.delete("/api/settings/logo")
        assert res.status_code == 401

    # ==========================================
    # 2. SETTINGS RETRIEVAL & DEFAULTS (Tests 5-7)
    # ==========================================
    def test_05_get_own_settings(self, auth_user_settings_a):
        """Authenticated user retrieves their own settings."""
        token, user = auth_user_settings_a
        res = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["businessName"] == user["full_name"]
        assert data["businessEmail"] == user["email"]
        assert "user_id" not in data
        assert "id" not in data

    def test_06_default_settings_values(self, auth_user_settings_a):
        """Initial settings have INR, INV, 18% tax, 14 days payment terms."""
        token, _ = auth_user_settings_a
        res = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["currency"] == "INR"
        assert data["invoicePrefix"] == "INV"
        assert data["defaultTaxPercentage"] == 18.0
        assert data["defaultPaymentTermsDays"] == 14
        assert data["logoUrl"] is None

    def test_07_auto_create_missing_settings(self, db_session: Session):
        """If a user lacks a BusinessSettings record, GET /api/settings auto-creates standard defaults."""
        email = "settings_autocreate_user@example.com"
        pwd = "AutoPassword123!"
        client.post(
            "/api/auth/register",
            json={"full_name": "Autocreate Merchant", "email": email, "password": pwd},
        )
        log = client.post("/api/auth/login", json={"email": email, "password": pwd})
        token = log.json()["access_token"]
        user_id = uuid.UUID(log.json()["user"]["id"])

        # Manually delete the BusinessSettings created by registration to simulate missing record
        db_session.query(BusinessSettings).filter(BusinessSettings.user_id == user_id).delete()
        db_session.commit()

        # GET /api/settings should recover safely
        res = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["businessName"] == "Autocreate Merchant"
        assert data["businessEmail"] == email
        assert data["currency"] == "INR"
        assert data["defaultTaxPercentage"] == 18.0

    # ==========================================
    # 3. SETTINGS UPDATE & PERSISTENCE (Tests 8-16)
    # ==========================================
    def test_08_to_16_update_and_persist_settings(self, auth_user_settings_a):
        """PUT /api/settings updates and persists profile and preferences."""
        token, _ = auth_user_settings_a
        payload = {
            "businessName": "Alpha Global Technologies",
            "businessEmail": "billing@alphaglobal.com",
            "businessPhone": "+1 (555) 019-2834",
            "businessAddress": "742 Evergreen Terrace, Sector 4",
            "currency": "USD",
            "invoicePrefix": "AGT",
            "defaultTaxPercentage": 10.50,
            "defaultPaymentTermsDays": 30,
        }
        put_res = client.put(
            "/api/settings",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["businessName"] == "Alpha Global Technologies"
        assert updated["businessEmail"] == "billing@alphaglobal.com"
        assert updated["businessPhone"] == "+1 (555) 019-2834"
        assert updated["businessAddress"] == "742 Evergreen Terrace, Sector 4"
        assert updated["currency"] == "USD"
        assert updated["invoicePrefix"] == "AGT"
        assert updated["defaultTaxPercentage"] == 10.50
        assert updated["defaultPaymentTermsDays"] == 30

        # Fresh GET confirms persistence
        get_res = client.get("/api/settings", headers={"Authorization": f"Bearer {token}"})
        assert get_res.status_code == 200
        persisted = get_res.json()
        assert persisted["businessName"] == "Alpha Global Technologies"
        assert persisted["currency"] == "USD"
        assert persisted["invoicePrefix"] == "AGT"
        assert persisted["defaultTaxPercentage"] == 10.50
        assert persisted["defaultPaymentTermsDays"] == 30

    # ==========================================
    # 4. SCHEMA VALIDATION (Tests 17-23)
    # ==========================================
    def test_17_invalid_email_format(self, auth_user_settings_a):
        """Reject invalid business email format with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={"businessName": "Valid Name", "businessEmail": "not-an-email"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    def test_18_invalid_currency(self, auth_user_settings_a):
        """Reject currencies outside whitelist (INR, USD, EUR, GBP) with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "currency": "JPY",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    def test_19_negative_tax_rate(self, auth_user_settings_a):
        """Reject negative tax percentage with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "defaultTaxPercentage": -5.0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    def test_20_excessive_tax_rate(self, auth_user_settings_a):
        """Reject tax percentage > 100 with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "defaultTaxPercentage": 105.0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    def test_21_invalid_payment_terms(self, auth_user_settings_a):
        """Reject payment terms < 1 or > 365 with 422."""
        token, _ = auth_user_settings_a
        res_zero = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "defaultPaymentTermsDays": 0,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_zero.status_code == 422

        res_over = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "defaultPaymentTermsDays": 400,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_over.status_code == 422

    def test_22_invalid_invoice_prefix(self, auth_user_settings_a):
        """Reject invoice prefix with spaces or invalid symbols with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "invoicePrefix": "INV 123#",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    def test_23_extra_forbidden_fields(self, auth_user_settings_a):
        """Reject extra fields or attempts to inject logoUrl via PUT /api/settings with 422."""
        token, _ = auth_user_settings_a
        res = client.put(
            "/api/settings",
            json={
                "businessName": "Valid Name",
                "businessEmail": "valid@example.com",
                "logoUrl": "https://malicious.com/fake.png",
                "admin": True,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422

    # ==========================================
    # 5. TENANT ISOLATION & SECURITY (Tests 24-26, 42)
    # ==========================================
    def test_24_user_a_cannot_read_user_b_settings(self, auth_user_settings_a, auth_user_settings_b):
        """User A cannot read User B's settings."""
        token_a, user_a = auth_user_settings_a
        token_b, user_b = auth_user_settings_b

        res_a = client.get("/api/settings", headers={"Authorization": f"Bearer {token_a}"})
        res_b = client.get("/api/settings", headers={"Authorization": f"Bearer {token_b}"})
        assert res_a.json()["businessEmail"] != res_b.json()["businessEmail"]

    def test_25_user_a_cannot_update_user_b_settings(self, auth_user_settings_a, auth_user_settings_b):
        """User A's update cannot alter User B's settings."""
        token_a, _ = auth_user_settings_a
        token_b, _ = auth_user_settings_b

        # User A updates prefix
        client.put(
            "/api/settings",
            json={"businessName": "Alpha Specific", "businessEmail": "alpha@example.com", "invoicePrefix": "ALPHA"},
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # User B settings remain unaffected
        res_b = client.get("/api/settings", headers={"Authorization": f"Bearer {token_b}"})
        assert res_b.json()["invoicePrefix"] != "ALPHA"

    def test_26_and_42_user_a_cannot_modify_or_delete_user_b_logo(
        self, auth_user_settings_a, auth_user_settings_b, mock_storage, db_session: Session
    ):
        """
        Test 42: User A cannot modify, replace, or delete User B's logo through the authenticated API.
        Public GET access to configured logo URLs is intentionally allowed.
        """
        token_a, user_a = auth_user_settings_a
        token_b, user_b = auth_user_settings_b

        # Upload logo as User B
        img_b = create_test_image("PNG")
        res_upload_b = client.post(
            "/api/settings/logo",
            files={"file": ("logo_b.png", img_b, "image/png")},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_upload_b.status_code == 200
        logo_b_url = res_upload_b.json()["logoUrl"]

        # Confirm User B's logo is stored in User B's namespace
        assert f"users/{user_b['id']}/logo/" in logo_b_url

        # User A calls DELETE /api/settings/logo -> must ONLY delete User A's logo (idempotent 204),
        # leaving User B's logo completely intact
        res_del_a = client.delete("/api/settings/logo", headers={"Authorization": f"Bearer {token_a}"})
        assert res_del_a.status_code == 204

        # Verify in DB that User B still has logo_b_url
        user_b_settings = (
            db_session.query(BusinessSettings)
            .filter(BusinessSettings.user_id == uuid.UUID(user_b["id"]))
            .first()
        )
        assert user_b_settings.logo_url == logo_b_url

    # ==========================================
    # 6. INVOICE INTEGRATION (Tests 27-30)
    # ==========================================
    def test_27_prefix_affects_future_invoice_numbers(
        self, auth_user_settings_a, client_for_settings_user_a, db_session: Session
    ):
        """Updating prefix to 'BILL' generates sequential BILL invoices without altering history."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Update prefix to BILL
        client.put(
            "/api/settings",
            json={
                "businessName": "Alpha Corp",
                "businessEmail": "alpha@example.com",
                "invoicePrefix": "BILL",
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # Create invoice
        res1 = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res1.status_code == 201
        inv1_num = res1.json()["invoice_number"]
        assert inv1_num.startswith("BILL-")

        # Create second invoice with BILL prefix -> sequential increment
        res2 = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Item 2", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res2.status_code == 201
        inv2_num = res2.json()["invoice_number"]
        seq1 = int(inv1_num.split("-")[1])
        seq2 = int(inv2_num.split("-")[1])
        assert seq2 == seq1 + 1

    def test_28_old_invoice_numbers_unchanged_on_prefix_change(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """Historical invoice numbers are immutable and never renamed on prefix change."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Change prefix to NEWPRE
        client.put(
            "/api/settings",
            json={
                "businessName": "Alpha Corp",
                "businessEmail": "alpha@example.com",
                "invoicePrefix": "NEWPRE",
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=7)),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        assert res.json()["invoice_number"].startswith("NEWPRE-")

        # Prior invoices still exist with their original numbers
        list_res = client.get("/api/invoices", headers={"Authorization": f"Bearer {token_a}"})
        numbers = [inv["invoice_number"] for inv in list_res.json()["items"]]
        assert any(n.startswith("BILL-") for n in numbers)
        assert any(n.startswith("NEWPRE-") for n in numbers)

    def test_29_default_payment_terms_applied_when_due_date_omitted(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """Omitting due_date calculates due_date = issue_date + settings.defaultPaymentTermsDays."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Set default payment terms to 21 days
        client.put(
            "/api/settings",
            json={
                "businessName": "Alpha Corp",
                "businessEmail": "alpha@example.com",
                "defaultPaymentTermsDays": 21,
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        today = date.today()
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(today),
                # due_date omitted
                "items": [{"description": "Item", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        expected_due = today + timedelta(days=21)
        assert res.json()["due_date"] == str(expected_due)

    def test_30_explicit_due_date_remains_respected(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """Explicitly supplying due_date overrides default payment terms."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        today = date.today()
        custom_due = today + timedelta(days=45)
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(today),
                "due_date": str(custom_due),
                "items": [{"description": "Item", "quantity": 1.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        assert res.json()["due_date"] == str(custom_due)

    def test_30a_default_tax_applies_when_tax_omitted(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """When tax_percentage is omitted, BusinessSettings.defaultTaxPercentage applies."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Configure defaultTaxPercentage = 15.00
        client.put(
            "/api/settings",
            json={
                "businessName": "Alpha Corp",
                "businessEmail": "alpha@example.com",
                "defaultTaxPercentage": 15.00,
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        today = date.today()
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(today),
                "due_date": str(today + timedelta(days=14)),
                # tax and tax_percentage omitted
                "items": [{"description": "Taxable Consultation", "quantity": 2.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["subtotal"] == "200.00"
        assert data["tax"] == "30.00"
        assert data["total"] == "230.00"

    def test_30b_explicit_tax_remains_respected(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """When tax_percentage is explicitly provided, it overrides settings default."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        today = date.today()
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(today),
                "due_date": str(today + timedelta(days=14)),
                "tax_percentage": 5.0,  # Explicit 5% tax
                "items": [{"description": "Service", "quantity": 2.0, "rate": 100.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["subtotal"] == "200.00"
        assert data["tax"] == "10.00"
        assert data["total"] == "210.00"

    def test_30c_currency_does_not_alter_existing_invoice_data(
        self, auth_user_settings_a, client_for_settings_user_a
    ):
        """Updating currency in BusinessSettings never alters amounts or totals of existing invoices."""
        token_a, _ = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Create an invoice
        res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "tax_percentage": 0.0,
                "items": [{"description": "Fixed Price Contract", "quantity": 1.0, "rate": 750.0}],
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )
        inv_id = res.json()["id"]

        # Change currency in settings from USD to EUR
        client.put(
            "/api/settings",
            json={
                "businessName": "Alpha Corp",
                "businessEmail": "alpha@example.com",
                "currency": "EUR",
            },
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # Retrieve existing invoice -> figures remain exactly 750.00
        get_res = client.get(f"/api/invoices/{inv_id}", headers={"Authorization": f"Bearer {token_a}"})
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["subtotal"] == "750.00"
        assert data["total"] == "750.00"

    # ==========================================
    # 7. LOGO UPLOAD & VALIDATION (Tests 31-41)
    # ==========================================
    def test_31_valid_png_accepted(self, auth_user_settings_a, mock_storage):
        """Upload valid PNG logo returns 200 with public logoUrl."""
        token, user = auth_user_settings_a
        img_bytes = create_test_image("PNG", (200, 200))
        res = client.post(
            "/api/settings/logo",
            files={"file": ("test_logo.png", img_bytes, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        logo_url = res.json()["logoUrl"]
        assert logo_url.startswith(settings.SUPABASE_URL)
        assert f"users/{user['id']}/logo/" in logo_url
        assert logo_url.endswith(".png")

    def test_32_valid_jpg_accepted(self, auth_user_settings_a, mock_storage):
        """Upload valid JPG logo returns 200."""
        token, _ = auth_user_settings_a
        img_bytes = create_test_image("JPEG", (150, 150))
        res = client.post(
            "/api/settings/logo",
            files={"file": ("test_logo.jpg", img_bytes, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["logoUrl"].endswith(".jpg")

    def test_33_valid_jpeg_accepted(self, auth_user_settings_a, mock_storage):
        """Upload valid JPEG logo returns 200."""
        token, _ = auth_user_settings_a
        img_bytes = create_test_image("JPEG", (150, 150))
        res = client.post(
            "/api/settings/logo",
            files={"file": ("test_logo.jpeg", img_bytes, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["logoUrl"].endswith(".jpg")

    def test_34_valid_webp_accepted(self, auth_user_settings_a, mock_storage):
        """Upload valid WEBP logo returns 200."""
        token, _ = auth_user_settings_a
        img_bytes = create_test_image("WEBP", (150, 150))
        res = client.post(
            "/api/settings/logo",
            files={"file": ("test_logo.webp", img_bytes, "image/webp")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["logoUrl"].endswith(".webp")

    def test_35_oversized_file_rejected(self, auth_user_settings_a):
        """Files > 2 MB are rejected with HTTP 413 Payload Too Large."""
        token, _ = auth_user_settings_a
        large_bytes = b"0" * (2 * 1024 * 1024 + 10)  # > 2 MB
        res = client.post(
            "/api/settings/logo",
            files={"file": ("large.png", large_bytes, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 413
        assert "exceeds" in res.json()["detail"].lower()

    def test_36_unsupported_mime_rejected(self, auth_user_settings_a):
        """Unsupported MIME type returns 415."""
        token, _ = auth_user_settings_a
        res = client.post(
            "/api/settings/logo",
            files={"file": ("document.pdf", b"%PDF-1.4", "application/pdf")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 415

    def test_37_forged_extension_rejected(self, auth_user_settings_a):
        """A text/HTML file renamed to .png is detected and rejected with 415."""
        token, _ = auth_user_settings_a
        fake_png = b"<html><script>alert(1)</script></html>"
        res = client.post(
            "/api/settings/logo",
            files={"file": ("hacked.png", fake_png, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 415

    def test_38_path_traversal_filename_sanitized(self, auth_user_settings_a, mock_storage):
        """Filenames containing path traversal characters are discarded for random UUIDs."""
        token, user = auth_user_settings_a
        img_bytes = create_test_image("PNG")
        res = client.post(
            "/api/settings/logo",
            files={"file": ("../../etc/passwd.png", img_bytes, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        logo_url = res.json()["logoUrl"]
        assert ".." not in logo_url
        assert f"users/{user['id']}/logo/" in logo_url

    def test_39_logo_replacement_deletes_old_object(
        self, auth_user_settings_a, mock_storage
    ):
        """Replacing a logo uploads the new logo and triggers deletion of the old object."""
        token, _ = auth_user_settings_a
        img1 = create_test_image("PNG", color="red")
        res1 = client.post(
            "/api/settings/logo",
            files={"file": ("logo1.png", img1, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res1.status_code == 200
        old_url = res1.json()["logoUrl"]

        # Upload replacement
        img2 = create_test_image("JPEG", color="green")
        res2 = client.post(
            "/api/settings/logo",
            files={"file": ("logo2.jpg", img2, "image/jpeg")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res2.status_code == 200
        new_url = res2.json()["logoUrl"]
        assert new_url != old_url
        # Confirm remove was called for old object
        mock_storage.remove.assert_called()

    def test_40_and_41_delete_logo_clears_db_and_is_idempotent(
        self, auth_user_settings_a, mock_storage, db_session: Session
    ):
        """DELETE /api/settings/logo clears logo_url in DB, and repeated calls return 204."""
        token, user = auth_user_settings_a

        # Ensure logo exists first
        img = create_test_image("PNG")
        client.post(
            "/api/settings/logo",
            files={"file": ("temp.png", img, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )

        # Delete logo
        res1 = client.delete("/api/settings/logo", headers={"Authorization": f"Bearer {token}"})
        assert res1.status_code == 204

        # Verify DB is cleared
        settings_db = (
            db_session.query(BusinessSettings)
            .filter(BusinessSettings.user_id == uuid.UUID(user["id"]))
            .first()
        )
        assert settings_db.logo_url is None

        # Idempotent second delete returns 204
        res2 = client.delete("/api/settings/logo", headers={"Authorization": f"Bearer {token}"})
        assert res2.status_code == 204

    # ==========================================
    # 8. STORAGE SAFETY & RESILIENCE (Tests 43-47)
    # ==========================================
    def test_43_arbitrary_external_url_cannot_be_deleted(self):
        """extract_safe_storage_path rejects arbitrary external domains."""
        user_id = uuid.uuid4()
        external_url = "https://external-storage.aws.com/buckets/billflow-logos/users/foo.png"
        path = extract_safe_storage_path(
            logo_url=external_url,
            supabase_url="https://jtnsakufuckvhwoluntr.supabase.co",
            bucket_name="billflow-logos",
            authenticated_user_id=user_id,
        )
        assert path is None

    def test_44_malformed_supabase_url_cannot_be_deleted(self):
        """extract_safe_storage_path rejects path traversal and wrong buckets."""
        user_id = uuid.uuid4()
        supabase_url = "https://jtnsakufuckvhwoluntr.supabase.co"

        # Traversal attempt
        traversal = f"{supabase_url}/storage/v1/object/public/billflow-logos/users/{user_id}/logo/../../other.png"
        assert extract_safe_storage_path(traversal, supabase_url, "billflow-logos", user_id) is None

        # Wrong bucket attempt
        wrong_bucket = f"{supabase_url}/storage/v1/object/public/private-bucket/users/{user_id}/logo/file.png"
        assert extract_safe_storage_path(wrong_bucket, supabase_url, "billflow-logos", user_id) is None

        # Another user's ID
        other_user = uuid.uuid4()
        foreign_user_url = f"{supabase_url}/storage/v1/object/public/billflow-logos/users/{other_user}/logo/file.png"
        assert extract_safe_storage_path(foreign_user_url, supabase_url, "billflow-logos", user_id) is None

    def test_45_excessive_image_dimensions_rejected(self, auth_user_settings_a):
        """Images with dimensions > 4096px are rejected with 415 to prevent memory exhaustion."""
        token, _ = auth_user_settings_a
        huge_img = create_test_image("PNG", size=(5000, 100))
        res = client.post(
            "/api/settings/logo",
            files={"file": ("huge.png", huge_img, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 415
        assert "dimensions" in res.json()["detail"].lower()

    def test_46_failed_upload_preserves_old_logo(self, auth_user_settings_a, db_session: Session):
        """If storage upload fails with an exception, database reference remains unchanged."""
        token, user = auth_user_settings_a

        # Set known initial logo in DB
        initial_url = f"https://jtnsakufuckvhwoluntr.supabase.co/storage/v1/object/public/billflow-logos/users/{user['id']}/logo/initial.png"
        settings_db = (
            db_session.query(BusinessSettings)
            .filter(BusinessSettings.user_id == uuid.UUID(user["id"]))
            .first()
        )
        settings_db.logo_url = initial_url
        db_session.commit()

        # Simulate upload network failure
        with patch("app.services.storage.get_supabase_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.storage.from_.side_effect = Exception("Supabase Storage Unavailable")
            mock_get_client.return_value = mock_client

            img = create_test_image("PNG")
            res = client.post(
                "/api/settings/logo",
                files={"file": ("new.png", img, "image/png")},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert res.status_code == 500

        # Confirm old DB reference was preserved
        db_session.refresh(settings_db)
        assert settings_db.logo_url == initial_url

    def test_47_public_invoice_returns_configured_logo(
        self, auth_user_settings_a, client_for_settings_user_a, mock_storage, db_session: Session
    ):
        """A public invoice viewed via its token includes the merchant's configured logoUrl."""
        token, user = auth_user_settings_a
        client_id = client_for_settings_user_a["id"]

        # Upload a known logo
        img = create_test_image("PNG")
        upload_res = client.post(
            "/api/settings/logo",
            files={"file": ("merchant_logo.png", img, "image/png")},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert upload_res.status_code == 200
        active_logo = upload_res.json()["logoUrl"]

        # Create a sent invoice
        inv_res = client.post(
            "/api/invoices",
            json={
                "client_id": client_id,
                "status": "sent",
                "issue_date": str(date.today()),
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Service", "quantity": 1.0, "rate": 500.0}],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert inv_res.status_code == 201
        inv_id = inv_res.json()["id"]

        # Get public token
        inv = db_session.query(Invoice).filter(Invoice.id == uuid.UUID(inv_id)).first()
        pub_token = inv.public_token

        # Unauthenticated public GET
        pub_res = client.get(f"/api/public/invoices/{pub_token}")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert pub_data["business"]["logo_url"] == active_logo
