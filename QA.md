# Domain move verification — 1.8.0

All seven existing suites pass, and 177 save-transfer checks pass. Legacy versions 1 and 2 retain completion/current-level identity across 74 round trips. A large save retains all 100 boards and all 80 Undo entries on each board. Conflicting new-address boards and settings take priority, while earned completions are unioned. Invalid payloads, unrelated origins/windows/nonces and failed writes do not mark an import complete.

Two independent local browser origins exercised the real iframe bridge. A save with 6 completed squares, current level 7, two placed pieces, two independent unfinished boards, Undo history and sound off arrived automatically. Keyboard placement, reload and Undo retained new changes. Switching to the second board and reloading preserved it too. A deliberately blocked iframe exposed the recovery UI; the first-party popup successfully imported the save. Opening the original game still showed the original level 7 arrangement, while the new address retained the newer level 25 arrangement.

The original game engine, motion, desktop/mobile layout module and all 100 level definitions are byte-identical to 1.7.0. Only bootstrap waits for the origin transfer before loading the existing save. No server stores progress. The old-origin save is never deleted.

GitHub Pages is configured for bentoad.leolune.fun. Final DNS, certificate and live transfer verification remain pending Namecheap sign-in. The old game index stays intact until those pass.
