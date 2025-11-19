#!/usr/bin/env python3
"""
Utility to parse a ChatScope chat export into structured data.

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
)


@dataclass
class ChatEntry:
    timestamp: Optional[str]
    timestamp_text: str
    sender: Optional[str]
    message: str
    type: str  # 'message' or 'system'


def is_system_content(content: str) -> bool:
    stripped = content.lstrip()
    if any(stripped.startswith(prefix) for prefix in SYSTEM_PREFIXES):
        return True
    return any(pattern.search(stripped) for pattern in SYSTEM_PATTERNS)


def parse_timestamp(date_text: str, time_text: str, period: Optional[str]) -> Optional[str]:
    """Convert ChatScope date/time fragments into an ISO 8601 string."""
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

            if is_system_content(content):
                sender = None
                message_body = content
                entry_type = "system"
            else:
                sender: Optional[str]
                message_body: str
                entry_type: str

                delimiter = ": "
                if delimiter in content:
                    sender, message_body = content.split(delimiter, 1)
                    entry_type = "message"
                    if is_system_content(message_body):
                        sender = None
                        message_body = content
                        entry_type = "system"
                else:
                    sender = None
                    message_body = content
                    entry_type = "system"

            current_entry = ChatEntry(
                timestamp=parse_timestamp(date_text, time_text, period),
                timestamp_text=timestamp_text,
                sender=sender,
                message=message_body,
                type=entry_type,
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
    parser = argparse.ArgumentParser(description="Parse a ChatScope chat export.")
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
