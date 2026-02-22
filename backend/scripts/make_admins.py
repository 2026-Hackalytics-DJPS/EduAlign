"""Set is_admin = True for specific usernames."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy import text
from backend.database import engine

ADMIN_USERNAMES = ["daniel", "danieljuliusstein", "james"]

with engine.connect() as conn:
    result = conn.execute(
        text("UPDATE users SET is_admin = 1 WHERE username IN (:u1, :u2, :u3)"),
        {"u1": ADMIN_USERNAMES[0], "u2": ADMIN_USERNAMES[1], "u3": ADMIN_USERNAMES[2]},
    )
    conn.commit()
    print(f"Updated {result.rowcount} user(s) to admin.")
