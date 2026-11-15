from typing import Any, Literal

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    initials: str
    title: str
    role: str
    canDecide: bool


class LoginOut(BaseModel):
    token: str
    user: UserOut


class AnalyzeIn(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class ReviewIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=20000)


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class DecisionIn(BaseModel):
    decision: Literal["approve", "request_changes"]
    note: str = Field(default="", max_length=2000)


class VerifyIn(BaseModel):
    card: dict[str, Any]
