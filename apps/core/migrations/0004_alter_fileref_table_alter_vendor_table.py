from django.db import migrations


def rename_legacy_tables_sqlite(apps, schema_editor):
    """
    Rename invoices_vendor → core_vendor and invoices_fileref → core_fileref
    on SQLite local dev only. PostgreSQL already has the correct table names.
    """
    if schema_editor.connection.vendor != 'sqlite':
        return

    cursor = schema_editor.connection.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices_vendor'")
    if cursor.fetchone():
        cursor.execute("ALTER TABLE invoices_vendor RENAME TO core_vendor")

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices_fileref'")
    if cursor.fetchone():
        cursor.execute("ALTER TABLE invoices_fileref RENAME TO core_fileref")


def reverse_rename_legacy_tables_sqlite(apps, schema_editor):
    if schema_editor.connection.vendor != 'sqlite':
        return
    cursor = schema_editor.connection.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='core_vendor'")
    if cursor.fetchone():
        cursor.execute("ALTER TABLE core_vendor RENAME TO invoices_vendor")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='core_fileref'")
    if cursor.fetchone():
        cursor.execute("ALTER TABLE core_fileref RENAME TO invoices_fileref")


class Migration(migrations.Migration):
    """Rename legacy invoices_* tables to core_* on SQLite local dev."""

    dependencies = [
        ("core", "0003_fix_employee_grade_integer"),
    ]

    operations = [
        migrations.RunPython(
            rename_legacy_tables_sqlite,
            reverse_rename_legacy_tables_sqlite,
        ),
    ]
