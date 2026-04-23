from django.db import migrations


def fix_employee_grade_sqlite(apps, schema_editor):
    """
    Fix employee_grade column from varchar(10) to integer in SQLite only.
    PostgreSQL enforces types natively so this is a no-op there.
    """
    if schema_editor.connection.vendor != 'sqlite':
        return

    cursor = schema_editor.connection.cursor()

    # Check if the column is already integer type
    cursor.execute("PRAGMA table_info(core_user)")
    cols = cursor.fetchall()
    grade_col = next((c for c in cols if c[1] == 'employee_grade'), None)
    if not grade_col or grade_col[2].lower() == 'integer':
        return  # Already correct type

    # Rebuild table with proper integer column
    cursor.execute("PRAGMA foreign_keys=OFF")
    cursor.execute("CREATE TABLE core_user_new AS SELECT * FROM core_user")
    cursor.execute("DROP TABLE core_user")
    cursor.execute("""
        CREATE TABLE "core_user" (
            "id" char(32) NOT NULL PRIMARY KEY,
            "password" varchar(128) NOT NULL,
            "last_login" datetime NULL,
            "is_superuser" bool NOT NULL,
            "username" varchar(150) NOT NULL UNIQUE,
            "first_name" varchar(150) NOT NULL,
            "last_name" varchar(150) NOT NULL,
            "email" varchar(254) NOT NULL,
            "is_staff" bool NOT NULL,
            "is_active" bool NOT NULL,
            "date_joined" datetime NOT NULL,
            "department_id" char(32) NULL REFERENCES "core_department" ("id"),
            "employee_grade" integer NOT NULL DEFAULT 1
        )
    """)
    cursor.execute("""
        INSERT INTO core_user (
            id, password, last_login, is_superuser, username,
            first_name, last_name, email, is_staff, is_active,
            date_joined, department_id, employee_grade
        )
        SELECT
            id, password, last_login, is_superuser, username,
            first_name, last_name, email, is_staff, is_active,
            date_joined, department_id,
            CAST(employee_grade AS INTEGER)
        FROM core_user_new
    """)
    cursor.execute("DROP TABLE core_user_new")
    cursor.execute("PRAGMA foreign_keys=ON")


class Migration(migrations.Migration):
    """Fix employee_grade column from varchar(10) to integer (SQLite only)."""

    dependencies = [
        ("core", "0002_alter_user_role"),
    ]

    operations = [
        migrations.RunPython(fix_employee_grade_sqlite, migrations.RunPython.noop),
    ]
