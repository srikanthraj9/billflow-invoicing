from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any

TWOPLACES = Decimal("0.01")


def quantize_money(amount: Decimal) -> Decimal:
    """
    Rounds money values to 2 decimal places using standard ROUND_HALF_UP.
    """
    return amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def calculate_line_item_amount(quantity: Decimal, rate: Decimal) -> Decimal:
    """
    Computes exact line item amount: quantity * rate rounded to 2 decimal places.
    """
    return quantize_money(quantity * rate)


def calculate_invoice_totals(
    items: List[Dict[str, Decimal]],
    discount_amount: Decimal = Decimal("0.00"),
    discount_percentage: Decimal = Decimal("0.00"),
    tax_amount: Decimal = Decimal("0.00"),
    tax_percentage: Decimal = Decimal("0.00"),
) -> Dict[str, Decimal]:
    """
    Authoritative server-side financial calculation.
    Computes subtotal, discount, tax, and final total using pure fixed-point Decimal arithmetic.
    """
    subtotal = Decimal("0.00")
    for item in items:
        item_amount = calculate_line_item_amount(item["quantity"], item["rate"])
        subtotal += item_amount

    subtotal = quantize_money(subtotal)

    # Calculate discount
    if discount_percentage > Decimal("0.00"):
        calc_discount = quantize_money((subtotal * discount_percentage) / Decimal("100"))
    else:
        calc_discount = quantize_money(discount_amount)

    # Bound discount between 0.00 and subtotal
    effective_discount = max(Decimal("0.00"), min(subtotal, calc_discount))
    taxable_amount = max(Decimal("0.00"), subtotal - effective_discount)

    # Calculate tax
    if tax_percentage > Decimal("0.00"):
        calc_tax = quantize_money((taxable_amount * tax_percentage) / Decimal("100"))
    else:
        calc_tax = quantize_money(tax_amount)

    effective_tax = max(Decimal("0.00"), calc_tax)

    # Calculate final total
    total = max(Decimal("0.00"), taxable_amount + effective_tax)

    return {
        "subtotal": subtotal,
        "discount": effective_discount,
        "tax": effective_tax,
        "total": total,
    }


def compute_effective_status(status: str, due_date: date) -> str:
    """
    Canonical effective status evaluation for invoices:
    - draft -> draft
    - paid -> paid
    - sent + due_date < today -> overdue
    - sent + due_date >= today -> sent
    - overdue + due_date < today -> overdue
    """
    if status == "paid":
        return "paid"
    if status == "draft":
        return "draft"
    if status == "sent":
        if due_date < date.today():
            return "overdue"
        return "sent"
    if status == "overdue":
        if due_date < date.today():
            return "overdue"
        return "overdue"
    return status


def format_currency(amount: Decimal, currency: str = "INR") -> str:
    """
    Formats monetary Decimal amounts with currency symbol and standard locale formatting.
    Supported currencies: INR, USD, EUR, GBP.
    """
    curr = currency.upper().strip() if currency else "INR"
    q_amount = quantize_money(amount)

    if curr == "INR":
        sign = "-" if q_amount < Decimal("0.00") else ""
        abs_amt = abs(q_amount)
        parts = f"{abs_amt:.2f}".split(".")
        integer_part = parts[0]
        decimal_part = parts[1]

        if len(integer_part) > 3:
            last3 = integer_part[-3:]
            remaining = integer_part[:-3]
            res = []
            while len(remaining) > 2:
                res.insert(0, remaining[-2:])
                remaining = remaining[:-2]
            if remaining:
                res.insert(0, remaining)
            formatted_int = ",".join(res) + "," + last3
        else:
            formatted_int = integer_part
        return f"{sign}₹{formatted_int}.{decimal_part}"
    elif curr == "USD":
        return f"${q_amount:,.2f}"
    elif curr == "EUR":
        return f"€{q_amount:,.2f}"
    elif curr == "GBP":
        return f"£{q_amount:,.2f}"
    else:
        return f"{curr} {q_amount:,.2f}"

