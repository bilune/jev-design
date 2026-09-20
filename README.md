# Can a model design a dashboard?

Not pick a colour, not fill in a theme: make the visual decisions of a whole
interface from one sentence, and have them hold together across every component
on the screen.

This repo is the experiment. You type "an 18th century printed book" and, a
second or two later, the console in front of you is one: aged paper, ink at
zero chroma, small caps labels, hatched chart fills, square corners, and no
icon set at all, because a printed book does not have any.

```bash
npm install
cp .env.example .env.local   # then fill in TYPESAFE_API_KEY
npm run dev
```

The console runs without a key; the brief field is the part that needs one.
`POST /api/design/generate` answers 503 until `TYPESAFE_API_KEY` is set, and
the key stays on the server.

## The two halves

Asking the question properly takes two pieces, and most of the work is in the
first one:

**A surface where every visual decision is reachable.** The product is a
logistics operations console, built with Next.js, Tailwind v4 and shadcn/ui,
because the test rig had to be some product and a busy one uses nearly the
whole component catalog. Its job is to leave no visual decision out of reach: a
`rounded-lg` a component keeps for itself is a decision the model never gets to
make. That is the **centrally governed design engine** below, and it is the
bulk of this README.

**An engine that turns a sentence into those decisions.** It runs on Jev, a
model that answers typed questions instead of writing text, so it cannot invent
a value: it picks from a catalog a person authored. See *Generating a style
from a sentence* at the end, and
[scripts/jev/README.md](./scripts/jev/README.md) for how the questions are
written and what each one was measured against.

The result being judged is not "the dashboard looks good". It is whether the
style the model picked is recognisably the brief, and whether it survives
contact with the whole catalog rather than falling apart three components in.

For the principles behind the engine — what to weigh when setting these values,
independent of any visual style — see
[DESIGNING-WITH-TOKENS.md](./DESIGNING-WITH-TOKENS.md).

## The idea

shadcn components are copied into your project and each one carries its own
styling (`rounded-lg`, `h-8`, `p-4`, `gap-2`). Changing the visual identity
means editing sixty files, and over time each component drifts away from the
others.

Here the components keep their behaviour and receive, at most, a line of
metadata (see *Component adaptations*). Everything visual and structural is
declared in the engine and applied from the outside.

## How it works

Every shadcn component exposes a `data-slot` attribute. The engine takes them
from there and rewrites them:

```
src/design/
├── tokens.ts             the values: shape, rhythm, typography, colour, structure
├── families.css          WHO SHARES WHAT — each family declares its members
├── system.css            token values, flags, per-component adjustments, helpers
├── compat.css            the few upstream !important utilities we must defeat
├── design-provider.tsx   writes the tokens onto <html>
├── design-store.ts       the state, outside React
├── dispositions.json     every slot that belongs to no family, and why
└── consistency-audit.ts  the runtime guardrail
```

- **Scalars** become custom properties: `--ui-radius-control`, `--ui-gap-section`,
  `--ui-control-height`, `--ui-border-width`, `--ui-edge`…
- **Flags** become data-attributes on `<html>`: `data-ui-icon-side`,
  `data-ui-actions-align`, `data-ui-label-placement`, `data-ui-density`,
  `data-ui-nav-side`…

Family rules sit outside `@layer` so they win against the utilities the
components ship with. Layout helpers sit inside `@layer components` so a one-off
Tailwind utility can still adjust a single case.

## Families: what links what

A component is not styled on its own. It is enrolled in a **family**, and the
family decides everything its members share. Each family declares its
membership in one place, instead of the same list being spread across separate
rules for height, shape and border.

The one exception is the eligible-member list of a joined group: corner
selection, seams and the compatibility overrides each repeat it, because CSS has
no way to name a set of selectors and reuse it. That repetition has already
produced one divergence, so those four places are edited as a unit.

| Family | Governs |
|---|---|
| `inline-control` | Everything that can share a row and must measure exactly the same |
| `square-control` | Icon buttons: same height as the row, width follows height |
| `control-group` | Tabs lists, toggle and button groups: outer height equals one control |
| `inner-control` | Lives inside a group: never sets its own height, fills the parent |
| `control-shape` | Shares the shape but not the height (badge, checkbox, avatar…) |
| `control-outline` | Which boxes actually draw a border — orthogonal to shape |
| `joined-group` | Outside corners only; internal seams stay square |
| `surface` | Content boxes resting on the page |
| `overlay` | Floating layers |
| `menu-option` | Inherits the radius its popup publishes, reads on one line |
| `nav-link` | Navigation items |
| `title` / `description` / `label` | The type hierarchy |
| `leading-icon` | The icon that obeys `iconSide` (a chevron or a shortcut does not) |

