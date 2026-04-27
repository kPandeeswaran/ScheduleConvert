# ScheduleConvert

Converts FrameMaker MIF table references to XML.

## Rule implemented

`<ATbl N>` is resolved using the table block with matching `<TblID N>`.

## Usage

```bash
python3 mif_to_xml.py input.mif -o output.xml
```

If `-o` is omitted, XML prints to stdout.
