
import sqlite3
import os

db_path = "db.sqlite3"

def fix_db():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create core_group_profile
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS core_group_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                policies TEXT NOT NULL DEFAULT '{}',
                group_id integer NOT NULL UNIQUE REFERENCES auth_group(id)
            )
        """)
        print("Created core_group_profile")
    except Exception as e:
        print(f"Error creating core_group_profile: {e}")

    # Add bc_vendor_no to core_vendor
    try:
        cur.execute("ALTER TABLE core_vendor ADD COLUMN bc_vendor_no varchar(50) NOT NULL DEFAULT ''")
        print("Added bc_vendor_no to core_vendor")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("bc_vendor_no already exists")
        else:
            print(f"Error adding bc_vendor_no: {e}")

    # Drop core_notification if it exists
    try:
        cur.execute("DROP TABLE IF EXISTS core_notification")
        print("Dropped core_notification")
    except Exception as e:
        print(f"Error dropping core_notification: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_db()