Adding a component to the engine means adding its `data-slot` to the right
family. It picks up height, shape, border and typography with nothing else to
remember.

Variants never duplicate a list. `borders: quiet` does not restate every
surface; it changes the variable those surfaces already consume.

## Containment: what happens when it does not fit

The engine scales type and space from the tokens, and a token knows nothing
about the box it lands in. Push the controls far enough — large text, generous
density — and a padding that is comfortable on a wide surface eats a narrow
one, a figure splits across two lines, a month grid loses Monday and Sunday.

So every scaled value that can outgrow its box carries a **ceiling relative to
that box**, in container units. The token stays the intent; the ceiling keeps it
honest at the extremes:

| Rule | Why |
|---|---|
| Surface padding is capped at a share of the surface (`min(token, 10cqi)`) | on a 250px card the comfortable 42px would leave a third of the width to padding |
| A figure never wraps, and shrinks against its container instead | `$1,66 M` split across two lines stops being a number |
| A heading whose action does not fit beside it moves the action to its own row | squeezing the text to nothing is worse than a second row; the threshold is in `em`, so it follows the type |
| A group that does not fit scrolls along its axis | members keep their size; shrinking them is how a label gets clipped mid-word |
| Content of natural width is centred in its surface | a calendar against the leading edge with all the slack on the other side reads as a mistake |
| A month grid divides the width it has, instead of sizing cells from a token | a month quietly missing two days still looks tidy, which is the worst kind of wrong |
| A section of a surface never paints over the next, and a scroller inherits its ceiling | otherwise a list runs straight over the footer below it |

The audit checks all of this: figures that wrap, containers whose content is
wider than they are (spilling *or* clipped, because clipped content is simply
gone), and sections of a surface that overlap.

## The guardrails

**1. Coverage gate (build).** `npm run design:check` — also wired into `build`.
It runs `scripts/__tests__/parser.test.mjs` first, which pins the selector cases
that used to slip past: whitespace as a combinator, spaces inside an attribute,
`:has()` and `:nth-child(… of …)` as conditions, and an unsupported operator
throwing instead of passing quietly.
Every slot a component declares must be governed by a family or carry an
explicit disposition in `dispositions.json`. It fails on a new unclassified
component, on a family rule pointing at a slot that no longer exists, and on a
stale disposition.

A textual mention is not enrollment: a slot used as an ancestor, a condition or
an exclusion does not count. Only the **subject** of a rule inside a family
block does.

```
Design coverage
  371 slots declared by components
  159 governed by a family
  212 with an explicit disposition
   94 parked as unresolved (recorded 94)
```

Those 94 are painted parts with no treatment yet. They are deliberately kept
visible so *new* debt cannot hide among them, and they do not block the build.

**2. Runtime audit (dev).** Exposed as `designAudit()` and `designIssues()` in
the console for an on-demand run. The gate proves everything is classified; it cannot
prove the result looks right. The audit measures real boxes and reports when a
control is off its contract, when a uniform row disagrees on height or corners,
or when a nested corner does not relate to its container.

It only inspects rows that declare they hold controls (`.ui-controls`,
`.ui-toolbar`, `.ui-actions`). `.ui-row` promises a gap, not equal dimensions.
It compares against the **contract**, not only between siblings, so two equally
wrong controls no longer pass. And it watches the DOM, so opening a menu or
mounting a tab is checked too.

## Component adaptations

The principle is not "components stay untouched". It is:

> Component behaviour stays upstream; small, explicit metadata adaptations
> expose the hooks the engine needs.

There are five, each deliberate:

| File | Change | Why |
|---|---|---|
| `button.tsx` | emits `data-size` and `data-variant` | it consumed `size` as a prop and left no hook, so every size rule silently never matched |
| `toggle.tsx` | emits `data-variant` and `data-size` | the outline variant draws a border and the default one does not, and the engine has to tell them apart |
| `menubar.tsx`, `context-menu.tsx`, `select.tsx`, `combobox.tsx` | emit `*-item-indicator` | the component positioned the indicator while the engine moved the reserved padding, so the check landed on the label |
| `calendar.tsx` | Spanish locale by default | one place instead of every call site |
| `pagination.tsx` | Spanish labels | same |

`compat.css` holds the narrow set of upstream `!important` utilities the engine
has to defeat. Specificity cannot beat `!important`, and for important
declarations the layer order is reversed — which is why those corrections live
in `@layer base`.

## What is controllable

