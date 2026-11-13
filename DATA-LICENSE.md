# Data usage

These terms cover the generated game data published at https://data.poe.re
(mods, items, gems, maps, waystones, tablets, relics, their regexes and the
trade id maps), and its copies in this repo (`poe/generated`,
`poe/public/generated`, `poe/src/generated`, `poe2/generated` and
`poe2/public/generated`). The data isn't covered by the
[AGPL-3.0 license](LICENSE), which applies to the code only.

The data is copyrighted by Vegard Veiset, and the game text in it belongs to
Grinding Gear Games. These terms aren't a formal license. They say what fair
use of the data looks like, so you know when you need to ask.

## Fair use, no need to ask

- Testing, and building your own tool, addon or overlay.
- Using it yourself or sharing it with friends.
- A small, free tool with up to about 1,000 users.

## Not fair use

- Hosting a copy of poe.re or poe2.re, or a site that does the same thing with
  this data. The code is open source, but the data isn't free to use for that.

## Ask first

A larger tool, or one that makes money (ads, subscriptions, paid features),
needs permission. Ask on the [Discord](https://discord.gg/T8BzKnatY6) or open
an [issue](https://github.com/veiset/poe.re/issues). Ask too if you're unsure
whether your use is fair.

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
