# ScheduleConvert

Converts FrameMaker MIF table references to XML using Node.js.

## Rule implemented

`<ATbl N>` is resolved using the table block with matching `<TblID N>`.

## Usage

```bash
node mif_to_xml.js input.mif -o output.xml
```

If `-o` is omitted, XML prints to stdout.

## Run tests

```bash
npm test
```
