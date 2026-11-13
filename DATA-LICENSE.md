# Data usage

These terms cover the generated game data published at https://data.poe.re
(mods, items, gems, maps, waystones, tablets, relics, their regexes and the
trade id maps), and its copies in this repo (`poe/generated`,
`poe/public/generated`, `poe/src/generated`, `poe2/generated` and
`poe2/public/generated`). The data isn't covered by the [MIT license](LICENSE),
which applies to the code only.

The game text in the data belongs to Grinding Gear Games.

## Who may use it

A free, non-commercial tool with about 1,000 users or fewer may use the data
without asking. A larger tool, or one that makes money (ads, subscriptions,
paid features), needs permission first: open an issue at
https://github.com/veiset/poe.re/issues.

## How to use it

- **Credit poe.re** where the data is shown, with a link to https://poe.re or
  https://poe2.re.
- **Send a User-Agent** that names your tool, its version and its URL:
  `<name>/<version> (<url>)`, e.g. `mytool/1.4.0 (https://mytool.example.com)`.
  A tool with no URL says where it runs instead, e.g. `mytool/1.0 (local app)`.
- **Cache the files** and fetch only what you need. Access that puts too much
  load on data.poe.re can be blocked.

## No guarantees

The data is provided as is, without warranty. Its contents, format, file names
and mod ids can change, and data.poe.re can go away, without notice.
