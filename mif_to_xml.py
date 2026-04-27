#!/usr/bin/env python3
"""Convert FrameMaker MIF table definitions into XML.

Rule implemented for lawconvert-style documents:
- Anchor token `<ATbl N>` references the table block whose `<TblID N>` matches.
- The referenced `<Tbl ...>` block is converted to XML table rows/cells.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable
from xml.etree.ElementTree import Element, SubElement, tostring

ATBL_RE = re.compile(r"<ATbl\s+(\d+)>")


@dataclass
class MifCell:
    text_parts: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return " ".join(part.strip() for part in self.text_parts if part.strip()).strip()


@dataclass
class MifRow:
    cells: list[MifCell] = field(default_factory=list)


@dataclass
class MifTable:
    table_id: int
    rows: list[MifRow] = field(default_factory=list)


def _extract_table_blocks(mif_text: str) -> list[str]:
    """Extract raw `<Tbl ...>` blocks using begin/end comments."""
    blocks: list[str] = []
    current: list[str] | None = None

    for line in mif_text.splitlines():
        stripped = line.strip()
        if re.match(r"^<Tbl(?:\s|$)", stripped):

            current = [line]
            continue
        if current is not None:
            current.append(line)
            if stripped.startswith("> # end of Tbl"):
                blocks.append("\n".join(current))
                current = None

    return blocks


def _find_tag_value(line: str, tag: str) -> str | None:
    m = re.search(rf"<{re.escape(tag)}\s+(.+?)>", line)
    if not m:
        return None
    return m.group(1).strip()


def _string_from_line(line: str) -> str | None:
    m = re.search(r"<String\s+`(.*)'>", line)
    if not m:
        return None
    return m.group(1)


def parse_table(block: str) -> MifTable | None:
    table_id: int | None = None
    rows: list[MifRow] = []
    current_row: MifRow | None = None
    current_cell: MifCell | None = None

    for line in block.splitlines():
        stripped = line.strip()

        if table_id is None:
            raw_id = _find_tag_value(stripped, "TblID")
            if raw_id and raw_id.isdigit():
                table_id = int(raw_id)

        if re.match(r"^<Row(?:\s|$)", stripped):

            current_row = MifRow()
            rows.append(current_row)
            continue

        if re.match(r"^<Cell(?:\s|$)", stripped):

            if current_row is None:
                continue
            current_cell = MifCell()
            current_row.cells.append(current_cell)
            continue

        if stripped.startswith("> # end of Cell"):
            current_cell = None
            continue

        string_val = _string_from_line(stripped)
        if string_val is not None and current_cell is not None:
            current_cell.text_parts.append(string_val)

    if table_id is None:
        return None
    return MifTable(table_id=table_id, rows=rows)


def parse_tables(mif_text: str) -> dict[int, MifTable]:
    tables: dict[int, MifTable] = {}
    for block in _extract_table_blocks(mif_text):
        table = parse_table(block)
        if table is not None:
            tables[table.table_id] = table
    return tables


def table_to_xml(table: MifTable) -> Element:
    table_el = Element("table", {"id": str(table.table_id)})
    for row in table.rows:
        row_el = SubElement(table_el, "row")
        for cell in row.cells:
            cell_el = SubElement(row_el, "cell")
            cell_el.text = cell.text
    return table_el


def convert_anchors_to_xml(mif_text: str) -> str:
    """Generate XML output for each `<ATbl N>` using the matching `<TblID N>` block."""
    tables = parse_tables(mif_text)
    root = Element("tables")

    seen: set[int] = set()
    for match in ATBL_RE.finditer(mif_text):
        table_id = int(match.group(1))
        if table_id in seen:
            continue
        seen.add(table_id)
        table = tables.get(table_id)
        if table is None:
            SubElement(root, "missing-table", {"id": str(table_id)})
            continue
        root.append(table_to_xml(table))

    return tostring(root, encoding="unicode")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Convert MIF table references (ATbl) to XML tables")
    parser.add_argument("input", type=Path, help="Input MIF file path")
    parser.add_argument("-o", "--output", type=Path, help="Output XML file path")
    args = parser.parse_args(list(argv) if argv is not None else None)

    mif_text = args.input.read_text(encoding="utf-8")
    xml_text = convert_anchors_to_xml(mif_text)

    if args.output:
        args.output.write_text(xml_text + "\n", encoding="utf-8")
    else:
        print(xml_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
