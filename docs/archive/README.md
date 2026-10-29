# Archive — prompts et audits déplacés

Ce dossier contient les fichiers qui ont été sortis de la racine du dépôt
pour éviter l'encombrement et les doublons.

## Origine

- `docs/archive/prompts/` — contenu de l'ancien dossier `Prompts/` à la racine.
- `docs/archive/audits/` — contenu de l'ancien dossier `Audits/` à la racine.

## Doublons identiques supprimés à la racine

Les fichiers suivants existaient en double (racine ET `Prompts/`/`Audits/`)
avec un SHA-256 identique. La copie à la racine a été supprimée ; la version
conservée se trouve dans ce dossier :

- `V1_prompt.md`, `V2_prompt.md`, `V3_prompt.md`
- `Pulse — Design System & Brand Guidelines v1.0.html` (aussi sous `Audits/`)

## Fichiers différents entre racine et `Prompts/` (conservés des deux côtés)

Les fichiers ci-dessous étaient **différents** entre la racine et `Prompts/`.
Ils ont été déplacés depuis la racine vers `docs/archive/prompts/` avec le
suffixe `__racine` pour les distinguer des versions issues de `Prompts/` :

- `README_V3__racine.md` vs `README_V3.md`
- `implementation_plan__racine.md` vs `implementation_plan.md`
- `pulse_plan_cursor_prompts_1__racine.md` vs `pulse_plan_cursor_prompts_1.md`

À terme, ces paires doivent être réconciliées manuellement (une version
conservée, l'autre supprimée).