from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class AIMessage:
    role: str
    content: Any