**Shape** — control radius, surface radius, border width, border contrast,
shadow (soft or hard), visible borders, raised/flat/outline surfaces.

**Rhythm** — global density, spacing between sections, within a block and
between controls, surface padding, control height, base text size.

**Relationships** — which side the icon sits on, how action groups align,
whether labels sit above or beside the field, which side navigation is on,
which side the check falls on in menus, title alignment, uppercase labels,
interface typeface.

**Colour and motion** — accent, edge contrast, light/dark, animation.

The four presets (`Minimal`, `Brutalist`, `Editorial`, `Terminal`) are just four
combinations of those values. Same components, no JSX touched.

## What the guardrails have caught

Not hypothetical — each of these was found by the checks themselves, after the
architecture was already "done":

| Found by | What it was |
|---|---|
| Coverage gate | Two family rules targeting `input-group-input` / `input-group-textarea`, slots no component declares. The real one is `input-group-control`, so those rules had never done anything |
| Coverage gate | Enrolling a slot in a family silently left a stale entry in the registry |
| Runtime audit | `select-trigger` had 36px of room for 38px of content: its own vertical padding ate the space the text needed |
| Runtime audit | `transition-all` was animating `border-radius`, leaving tab corners frozen at 7px when the value should have been 0. Shape and size no longer transition |
| Review | The vertical-group rule was not scoped to control groups, so every child of anything with `data-orientation="vertical"` got a control height — which is why the accordion collapsed onto itself |
| Review | The outline contract was adding borders to `tabs-list` and `toggle-group`, which paint a fill and not a frame |
| Review | The audit's own probe was mutating `body`, and the observer watching `body` rescheduled the audit from it — an endless loop |

## What the guardrails do and do not prove

Worth stating precisely, because an overstated guarantee is worse than a
narrow one:

| The gate | proves | does not prove |
|---|---|---|
| Coverage | every slot it can see is governed or dispositioned | that a disposition is *true* — an `adapter` naming a file is not checked against that file |
| Inventory | literal `data-slot="…"` and `slot: "…"` are found | a computed `data-slot={expr}` would be missed, and a painted box with no slot cannot be inventoried at all |
| Membership | only the subject of a family rule enrols | joined-group member lists are repeated across four rules; CSS cannot name a selector set |

| The audit | proves | does not prove |
|---|---|---|
| Rows | every member matches the height its size tier asks for, in all three row classes | that members agree with each other outside a *uniform* row (`.ui-controls`, `.ui-toolbar`): corners are compared between siblings only there, and never against an expected radius, so an actions-only row gets no shape comparison at all |
| Nesting | a sampled member of each container relates correctly to it | every member, or every corner |
| Overflow | a box scrolls its own content | that the user sees clipping. It is a heuristic: containment inside a shell is not checked, and an element that paints decoration outside its box is skipped entirely, hiding real overflow on it too |

One more promise worth stating narrowly: the indicator side switches the
reserved padding and the indicator inset together, but the two derive from
different scalars (`controlPadX` and `space`). That holds for the presets here;
it is not a construction guarantee for arbitrary scalar combinations.

Unsupported on purpose: NavigationMenu's outer popup has no slot and keeps its
upstream shape; vertical joined groups have known gaps and no usage here.

## Known debt

The 94 `unresolved` entries in `dispositions.json`. The gate holds them to a
recorded set, not a ceiling: a newly parked slot fails the build by name, and a
slot that is no longer unresolved but still listed fails too, so the debt cannot
quietly come back. Beyond those, three policies
are deliberately unfinished and documented rather than half-built: the full
outline/divider/overlay border policy (only control border *width* is unified
so far), state treatments (selected, checked, open), and the feasibility
invariant that would catch a configuration where controls agree with each other
but clip their own contents.

## Generating a style from a sentence

The design panel takes a written brief ("a 1980s amber phosphor terminal", "a
luxury Swiss watch boutique") and reconfigures every knob of the engine to
match, in 1.3 to 2.5 seconds measured against the running console. It runs on
Jev, a model that answers typed questions rather than writing text, so it never
invents a value: it picks from a catalog a person authored. The 29 discrete
flags alone reach 1,128,701,952,000,000 combinations — `node
scripts/jev/flag-space.mjs` counts them — and the continuous scalars sit on
top of that.

See [scripts/jev/README.md](./scripts/jev/README.md) for how the catalog is
factored, why it takes two requests instead of one, how the questions are written,
and the measurements behind each decision. The prompt is under test: `scripts/jev/bench`
scores twelve briefs against what a designer would accept and reports per-question
confidence, and every ablation of the shipping prompt is measured there.
