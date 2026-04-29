from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_aicopilotlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="change_summary",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="entity_display_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="metadata",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="request_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="user_agent",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["request_id"], name="core_auditl_request_2f651b_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["ip_address", "created_at"], name="core_auditl_ip_addr_664863_idx"),
        ),
    ]
