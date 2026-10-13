# 🛡️ Incident Response Procedure

> Internal procedure for security/privacy incidents affecting Pulse. Supports GDPR Art. 33 (notification to authority) and Art. 34 (notification to data subject) — 72‑hour clock from awareness. Adapted from NIST SP 800-61.

---

## 1. Incident lifecycle

| Phase | Actions | Owner | SLA |
|---|---|---|---|
| 1. Detect | Monitor: error tracker (`lib/reporting/errorReport.ts`), log aggregation (`logger.ts`), telemetry, user reports, external alerts. Flag any PII exposure, auth bypass, or unusual data access. | Engineering on-call | Immediate |
| 2. Triage | Classify: severity (P1–P4), type (data breach, auth compromise, availability, privacy), impacted data categories, affected users, whether the 72h clock is running. | Security lead + Product | < 4 h |
| 3. Contain | Apply mitigations: revoke tokens, reset passwords, block IPs, disable functions, restore from backup. **Do not delete evidence** — preserve logs. | Engineering + DevOps | < 8 h (P1) |
| 4. Assess | Determine scope: which data categories were affected, how many users, whether the breach is “high risk” to individuals (GDPR Art. 34). | Security lead + Legal | < 24 h |
| 5. Notify | 72h: notify CNIL (via the DPO portal). If high risk: notify affected users directly (Art. 34). | Legal + DPO | 72 h |
| 6. Remediate | Patch the root cause, deploy the fix, rollback if needed, rotate secrets. | Engineering | Per issue |
| 7. Document | Write an incident post-mortem: timeline, root cause, affected data, actions taken, lessons learned. Update the retention schedule and runbooks if relevant. | Security lead | 5 business days |

---

## 2. Escalation matrix

| Severity | Definition | First response | Escalation |
|---|---|---|---|
| P1 | Active data breach; auth bypass; PII exfiltration | Immediate (24/7 on-call) | CTO + DPO + Legal |
| P2 | Suspected vulnerability; unusual access pattern | < 4 h | Engineering manager |
| P3 | Minor bug; no data exposure | < 24 h | Product/engineering |
| P4 | Cosmetic issue; no security impact | < 48 h | Backlog |

---

## 3. Roles & responsibilities

| Role | Responsibility |
|---|---|
| Data Protection Officer (DPO) | Receives CNIL notification, advises on Art. 34 “high risk” determination |
| Security lead | Incident commander; triage, contain, assess |
| Engineering on-call | Technical containment, root-cause analysis |
| Product | Stakeholder communication, UX impact |
| Legal | Notifications (CNIL, users, regulators), contract notices |
| DevOps | Infrastructure containment, secret rotation, backup/restore |

---

## 4. Communication templates (to be adapted by Legal)

**Internal (Security Lead → Engineering):**
```
P1: Security incident — [summary]
Time detected: [ISO]
Affected: [users/tables]
Data categories: [email, messages, ...]
Immediate action: [mitigation]
Next step: [containment, assessment]
```

**External (CNIL notification via DPO portal):**
```
Déclaration de violation de données — [date]
Nature: [mots] et/ou [détails]
Traits: [champs]
Lieu: [système, zone]
Narres: [nombre d'enregistrements]
Perte de données: [données concernées]
Mesures: [contenement]
Préventions: [remédiation]
```

**User-facing (Art. 34, if applicable):**
```
Nous vous informons d'une violation de données qui a pu affecter vos informations de compte.
Nos équipes ont été alertées à [date] et ont pris les mesures suivantes : [mesures].
Nous vous conseillons de [changer de mot de passe / surveiller vos comptes] et restons à votre disposition.
```

---

## 5. Evidence preservation

- **Do not** rely on the application's PII-redaction (`lib/reporting/redact.ts`) to secure evidence; the redactor is for telemetry only.
- Preserve: server logs (90 days), PostHog event stream, database dump (if needed), function logs.
- Store in a write-once, append-only location approved by Legal.

---

## 6. Review & hold

- This procedure is a living artifact; review **annually** or after every P1/P2 incident.
- Any incident that may involve a minor (age < 16) must be escalated to Legal immediately (GDPR Art. 8 / CNIL).
