# German (Switzerland), reformed 2006 hyphenation

`hyph-de-1996.tex` is the unmodified upstream pattern file, version 2024-02-28,
explicitly titled “German Hyphenation Patterns (Reformed Orthography, 2006)”.
It is licensed under MIT; the complete copyright and permission notice are
included in the original file header.

Pinned source: https://github.com/hyphenation/tex-hyphen/blob/5684c0f51c0b81133db2efbe60a408b4155a3ff5/hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-de-1996.tex

Modern Swiss Standard German uses the reformed German hyphenation patterns,
not the separate `de-ch-1901` set for traditional orthography. Reference:
https://github.com/jspitz/babel-german/blob/master/ngermanb.dtx (nswissgerman).
The editor preserves the user's spelling and source indexes; it never changes
Swiss `ss` to `ß`. It applies a six-grapheme word minimum and two letters on
each side of a hyphenation point. Known words are cached with a 1024-word cap.

The dictionary is fetched only on first use, from the local static site, with
its content version in the URL. Trie construction yields between chunks.
Neither project files nor tool setup files embed the dictionary.
