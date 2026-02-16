#!/usr/bin/env python3
"""
Generate a compact analytics summary from the parsed ChatScope chat JSON.

This script reads `chat.json` (created with parse_whatsapp.py) and writes
`analytics.json` containing pre-aggregated metrics for the web dashboard.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path


def load_chat(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def iso_date(ts: str) -> str:
    return datetime.fromisoformat(ts).date().isoformat()


def main() -> None:
    base = Path(__file__).parent
    chat_path = base / "chat.json"
    if not chat_path.exists():
        raise SystemExit("chat.json not found. Run parse_whatsapp.py first.")

    entries = load_chat(chat_path)
    messages = [entry for entry in entries if entry["type"] == "message"]
    systems = [entry for entry in entries if entry["type"] == "system"]

    sender_counts = Counter(entry["sender"] for entry in messages if entry["sender"])

    # Daily distribution
    daily_counts: Counter[str] = Counter()
    for entry in messages:
        if entry["timestamp"]:
            day = iso_date(entry["timestamp"])
        else:
            day = entry["timestamp_text"].split(",")[0]
        daily_counts[day] += 1

    daily_series = [
        {"date": day, "count": daily_counts[day]}
        for day in sorted(daily_counts)
    ]

    # Hourly distribution
    hourly_counts: Counter[int] = Counter()
    for entry in messages:
        if not entry["timestamp"]:
            continue
        hour = datetime.fromisoformat(entry["timestamp"]).hour
        hourly_counts[hour] += 1

    hourly_series = [{"hour": h, "count": hourly_counts.get(h, 0)} for h in range(24)]

    # Week distribution
    weekly_counts: Counter[str] = Counter()
    for entry in messages:
        ts = entry["timestamp"]
        if not ts:
            continue
        dt = datetime.fromisoformat(ts)
        iso_year, iso_week, _ = dt.isocalendar()
        weekly_counts[f"{iso_year}-W{iso_week:02d}"] += 1
    weekly_series = [
        {"week": key, "count": weekly_counts[key]}
        for key in sorted(weekly_counts)
    ]

    # Message stats
    char_lengths = [len(entry["message"]) for entry in messages]
    avg_chars = sum(char_lengths) / len(char_lengths) if char_lengths else 0.0
    word_counts = [len(entry["message"].split()) for entry in messages]
    avg_words = sum(word_counts) / len(word_counts) if word_counts else 0.0

    media_count = sum(1 for entry in messages if "<Media omitted>" in entry["message"])
    link_count = sum(
        1
        for entry in messages
        if "http://" in entry["message"] or "https://" in entry["message"]
    )
    poll_count = sum(1 for entry in messages if entry["message"].startswith("POLL:"))

    join_events = sum(
        1
        for entry in systems
        if "joined" in entry["message"] or "joined using" in entry["message"]
    )

    first_ts = min(
        (entry["timestamp"] for entry in messages if entry["timestamp"]), default=None
    )
    last_ts = max(
        (entry["timestamp"] for entry in messages if entry["timestamp"]), default=None
    )

    summary = {
        "total_entries": len(entries),
        "total_messages": len(messages),
        "total_system": len(systems),
        "unique_senders": len(sender_counts),
        "date_range": {
            "start": iso_date(first_ts) if first_ts else None,
            "end": iso_date(last_ts) if last_ts else None,
        },
        "top_senders": [
            {"sender": sender, "count": count}
            for sender, count in sender_counts.most_common()
        ],
        "daily_counts": daily_series,
        "hourly_distribution": hourly_series,
        "weekly_counts": weekly_series,
        "averages": {
            "characters": avg_chars,
            "words": avg_words,
        },
        "media_count": media_count,
        "link_count": link_count,
        "poll_count": poll_count,
        "join_events": join_events,
    }

    output_path = base / "analytics.json"
    output_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote analytics to {output_path}")


if __name__ == "__main__":
    main()
