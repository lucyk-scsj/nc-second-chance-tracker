"""Check data/expunctions_by_statute.csv against the totals AOC reports for each year.

Run: python scripts/validate_data.py
Exits non-zero if any year's statute counts don't add up to the report total,
or if a row has a missing or unknown category.
"""
import csv
import sys
from collections import defaultdict
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "docs" / "data"
CATEGORIES = {"automatic", "petition_nonconviction", "adult_conviction", "youth_conviction", "other"}

sums = defaultdict(int)
errors = []
with open(DATA / "expunctions_by_statute.csv", newline="") as f:
    for i, row in enumerate(csv.DictReader(f), start=2):
        if row["category"] not in CATEGORIES:
            errors.append(f"line {i}: unknown category {row['category']!r}")
        try:
            sums[row["fiscal_year"]] += int(row["count"])
        except ValueError:
            errors.append(f"line {i}: count is not a whole number: {row['count']!r}")

with open(DATA / "report_totals.csv", newline="") as f:
    for row in csv.DictReader(f):
        fy, expected = row["fiscal_year"], int(row["total"])
        got = sums.pop(fy, 0)
        status = "ok" if got == expected else "MISMATCH"
        print(f"{fy}: statutes sum to {got:,}, report says {expected:,} -> {status}")
        if got != expected:
            errors.append(f"{fy}: statute rows sum to {got:,} but the report total is {expected:,}")

for fy in sums:
    errors.append(f"{fy}: has statute rows but no entry in report_totals.csv")

if errors:
    print("\n".join(["", "Problems found:"] + errors))
    sys.exit(1)
print("All years match.")
