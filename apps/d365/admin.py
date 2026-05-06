from django.contrib import admin

from .models import D365PurchaseLine, D365PurchaseOrder


@admin.register(D365PurchaseOrder)
class D365PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = [
        'bc_document_no', 'vendor_no', 'vendor', 'posting_date',
        'document_date', 'is_open', 'synced_at'
    ]
    list_filter = ['is_open', 'synced_at']
    search_fields = ['bc_document_no', 'vendor_no']

@admin.register(D365PurchaseLine)
class D365PurchaseLineAdmin(admin.ModelAdmin):
    list_display = [
        'purchase_order', 'bc_line_no', 'account_no', 'description',
        'quantity', 'unit_cost'
    ]
    list_filter = ['purchase_order']
    search_fields = ['account_no', 'description']
