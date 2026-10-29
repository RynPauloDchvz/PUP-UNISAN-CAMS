from django.db import migrations


def enable_rls_on_public_tables(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public' AND rowsecurity = false;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        for table_name in tables:
            safe_table = table_name.replace('"', '""')
            cursor.execute(f'ALTER TABLE public."{safe_table}" ENABLE ROW LEVEL SECURITY;')


def disable_rls_on_public_tables(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public' AND rowsecurity = true;
        """)
        tables = [row[0] for row in cursor.fetchall()]
        for table_name in tables:
            safe_table = table_name.replace('"', '""')
            cursor.execute(f'ALTER TABLE public."{safe_table}" DISABLE ROW LEVEL SECURITY;')


class Migration(migrations.Migration):

    dependencies = [
        ('campus_app', '0031_orgofficer'),
    ]

    operations = [
        migrations.RunPython(enable_rls_on_public_tables, disable_rls_on_public_tables),
    ]
