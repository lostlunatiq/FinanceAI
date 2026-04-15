from __future__ import annotations
import json
from dataclasses import dataclass
from typing import Any
from django.conf import settings


@dataclass
class AIMessage:
    role: str
    content: Any
