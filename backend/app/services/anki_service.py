import io
import logging
import random

import genanki

logger = logging.getLogger(__name__)

FLASHCARD_MODEL_ID = random.randint(1000000000, 9999999999)
FLASHCARD_DECK_ID_BASE = random.randint(1000000000, 9999999999)

FLASHCARD_MODEL = genanki.Model(
    FLASHCARD_MODEL_ID,
    "Trilha Flashcard",
    fields=[
        {"name": "Frente"},
        {"name": "Verso"},
        {"name": "Tags"},
    ],
    templates=[
        {
            "name": "Card 1",
            "qfmt": '<div class="frente">{{Frente}}</div>',
            "afmt": (
                '<div class="frente">{{Frente}}</div>'
                '<hr id="answer">'
                '<div class="verso">{{Verso}}</div>'
                '<div class="tags" style="margin-top: 10px; color: #888; font-size: 0.8em;">{{Tags}}</div>'
            ),
        },
    ],
    css=(
        ".card { font-family: Arial, sans-serif; font-size: 16px; text-align: left; "
        "color: #1E293B; background-color: #F8FAFC; padding: 20px; } "
        ".frente { font-weight: bold; font-size: 18px; margin-bottom: 10px; } "
        ".verso { font-size: 15px; line-height: 1.6; } "
        ".tags { margin-top: 15px; font-style: italic; }"
    ),
)


def _format_tags(tags: list[str]) -> str:
    if not tags:
        return ""
    return " | ".join(tags)


def criar_apkg(
    flashcards: list[dict],
    deck_name: str = "Flashcards Trilha",
    plano: str = "free",
) -> bytes:
    deck = genanki.Deck(FLASHCARD_DECK_ID_BASE, deck_name)

    footer_note = "Gerado com Trilha"
    if plano == "free":
        footer_note += " | Plano Gratuito"

    for fc in flashcards:
        tags_str = _format_tags(fc.get("tags", []))
        verso_text = fc.get("verso", "")
        verso_text += f'\n\n<small style="color: #999; font-style: italic;">{footer_note}</small>'

        note = genanki.Note(
            model=FLASHCARD_MODEL,
            fields=[
                fc.get("frente", ""),
                verso_text,
                tags_str,
            ],
            tags=fc.get("tags", []),
        )
        deck.add_note(note)

    package = genanki.Package(deck)
    package.media_files = []

    buf = io.BytesIO()
    package.write_to_file(buf)
    return buf.getvalue()
