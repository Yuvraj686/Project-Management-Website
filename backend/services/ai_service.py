"""
TeamForge — AI Service (Google Gemini)

Uses the new Google GenAI Python SDK with the FREE `gemini-2.5-flash` model.
Free tier limits: 15 RPM · 1M TPM · 1,500 requests/day — no credit card needed.
Get your key at: https://aistudio.google.com/app/apikey

Implements three async helpers:
  - review_project()             : full project audit
  - generate_deadline_warning()  : context-aware deadline alert with sprint plan
  - summarize_diff()             : plain-English diff summary for changelog
  - get_assistant_response()     : Team-focused AI assistant persona
"""

from google import genai
from config import settings
import asyncio

# Initialize the GenAI client with our API key
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Use the latest fast model
_MODEL_NAME = "gemini-2.5-flash"


async def review_project(project: dict) -> str:
    """
    Ask Gemini to perform a holistic project review.

    Args:
        project: dict with keys: name, description, stack, deadline,
                 completion_pct, tasks (list of task dicts)

    Returns:
        Markdown-formatted review covering architecture, gaps, UX, and competitors.
    """
    prompt = f"""You are a senior software architect reviewing a software project for a team.

Project Name: {project.get('name', 'Unknown')}
Description: {project.get('description', 'No description provided')}
Tech Stack: {project.get('stack', 'Not specified')}
Deadline: {project.get('deadline', 'Not set')}
Completion: {project.get('completion_pct', 0):.1f}%

Open Tasks:
{_format_tasks(project.get('tasks', []))}

{f"Additional context: {project.get('extra_context')}" if project.get('extra_context') else ""}

Please provide a detailed review in Markdown with these four sections:

## 1. Architecture & Code Quality
Evaluate the tech stack choices and architectural decisions. Highlight strengths and risks.

## 2. Missing Features / Gaps
Identify what is missing relative to the project's stated goals.

## 3. UX & Design Suggestions
Suggest improvements to user experience and interface design.

## 4. Competitive Analysis
Briefly compare to similar tools and highlight differentiators or missing competitive features.

Be specific, actionable, and concise. Address the team directly."""

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=_MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=1024,
            ),
        )
    )
    return response.text


async def generate_deadline_warning(project: dict) -> str:
    """
    Generate a specific, actionable deadline warning for a project.

    Args:
        project: dict with keys: name, deadline, completion_pct,
                 days_remaining (float), tasks (list)

    Returns:
        A plain-English warning with a suggested sprint plan (max ~200 words).
    """
    days = project.get("days_remaining", 0)
    pct = project.get("completion_pct", 0)
    remaining_tasks = [t for t in project.get("tasks", []) if t.get("status") != "done"]

    prompt = f"""You are a project manager advising a software team about an approaching deadline.

Project: {project.get('name')}
Deadline: {project.get('deadline')}
Current Completion: {pct:.1f}%
Days Remaining: {days:.1f}
Remaining Tasks ({len(remaining_tasks)}):
{_format_tasks(remaining_tasks)}

Write a concise but specific deadline warning (max 200 words) that:
1. Assesses the risk level clearly (On Track / At Risk / Critical)
2. Names the most important 2-3 tasks to prioritise right now
3. Suggests what to defer to post-launch
4. Proposes a concrete day-by-day sprint plan for the remaining time

Be direct, honest, and team-friendly. No generic advice — reference actual task names."""

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=_MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.5,
                max_output_tokens=512,
            ),
        )
    )
    return response.text


async def summarize_diff(diff: str, author: str) -> str:
    """
    Convert a unified diff into a readable plain-English summary.

    Args:
        diff:   Unified diff text (git diff format or simple line diff)
        author: GitHub username or VS Code user who made the change

    Returns:
        2-5 sentence summary of what changed and why it matters.
    """
    # Truncate very large diffs to stay within token limits
    truncated_diff = diff[:4000] if len(diff) > 4000 else diff

    prompt = f"""You are a code reviewer writing a changelog summary for a team.

Author: {author}
Code change:
```
{truncated_diff}
```

Write a 2–5 sentence plain-English summary that explains:
- What files or functions were changed
- What the change does at a high level
- Why it likely matters to the project

Be specific. Reference actual file names and function names if visible in the diff."""

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=_MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=256,
            ),
        )
    )
    return response.text


async def get_assistant_response(context_data: dict, user_message: str) -> str:
    """
    Generate a response from the Antigravity Assistant.

    Args:
        context_data: dict with room info, project name, etc.
        user_message: the user's latest query

    Returns:
        concise, professional assistant response.
    """
    is_group = not context_data.get("is_private", False)
    room_name = context_data.get("room_name", "General")
    project_name = context_data.get("project_name", "the project")

    system_prompt = f"""You are Antigravity Assistant, the built-in AI helper for the Antigravity team collaboration platform.
Your role is to support team members within their chat environment.

## Current Context
- Chat Type: {"Group Conversation" if is_group else "1-on-1 / Personal Chat"}
- Room: {f"#{room_name}" if is_group else "Private DM"}
- Project: {project_name}

## Your Persona & Guidelines
- Help team members communicate clearly and professionally.
- Summarize long group conversations when asked.
- Draft or improve messages, announcements, or updates.
- Answer questions related to team tasks, coordination, and collaboration.
- Suggest action items or next steps from discussions.
- Help resolve misunderstandings by rephrasing messages neutrally.
- Tone: Friendly, professional, and inclusive.
- Format: Keep responses concise and relevant to the conversation context.
- Privacy: NEVER reference content from other chats or users not in this conversation.
- Addressing: {"Address the group collectively unless responding to a specific person" if is_group else "Keep a warm and 1-on-1 focused tone"}.
- Neutrality: Never take sides in team disagreements — stay neutral and constructive."""

    prompt = f"{system_prompt}\n\nUser Message: {user_message}\n\nAssistant:"

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model=_MODEL_NAME,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=512,
            ),
        )
    )
    return response.text


def _format_tasks(tasks: list) -> str:
    """Helper: format a list of task dicts as a numbered list string."""
    if not tasks:
        return "  (none)"
    lines = []
    for i, task in enumerate(tasks, start=1):
        status = task.get("status", "unknown")
        title = task.get("title", "Untitled")
        due = task.get("due_date", "no due date")
        lines.append(f"  {i}. [{status.upper()}] {title} (due: {due})")
    return "\n".join(lines)
