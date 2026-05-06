import logging
from typing import Any, Dict, List

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class D365APIError(Exception):
    """Raised when D365 API returns non-2xx status."""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"D365 API Error {status_code}: {message}")


class D365Client:
    """
    D365 OData v4 REST API wrapper.
    Uses Basic auth with placeholder credentials from Django settings.
    """

    def __init__(self):
        self.base_url = settings.D365_BASE_URL
        self.username = settings.D365_USERNAME
        self.password = settings.D365_PASSWORD
        self.company_id = settings.D365_COMPANY_ID
        self.session = requests.Session()
        self.session.auth = (self.username, self.password)

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to D365 API endpoint."""
        url = f"{self.base_url}/companies({self.company_id})/{endpoint}"
        kwargs.setdefault("timeout", 30)
        response = self.session.request(method, url, **kwargs)

        if not response.ok:
            raise D365APIError(response.status_code, response.text)

        return response.json()

    def get_purchase_orders(self, filter: str = None) -> List[Dict[str, Any]]:
        """Get all open Purchase Headers (Document Type=2)"""
        params = {"$filter": "Document_Type eq 2"}
        if filter:
            params["$filter"] = f"{params['$filter']} and {filter}"
        params["$top"] = 100  # Limit to 100 items per page

        # Handle pagination manually
        all_headers = []
        url = f"{self.base_url}/companies({self.company_id})/PurchaseHeaders"
        while url:
            resp = self.session.request("GET", url, params=params, timeout=30)
            if not resp.ok:
                raise D365APIError(resp.status_code, resp.text)
            data = resp.json()
            all_headers.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
            params = {}  # nextLink already encodes all query params

        return all_headers

    def get_purchase_lines(self, document_no: str) -> List[Dict[str, Any]]:
        """Get Purchase Lines for a given header"""
        params = {"$filter": f"Document_No eq '{document_no}'"}
        response = self._make_request("GET", "PurchaseLines", params=params)
        return response.get("value", [])

    def create_purchase_header(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create Purchase Invoice header"""
        response = self._make_request("POST", "PurchaseHeaders", json=payload)
        return response

    def create_purchase_lines(self, doc_no: str, lines: List[Dict[str, Any]]) -> None:
        """Create Purchase Lines against a header"""
        for line in lines:
            line["Document_No"] = doc_no
            self._make_request("POST", "PurchaseLines", json=line)

    def get_purchase_header(self, document_no: str) -> Dict[str, Any]:
        """Get single Purchase Header"""
        response = self._make_request("GET", f"PurchaseHeaders('{document_no}')")
        return response

    def create_purchase_lines(self, doc_no: str, lines: List[Dict[str, Any]]) -> None:
        """Create Purchase Lines against a header"""
        for line in lines:
            line["Document_No"] = doc_no
            self._make_request("POST", "PurchaseLines", json=line)

    def get_purchase_header(self, document_no: str) -> Dict[str, Any]:
        """Get single Purchase Header"""
        response = self._make_request("GET", f"PurchaseHeaders('{document_no}')")
        return response
