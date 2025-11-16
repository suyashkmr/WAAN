#!/usr/bin/env python3
"""
Utility to parse a WhatsApp chat export into structured data.

The parser groups multi-line messages, preserves poll content, and distinguishes
between user messages and system events (e.g. join/leave notifications).  The
result can be emitted as JSON or printed as a quick summary from the command
line.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable, Iterator, List, Optional

MESSAGE_START = re.compile(
    r"^(?P<date>\d{1,2}/\d{1,2}/\d{2,4}), "
    r"(?P<time>\d{1,2}:\d{2})"
    r"(?: (?P<period>AM|PM|am|pm))? - "
    r"(?P<content>.*)$"
)

SYSTEM_PREFIXES = (
    "Messages and calls are end-to-end encrypted",
    "You created the group",
    "You changed",
    "You added",
    "You removed",
    "You left",
    "You invited",
    "You deleted",
    "This message was deleted",
    "Messages to this group are now",
    "You're now an admin",
    "An admin linked this group",
    "You turned",
    "You blocked",
    "You unblocked",
    "You made",
    "You enabled",
    "You disabled",
    "You accepted",
    "You rejected",
    "You reported",
    "You requested",
    "You sent",
)

SYSTEM_PATTERNS = (
    re.compile(r".*\bjoined using a group link\.?$", re.IGNORECASE),
    re.compile(r".*\bjoined using your invite\.?$", re.IGNORECASE),
    re.compile(r".*\bjoined from the community\.?$", re.IGNORECASE),
    re.compile(r".*\brequested to join\.?$", re.IGNORECASE),
    re.compile(r".*\bchanged this (?:group|community)'s\b.*$", re.IGNORECASE),
    re.compile(r".*\bchanged to allow\b.*$", re.IGNORECASE),
    re.compile(r".*\bapproved\b.*\bjoin request\b.*$", re.IGNORECASE),
    re.compile(r".*\bdeclined\b.*\bjoin request\b.*$", re.IGNORECASE),
)

STATUS_PATTERNS = (
    (
        re.compile(r"waiting for this message", re.IGNORECASE),
        ("Waiting on server", "⌛"),
    ),
    (
        re.compile(r"missed voice call", re.IGNORECASE),
        ("Missed voice call", "📞"),
    ),
    (
        re.compile(r"you deleted this message", re.IGNORECASE),
        ("Deleted", "🗑️"),
    ),
    (
        re.compile(r"this message was deleted", re.IGNORECASE),
        ("Deleted", "🗑️"),
    ),
)

SIZE_PATTERN = re.compile(r"\((?P<size>\d+(?:\.\d+)?)\s?(?P<unit>KB|MB|GB)\)", re.IGNORECASE)
DURATION_PATTERN = re.compile(r"\b(?:(?P<hours>\d+):)?(?P<minutes>\d{1,2}):(?P<seconds>\d{2})\b")
FILENAME_PATTERN = re.compile(
    r"([\w\-.]+\.(?:jpg|jpeg|png|gif|mp4|mp3|m4a|pdf|docx?|pptx?|xlsx?|vcf|zip|txt))",
    re.IGNORECASE,
)
STATUS_PATTERNS = (
    (
        re.compile(r"waiting for this message", re.IGNORECASE),
        ("Waiting on server", "⌛"),
    ),
    (
        re.compile(r"missed voice call", re.IGNORECASE),
        ("Missed voice call", "📞"),
    ),
    (
        re.compile(r"you deleted this message", re.IGNORECASE),
        ("Deleted", "🗑️"),
    ),
    (
        re.compile(r"this message was deleted", re.IGNORECASE),
        ("Deleted", "🗑️"),
    ),
)

SIZE_PATTERN = re.compile(r"\((?P<size>\d+(?:\.\d+)?)\s?(?P<unit>KB|MB|GB)\)", re.IGNORECASE)
DURATION_PATTERN = re.compile(r"\b(?:(?P<hours>\d+):)?(?P<minutes>\d{1,2}):(?P<seconds>\d{2})\b")
FILENAME_PATTERN = re.compile(
    r"([\w\-.]+\.(?:jpg|jpeg|png|gif|mp4|mp3|m4a|pdf|docx?|pptx?|xlsx?|vcf|zip|txt))",
    re.IGNORECASE,
)


@dataclass
class ChatEntry:
    timestamp: Optional[str]
    timestamp_text: str
    sender: Optional[str]
    message: str
    type: str  # 'message' or 'system'
    system_subtype: Optional[str] = None
    status_label: Optional[str] = None
    status_icon: Optional[str] = None
    attachment: Optional[dict] = None


def is_system_content(content: str) -> bool:
    stripped = content.lstrip()
    if any(stripped.startswith(prefix) for prefix in SYSTEM_PREFIXES):
        return True
    return any(pattern.search(stripped) for pattern in SYSTEM_PATTERNS)


def parse_timestamp(date_text: str, time_text: str, period: Optional[str]) -> Optional[str]:
    """Convert WhatsApp date/time fragments into an ISO 8601 string."""
    time_fragment = time_text
    timestamp_text = f"{date_text} {time_fragment}"
    formats: List[str]

    if period:
        period = period.upper()
        timestamp_text = f"{timestamp_text} {period}"
        formats = ["%d/%m/%y %I:%M %p", "%d/%m/%Y %I:%M %p"]
    else:
        formats = ["%d/%m/%y %H:%M", "%d/%m/%Y %H:%M"]

    for fmt in formats:
        try:
            return datetime.strptime(timestamp_text, fmt).isoformat()
        except ValueError:
            continue

    return None


def infer_status(message: str) -> tuple[Optional[str], Optional[str]]:
    if not message:
        return None, None
    lowered = message.strip().lower()
    for pattern, (label, icon) in STATUS_PATTERNS:
        if pattern.search(lowered):
            return label, icon
    return None, None


def extract_attachment_metadata(message: str) -> Optional[dict]:
    if not message:
        return None
    match_filename = FILENAME_PATTERN.search(message)
    match_size = SIZE_PATTERN.search(message)
    match_duration = DURATION_PATTERN.search(message)
    has_generic_attachment = "(file attached)" in message.lower()
    if not any((match_filename, match_size, match_duration, has_generic_attachment)):
        return None
    metadata: dict[str, str] = {}
    if match_filename:
        metadata["filename"] = match_filename.group(1)
    if match_size:
        metadata["size"] = f"{match_size.group('size')} {match_size.group('unit').upper()}"
    if match_duration:
        hours = int(match_duration.group("hours") or 0)
        minutes = int(match_duration.group("minutes") or 0)
        seconds = int(match_duration.group("seconds") or 0)
        if hours:
            metadata["duration"] = f"{hours}h {minutes}m {seconds}s"
        elif minutes:
            metadata["duration"] = f"{minutes}m {seconds}s"
        else:
            metadata["duration"] = f"{seconds}s"
    if has_generic_attachment and "filename" not in metadata:
        metadata["note"] = "Attachment detected"
    return metadata or None


def classify_system_message(sender: Optional[str], message: str) -> Optional[str]:
    if not message:
        return None
    sender_lower = (sender or "").strip().lower()
    body_lower = message.strip().lower()
    if not body_lower:
        return None

    auto_sender = (
        not sender_lower
        or sender_lower in {"you", "self community", "community", "whatsapp", "system"}
        or bool(re.search(r"(?:^|\s)admin(?:istrator)?$", sender_lower))
    )

    joined_phrases = (
        "joined using",
        "joined via",
        "joined from the community",
        "joined using this group's",
        "joined the group",
    )
    addition_phrases = ("you added", "you invited", "added ", "invited ")
    removal_phrases = ("removed ",)
    change_phrases = (
        "changed ",
        "changed the group settings",
        "changed group settings",
        "changed this group's",
        "changed this community's",
        "changed to allow only admins",
        "changed to allow all participants",
        "changed to only admins",
        "changed to everyone",
        "privacy settings",
        "created this group",
        "created this community",
        "updated this group's",
        "updated this community's",
    )
    request_phrase = "requested to join"
    leave_phrase = " left"

    def contains_any(text: str, phrases: Iterable[str]) -> bool:
        return any(phrase in text for phrase in phrases)

    if request_phrase in body_lower:
        return "membership_approval_request"
    if contains_any(body_lower, joined_phrases):
        if auto_sender or not sender_lower:
            return "text_join"
    if contains_any(body_lower, addition_phrases):
        if auto_sender or sender_lower == "self community":
            return "text_add"
    if contains_any(body_lower, removal_phrases):
        if auto_sender or sender_lower == "self community":
            return "text_remove"
    if leave_phrase in body_lower:
        if auto_sender or not sender_lower or body_lower.endswith(" left"):
            return "text_leave"
    if contains_any(body_lower, change_phrases):
        if auto_sender or sender_lower == "you":
            return "text_change"
    if "approved" in body_lower and "join request" in body_lower:
        return "membership_approval"
    if "declined" in body_lower and "join request" in body_lower:
        return "membership_approval_rejected"
    if body_lower.startswith("this message was deleted") or body_lower.startswith("you deleted this message"):
        return "text_delete"
    if body_lower.startswith("messages and calls are end-to-end encrypted") or body_lower.startswith(
        "missed voice call"
    ):
        return "text_system"

    return None


def infer_status(message: str) -> tuple[Optional[str], Optional[str]]:
    if not message:
        return None, None
    lowered = message.strip().lower()
    for pattern, (label, icon) in STATUS_PATTERNS:
        if pattern.search(lowered):
            return label, icon
    return None, None


def extract_attachment_metadata(message: str) -> Optional[dict]:
    if not message:
        return None
    match_filename = FILENAME_PATTERN.search(message)
    match_size = SIZE_PATTERN.search(message)
    match_duration = DURATION_PATTERN.search(message)
    has_generic_attachment = "(file attached)" in message.lower()
    if not any((match_filename, match_size, match_duration, has_generic_attachment)):
        return None
    metadata: dict[str, str] = {}
    if match_filename:
        metadata["filename"] = match_filename.group(1)
    if match_size:
        metadata["size"] = f"{match_size.group('size')} {match_size.group('unit').upper()}"
    if match_duration:
        hours = int(match_duration.group("hours") or 0)
        minutes = int(match_duration.group("minutes") or 0)
        seconds = int(match_duration.group("seconds") or 0)
        if hours:
            metadata["duration"] = f"{hours}h {minutes}m {seconds}s"
        elif minutes:
            metadata["duration"] = f"{minutes}m {seconds}s"
        else:
            metadata["duration"] = f"{seconds}s"
    if has_generic_attachment and "filename" not in metadata:
        metadata["note"] = "Attachment detected"
    return metadata or None


def iter_entries(lines: Iterable[str]) -> Iterator[ChatEntry]:
    """Yield chat entries from raw lines."""
    current_entry: Optional[ChatEntry] = None

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        if not line:
            if current_entry:
                current_entry.message += "\n"
            continue

        line = line.lstrip("\ufeff")
        match = MESSAGE_START.match(line)

        if match:
            if current_entry:
                yield current_entry

            date_text = match["date"]
            time_text = match["time"]
            period = match["period"]
            content = match["content"]

            timestamp_text = f"{date_text}, {time_text}"
            if period:
                timestamp_text = f"{timestamp_text} {period.upper()}"

            status_label = None
            status_icon = None
            attachment_meta = None
            system_subtype = None
            sender: Optional[str] = None
            message_body = content
            entry_type = "system"
            original_sender: Optional[str] = None

            if not is_system_content(content):
                entry_type = "message"
                delimiter = ": "
                if delimiter in content:
                    original_sender, message_body = content.split(delimiter, 1)
                    sender = original_sender
                    if is_system_content(message_body):
                        sender = None
                        entry_type = "system"
                else:
                    sender = None
                    message_body = content
                    entry_type = "system"

            if entry_type == "system":
                system_subtype = classify_system_message(original_sender, message_body)
            else:
                status_label, status_icon = infer_status(message_body)
                attachment_meta = extract_attachment_metadata(message_body)
                maybe_system = classify_system_message(original_sender, message_body)
                if maybe_system:
                    sender = None
                    entry_type = "system"
                    system_subtype = maybe_system
                    status_label = None
                    status_icon = None
                    attachment_meta = None

            current_entry = ChatEntry(
                timestamp=parse_timestamp(date_text, time_text, period),
                timestamp_text=timestamp_text,
                sender=sender,
                message=message_body,
                type=entry_type,
                system_subtype=system_subtype,
                status_label=status_label,
                status_icon=status_icon,
                attachment=attachment_meta,
            )
        else:
            if current_entry is None:
                # Skip orphaned lines that appear before the first timestamp.
                continue

            if current_entry.message:
                current_entry.message += "\n" + line
            else:
                current_entry.message = line

    if current_entry:
        yield current_entry


def parse_chat(path: Path) -> List[ChatEntry]:
    with path.open(encoding="utf-8") as handle:
        return list(iter_entries(handle))


def emit_json(entries: List[ChatEntry], destination: Path, pretty: bool) -> None:
    payload = [asdict(entry) for entry in entries]
    kwargs = {"indent": 2, "ensure_ascii": False} if pretty else {"ensure_ascii": False}
    destination.write_text(json.dumps(payload, **kwargs), encoding="utf-8")


def print_summary(entries: List[ChatEntry], limit: Optional[int]) -> None:
    total_messages = sum(1 for entry in entries if entry.type == "message")
    total_system = sum(1 for entry in entries if entry.type == "system")

    print(f"Parsed {len(entries)} entries ({total_messages} messages, {total_system} system events).")

    senders = Counter(entry.sender for entry in entries if entry.sender)
    if senders:
        print("Top senders:")
        for sender, count in senders.most_common(5):
            print(f"  {sender}: {count}")

    if limit:
        print(f"\nFirst {limit} entries:")
        for entry in entries[:limit]:
            prefix = entry.sender if entry.sender else "[system]"
            snippet = entry.message.replace("\n", " ")
            print(f"{entry.timestamp_text} - {prefix}: {snippet}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a WhatsApp chat export.")
    parser.add_argument("chat", type=Path, help="Path to the exported chat text file.")
    parser.add_argument("--json", type=Path, help="Write parsed messages to this JSON file.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--show", type=int, metavar="N", help="Print the first N parsed entries.")
    args = parser.parse_args()

    entries = parse_chat(args.chat)

    if args.json:
        emit_json(entries, args.json, args.pretty)
        print(f"Wrote {len(entries)} entries to {args.json}")

    print_summary(entries, args.show)


if __name__ == "__main__":
    main()
