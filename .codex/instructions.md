# DAXINI — EXECUTION RULES

CORE PRINCIPLE:

Daxini is a UI layer that consumes pipeline output

---

SYSTEM ROLE:

- display session output
- render text / image
- trigger pipeline

---

PIPELINE RULE:

- DO NOT recreate pipeline
- DO NOT simulate generation
- ALWAYS call existing pipeline

---

UI RULES (CRITICAL):

- swipe system is CORE
- DO NOT modify gestures
- DO NOT break animation loop

ONLY:

- append UI elements
- attach listeners

---

INTEGRATION MODE:

DEFAULT MODE

ALLOWED:

- bind events
- connect pipeline output
- render results

FORBIDDEN:

- creating new logic systems
- rewriting session engine

---

FAIL CONDITIONS:

If pipeline not found:

→ return PIPELINE_NOT_CONNECTED

If UI container not found:

→ return UI_CONTAINER_MISSING
