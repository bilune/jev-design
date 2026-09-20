# An experiment: can Jev design?

The question is whether a model, given a one-sentence brief, can make the
visual decisions of a whole interface and have them hold together. Everything
here exists to make that question answerable.

Answering it needs two halves, and both are load-bearing:

- **A surface where every visual decision is reachable.** The dashboard is a
  logistics console ("Nodo · Control Tower") because it had to be some product,
  and a busy one uses nearly the whole component catalog. It is the test rig,
  not the point. Any visual decision a component keeps for itself is a
  decision Jev was never allowed to make, and the experiment is that much
  weaker.
- **An engine that turns a sentence into those decisions.** `src/design/jev/`
  asks the model a fixed set of questions and assembles a `DesignConfig` from
  the answers.

So the result is not "the dashboard looks good". It is whether the style the
model picked is recognisably the brief and survives contact with the whole
catalog. Read `README.md` for the design engine and `scripts/jev/README.md` for
the generation engine before changing either.

```bash
npm run dev           # needs TYPESAFE_API_KEY only for the brief field
npm run design:check  # the guardrails, also run by npm run build
npm run lint
```

## The one rule

**No component decides how it looks.** A hardcoded visual literal in a
component — `rounded-lg`, `h-8`, `p-4`, `gap-2`, a hex colour, a px size — is a
bug, not a style. It is a value the engine cannot reach, so it survives a style
change, drifts away from everything around it, and quietly shrinks what the
experiment is able to measure.

Components receive at most a line of metadata (an emitted `data-*`, a group
class). Everything else is declared in `src/design/` and applied by selector.
When something looks wrong, the fix is almost never in the component.

## Where things live

```
src/design/
  tokens.ts            the values: shape, rhythm, typography, colour, structure
  families.css         WHO SHARES WHAT — a component is enrolled, not styled
  system.css           token values, flags, genuinely per-component adjustments
  compat.css           the narrow overrides that defeat upstream !important
  dispositions.json    every slot that belongs to no family, and why
  consistency-audit.ts the runtime audit (dev only, reads the live DOM)
  design-provider.tsx  writes the tokens onto <html>
  jev/                 the generation engine: catalog, recognise, generate
scripts/               the build gates, the bench, the demo recorder
```

## Adding or changing a component

1. Enroll its `data-slot` in the right family in `families.css`. If it belongs
   to no family, give it an explicit entry in `dispositions.json` — the
   coverage gate fails the build otherwise.
2. Reach for a family before writing a per-component rule. A rule in
   `system.css` that only names one slot is a claim that nothing else shares
   this, and that claim is usually wrong.
3. Run `npm run design:check`. It catches unclassified slots, stale selectors
   pointing at slots no component declares, and dispositions for slots that no
   longer exist.
4. Open the app in dev and read the console. The runtime audit watches the DOM
   and reports members that disagree with their family.

Never park a new slot as `unresolved`. That list is existing, deliberately
visible debt, and the gate fails on anything newly added to it.

## The CSS cascade here is not the usual one

- Rules that **govern** components sit **outside `@layer`**, so they beat the
  utilities the components ship with. Layout helpers sit inside
  `@layer components`, so a one-off utility can still adjust a case.
- This cuts both ways: an unlayered rule also beats the component's own layout.
  `position: relative` in a governing rule once overrode a sheet's `fixed` and
  dropped it to the bottom of the page. Scope governing rules to the slots that
  need them, and never let one set a property the component relies on to place
  itself.
- Membership lists live in `:where()` (zero specificity). The only specificity
  a family rule contributes is the trailing `[data-slot]`.
- Each family block opens with `@family <id> subject`. The coverage parser
  reads those marks; a slot named as an ancestor or a condition is not enrolled
  by that.
- Tailwind's `--text-*` scale is redefined onto the system ladder in
  `globals.css`, so every `text-sm` already written moves with the engine.

## Base UI's `render` prop eats `data-slot`

`<TooltipTrigger render={<Badge/>} />` produces a badge whose slot reads
`tooltip-trigger`. A selector naming only the slot silently stops matching, so
it must also name the class that survives (`.group/badge`). This has bitten
three times; `scripts/check-render-anchors.mjs` makes it loud.

## The generation engine (Jev)

`src/design/jev/` turns a sentence into a full `DesignConfig`. It is the most
heavily measured part of the repo: nearly every constant in `recognise.ts`
carries the distribution that put it there.

- Do not retune a threshold from intuition. Run the bench
  (`scripts/jev/bench/`) or add an experiment (`scripts/jev/experiments/`), and
  write the numbers into the comment next to the value you changed.
- The engine cannot invent a value. Widening what it can produce means adding
  to the catalog, not adding prose to a prompt.
- `POST /api/design/generate` costs real money per call and has no rate limit.
  The key is server side only; never move the SDK into a client component.

## Writing here

Comments explain **why**, and the good ones carry the measurement that settled
it. The codebase is in English, including comments and docs. Prefer deleting a
stale comment to leaving it pointing at something that moved.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
