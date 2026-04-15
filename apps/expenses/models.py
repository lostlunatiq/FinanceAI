import uuid
from django.db import models


class ExpensePolicyLimit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.CharField(max_length=60)
    grade_min = models.CharField(max_length=10)
    grade_max = models.CharField(max_length=10)
    daily_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    per_item_limit = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    auto_approve_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=500)

    class Meta:
        db_table = "expenses_policylimit"

