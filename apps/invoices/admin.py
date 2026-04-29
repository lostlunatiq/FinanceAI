from django.contrib import admin
from .models import AIFeedback


@admin.register(AIFeedback)
class AIFeedbackAdmin(admin.ModelAdmin):
    list_display = ["task_type", "vendor_name", "is_positive", "created_by", "created_at"]
    list_filter = ["task_type", "is_positive"]
    search_fields = ["vendor_name", "comment"]
    readonly_fields = ["id", "created_at"]
