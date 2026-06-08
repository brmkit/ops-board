from pydantic import BaseModel
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    host = "host"
    identity = "identity"
    service = "service"
    credential = "credential"
    finding = "finding"
    question = "question"


class NodeStatus(str, Enum):
    active = "active"
    dormant = "dormant"
    burned = "burned"
    done = "done"


class EdgeState(str, Enum):
    confirmed = "confirmed"
    hypothetical = "hypothetical"
    blocked = "blocked"
    interrupted = "interrupted"
