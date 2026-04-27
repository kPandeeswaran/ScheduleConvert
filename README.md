# ScheduleConvert

Converts FrameMaker MIF table references to XML using Node.js.

## Rule implemented

`<ATbl N>` is resolved using the table block with matching `<TblID N>`.

## Usage

### Convert one MIF file

```bash
node mif_to_xml.js input.mif -o output.xml
```

If `-o` is omitted, XML prints to stdout.

### Convert all MIF files in a separate folder

```bash
node mif_to_xml.js --input-dir ./mif --output-dir ./xml
```

This reads every `*.mif` file in `./mif` and writes matching `*.xml` files to `./xml`.

## Run tests

```bash
npm test
```
