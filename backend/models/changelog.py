"""
TeamForge — ChangeLogEntry ORM Model

Table:
    changelog_entries — records every code change from GitHub or VS Code,
                        along with an AI-generated plain-English summary.
"""

import enum

from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class ChangeSource(str, enum.Enum):
    """Origin of the change log entry."""
    github = "github"
    vscode = "vscode"
    manual = "manual"


class ChangeLogEntry(Base):
    """Records a code-change event with an AI-generated summary."""

    __tablename__ = "changelog_entries"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source = Column(SAEnum(ChangeSource), nullable=False, default=ChangeSource.manual)
    summary = Column(Text, nullable=False, doc="AI-generated plain-English summary")
    raw_diff = Column(Text, nullable=True, doc="Original unified diff text")
    author = Column(String(255), nullable=True, doc="GitHub username or VS Code user")
    commit_sha = Column(String(64), nullable=True, doc="GitHub commit SHA if source=github")
    file_path = Column(String(512), nullable=True, doc="Affected file path if source=vscode")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship
    project = relationship("Project", back_populates="changelog_entries")

    def __repr__(self) -> str:
        return f"<ChangeLogEntry id={self.id} project={self.project_id} source={self.source}>"
