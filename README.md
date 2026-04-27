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

You can also use `--input-folder` and `--output-folder` as aliases.

### Convert from default `input/` to `output/`

```bash
node mif_to_xml.js
```

When run with no arguments, the script reads `*.mif` files from `./input` and writes `*.xml` files to `./output`.

## Run tests

```bash
npm test
```
