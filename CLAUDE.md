# CLAUDE.md
---
## 0. Doküman Haritası

> Tüm dokümanlar `docs/` altında, numaralı kategori klasörlerinde durur. Tam indeks ve şema: `docs/README.md`.

- `docs/10-standards/` — bağlayıcı standartlar; ilgili alanda kod yazmadan önce oku:
  - `DESIGN.md` — tasarım sistemi (renk token'ları, tipografi, veri dürüstlüğü). UI değişikliğinden önce oku; ad-hoc renk/tip boyutu yasak.
  - `DATA-FETCHING.md` — React Query veri çekme kuralları.
  - `PIPELINE-SECURITY.md` — pipeline güvenlik standardı (planlama aşamasında; CI/CD veya güvenlik işine dokunmadan önce oku).
  - `LOGGING.md` — loglama standardı (Serilog, stdout+JSON, seviye politikası, hassas veri yasağı, docker rotasyonu, AWS maliyet kontrolü). Log yazmadan veya log altyapısına dokunmadan önce oku.
- `docs/20-modules/` — modül tasarımları (`GOLD-MODULE.md` — altın modülü).
- `docs/30-operations/` — operasyon (`COMMANDS.md` — Docker, Redis, Kratos, psql, EF Core, hata ayıklama sırası).
- `docs/40-learning/` — öğrenme notları (bağlayıcı değil).
- `docs/superpowers/` — geçmiş plan/spec/verification arşivi (tarihsel kayıt; içindeki eski dosya yolları güncel olmayabilir).
- Yeni doküman → `docs/` altında kategorisine uygun klasöre; `docs/README.md` indeksi de güncellenir. Kök dizine veya servis klasörlerine doküman konmaz.

---
## 1. Think Before You Code

> Don't assume. Don't hide ambiguity. State alternatives explicitly.

- State your assumptions clearly.
- Ask questions when uncertain.
- If multiple solutions are possible, present them to the user — don't silently pick one.
- If a simpler solution exists, say so.
- Don't hesitate to push back on a proposed approach.
- If something is unclear, don't proceed. Explicitly state what is ambiguous and ask for clarification.

## 2. Read First, Then Write

> Don't modify code you don't understand.

- Before editing a file, read the relevant section. Don't work from memory.
- Check related files (imports, types, tests).
- Try to understand why the existing code was written that way — don't overwrite it with a "I know better" assumption.
- Check the language, framework, and library versions the project uses — don't use APIs that don't exist.

## 3. Simplicity First

> Produce the smallest and simplest solution that solves the problem. Add nothing unnecessary.

- Don't build more than what was asked.
- Don't create unnecessary abstractions for single-use cases.
- Don't add unsolicited flexibility or configurability.
- Don't write error handling for unrealistic scenarios.
- If you wrote 200 lines and the same work can be done in 50, simplify.

Ask yourself: *"Would an experienced engineer say this solution is more complex than it needs to be?"* If yes, simplify.

## 4. Make Surgical Changes

> Only change what is necessary. Only clean up problems you created.

- Don't try to "improve" nearby code, comments, or formatting.
- Don't refactor working structures unnecessarily.
- Follow the existing project style even if you'd personally prefer otherwise.
- If you notice unrelated or unused code, point it out — don't delete it.
- Remove imports and variables that your own changes rendered unused.
- Don't delete pre-existing unused code unless the user asks.

**Check:** Every changed line must be directly traceable to the user's request.

## 5. Work Goal-Oriented

> Define success criteria and keep going until verified.

Translate tasks into verifiable goals:

- "Add validation" → Write a test for invalid inputs, then make it pass.
- "Fix the bug" → Write a test that reproduces the bug, then make it pass.
- "Refactor X" → Verify all tests pass before and after the refactor.

For tasks with multiple steps, create a short plan:

1. [Step] → Verification: [Check]
2. [Step] → Verification: [Check]
3. [Step] → Verification: [Check]

## 6. Verify, Don't Assume

> When you're done, prove it works.

- After writing code, check that there are no build/lint errors.
- If tests exist, run them. Only say "done" after seeing them pass.
- If you get an error, try to fix it — if you can't, report it clearly, don't hide it.
- If a change didn't do what was expected, stop and report — don't silently try other things and drift.

## 7. Never Do List

> Never do these.

- **Hallucination:** Don't use functions, APIs, files, or libraries that don't exist. If unsure, check.
- **Fake output:** Don't say "tests pass" without running them. Don't say "it compiles" without compiling.
- **Silent deletion:** Don't silently delete code you don't understand or consider unnecessary.
- **Bulk changes:** Don't pack multiple independent changes into a single commit.
- **Error suppression:** Don't swallow errors with try/catch and return empty results.
- **Infinite loop:** Don't keep trying to fix the same error with the same approach. After two attempts, suggest a different strategy or ask.

---
