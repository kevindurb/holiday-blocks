# Third-party assets

## `assets/words.txt`

Derived from SCOWL (Spell Checking Oriented Word Lists) 2020.12.07,
`final/english-words.{10,20,35,40,50}` by Kevin Atkinson and contributors
(http://wordlist.aspell.net/). Filtered to ASCII letters a-z, length >= 2,
deduplicated keeping the smallest SCOWL level (used here as a rough frequency
tier: 10 = most common). One `word tier` pair per line.

The SCOWL copyright and permission notice is reproduced in
`assets/SCOWL-COPYRIGHT.txt`. The collective work is Copyright 2000-2018 by
Kevin Atkinson, and the component copyrights named in that file apply.
Permission to use, copy, modify, distribute and sell these word lists is
granted without fee, provided the copyright notice appears in all copies and
in supporting documentation.
