# Designing with tokens

Notes for whoever turns the dials.

A central design engine gives one person control over an entire interface. That
is the appeal, and it is also the risk: a value that reads as a small preference
travels everywhere, and lands in boxes the person setting it never looked at.

These notes are what surfaced while building one and then pushing it until it
broke. They are about the decisions, not about any particular visual style.
Everything here applies whether the result is brutalist, minimal or editorial.

Since this engine was wired to a model, the person turning the dials is often
not a person. That changes nothing below and raises the stakes on all of it: a
rule a human would never think to break is one a generator will break on its
first afternoon, so every guarantee here has to hold structurally rather than
by good judgement at the keyboard.

---

## 1. A token knows nothing about the box it lands in

This is the single idea most of the rest follows from.

`padding: 2rem` is a statement about comfort on a surface with room to spare. On
a 250px card it is a third of the width gone before any content is drawn. The
token is not wrong; it is just unaware.

So every scaled value that can outgrow its container needs a **ceiling relative
to that container**. Not a smaller token — a ceiling. The token stays the
intent, and the ceiling keeps it honest when the box is narrow:

> padding = the smaller of (what I asked for, a tenth of this surface)

The same holds for gaps, for type that has to fit on one line, and for any grid
with a fixed number of columns.

**What to ask when setting a spacing value:** what is the *narrowest* box this
will land in?

---

## 2. Decide what happens when it does not fit

Every sizing decision implies a second decision that is easy to skip. When the
content is bigger than the space:

- **Wrap** — fine for prose, wrong for a figure.
- **Shrink** — fine for a headline number, wrong for a label that becomes
  illegible.
- **Scroll** — fine for a row of tabs, wrong for a page heading.
- **Clip** — almost never fine, and the most dangerous of the four.

Clipping deserves its own warning. Spilled content looks broken, so someone
fixes it. Clipped content looks **tidy** and is missing. A month grid that lost
Monday and Sunday still reads as a calendar. That is the worst failure mode a
design system can have: wrong and pretty.

**Write the overflow policy down per role, not per component.** "A figure never
wraps" is a rule. "The revenue card's number does not wrap" is a patch.

---

## 3. Nested shape is relational, never absolute

A rounded thing inside another rounded thing has one correct radius:

> child radius = parent radius − parent border − parent padding

Set both to the same value and the inner element looks like it is floating in a
box that does not belong to it. Set the inner one smaller by eye and it breaks
the moment someone changes the outer radius.

Two traps here, both of which cost me real time:

- **Compute it where the inputs live.** A formula written at the root resolves
  against the root's padding — which is zero — and then inherits that answer
  down. It looks right in the code and does nothing.
- **Subtract only what is actually there.** If a group paints a fill rather than
  a frame, there is no border to discount.

---

## 4. Height belongs to the row, not to the element

Anything that can share a horizontal line — buttons, inputs, selects, toggles,
groups of them — has to measure the same. The reliable way to get that is for
the **container to set the height and the members to fill it**, not for each
member to set its own and hope they agree.

The tempting formula is wrong in a specific way:

```
group height = control height + padding    ✗ the group is now taller than its neighbours
group height = control height              ✓ the padding comes out of the inside
```

A corollary: when sizes exist (small, default, large), the **group owns the
size of its members**. A small button dropped into a default group should fill
the group, not shrink inside it.

---

## 5. Shape does not imply a border

These are two separate contracts and conflating them causes visible damage.

A skeleton, a progress bar, an avatar and a text input can all share the same
corner radius. Only one of them draws a frame. When "things shaped like controls
get the control border" was a rule, skeletons and slider tracks grew outlines
nothing had asked for.

Keep three questions apart:

1. What shape is it?
2. Does it draw an outline?
3. What colour is that outline, and in which state?

The third one is worth leaving with the component. Border colour usually carries
hover, focus and invalid states, and a central override flattens them.

There is a subtlety on variants that paint no frame: they should still **reserve
the border's width** so a row of mixed variants stays aligned. Reserve the space,
leave the colour alone.

---

## 6. Sizes are tiers, not numbers

If `sm` means 0.86× in one place and the audit expects 0.86× because somebody
typed it twice, they will drift. Name the tiers, put the factor on the tier, and
map every size to a tier:

```
compact 0.86   ←  xs, sm, icon-xs, icon-sm
base    1      ←  default, icon
roomy   1.14   ←  lg, icon-lg
```

Now changing a factor moves everything that claims that tier. The mapping is the
thing worth agreeing on; the number is just the current value.

---

## 7. Geometry should not animate

Colour, elevation and movement animate. Dimensions and radii should not.

The reason is not taste. When someone changes a preset, an animated radius
interpolates, and during that interpolation the interface displays a value the
design never specified. I spent a long time chasing a tab corner measuring 7px
when the contract said 0 — it was a transition frozen halfway between two
presets.

This is a policy, not a preservation of every upstream animation: it also ends
things like a sidebar's width transition. That trade is usually worth making.

---

## 8. Not every icon is the same icon

"Icons on the left or the right" sounds like one decision. It is four:

| Role | Follows the icon-side setting? |
|---|---|
| **Leading icon** — sits with the label | Yes |
| **Disclosure chevron** — says this opens | No, it belongs to the affordance |
| **Selection check** — says this is chosen | No, it belongs with the indicator policy |
| **Shortcut or status** — trailing metadata | No |

Flip all of them and a button reading `[icon] Save ⌘S` becomes `⌘S Save [icon]`,
which is not what anyone meant by "icons on the right".

Related, and worth stating separately because it produced a visible overlap: an
**indicator and the space reserved for it are one decision**. Move the check to
the other side without moving the padding that makes room for it and the check
lands on top of the label.

---

## 9. Register the exceptions

Some things keep their shape no matter what the preset says: a status dot, a
radio indicator, an avatar's presence badge. That is legitimate.

What is not legitimate is leaving them unclassified. An exception that is written
down is a decision; an exception that is merely unstyled is indistinguishable
from an oversight — and the next person cannot tell which one they are looking
at.

The same applies to debt. If a component has no treatment yet, say so explicitly
and by name. **Visible debt is safe; invisible debt grows.** A list of "known
untreated" is worth more than a clean-looking system with unknown gaps.

---

## 10. A preset is a set of structural decisions, not a palette

Accent colour is the lever people reach for first and the one that changes the
least about how a UI feels. What actually separates one visual language from
another is structure, and there is far more of it than a palette suggests. This
engine ended up at 33 continuous values and 29 discrete flags, which group into
eight kinds of decision:

- **Shape** — radius of controls and of surfaces (they are not the same value),
  and what kind of corner it is: rounded, bevelled, notched, squircled, cut on
  the diagonal. The radius says how much; the corner style says what.
- **The frame** — border width and **border contrast**, whether panels are
  bordered at all or only separated, whether a surface is raised, flat or an
  outline, and the finish over its fill: flat, highlight, gradient, glass,
  emitted light. Hard shadows inherit their colour from the border, so a thick
  geometry with a pale edge reads as soft, not brutal.
- **Rhythm** — density as a multiplier over every spacing value, plus the
  airiness of sections, stacks, inline runs and surface padding on their own
  ladders.
- **Type** — three faces (interface, display, mono), a base size and a scale
  over it, tracking on titles, labels and body separately, weights, and whether
  labels are uppercase or small caps. Figures are their own decision: tabular,
  lining or oldstyle.
- **The page itself** — its canvas and ink, and what the page is made OF:
  a texture (grid, dots, scanlines, grain), a signal degradation, an ambient
  motion that nobody touches. This is the group least likely to appear in a
  token list and the one that moves the feeling furthest. The engine learned
  it the hard way: a canvas catalog can say what paper a page is printed on
  and cannot say that a page is made of grass, so every brief about a world
  came back white until the page was allowed a colour of its own.
- **Structure** — which side navigation sits on and how wide, where labels sit
  relative to their field, where actions align, which side an indicator takes,
  how headline figures are laid out, how a row splits between panels, how far
  the content column stretches.
- **How data reads** — table rows ruled, striped, bare or boxed; the rule
  between things; what sits under a figure; how a change is shown; how a chart
  line travels and how the area under it is filled.
- **Icons** — the family (stroke, rounded, solid, pixel, or none at all) and
  the side. A style is allowed to have no icons: a printed book does not.

Two things worth taking from the size of that list. A preset is not a theme,
it is an interface; and the flags alone reach 1,128,701,952,000,000
combinations (`node scripts/jev/flag-space.mjs` counts them), which is the
reason none of this can be verified by looking at a few of them.

---

## 11. Content with a natural width should be centred

Some things do not stretch: a calendar grid, a short empty state, a pin entry.
Placed in a wider surface they sit against the leading edge with all the slack
piled on the other side, and that reads as a bug rather than as a decision.

If it cannot fill its box, centre it in the box.

---

## 12. Verify the guarantee, do not assume it

The failure that cost the most was not a bad value. It was a rule that had never
matched anything.

Size rules were written against an attribute the component did not emit. The CSS
was valid, the intent was clear, and for weeks every size variant silently did
nothing — while the system reported itself as working. Nobody would have found
it by reading.

Three habits that come out of that:

- **Measure the result, not the source.** A rule that looks right and a rendered
  box that measures right are different claims.
- **Check against the contract, not only between siblings.** Two controls that
  are equally wrong agree with each other perfectly.
- **Never let the check share the implementation's mistake.** If the audit reads
  the same token the CSS reads, a broken formula passes its own test. Derive the
  expectation from the measured geometry instead.

---

## 13. A guardrail that cries wolf gets ignored

This one is about keeping the other twelve useful.

An early version of the audit compared every element in every row. Rows meant
for text and icons were never supposed to have matching heights, so it reported
two or three false alarms per screen — and a check you learn to scroll past is
worse than no check, because it provides cover.

Three things made it trustworthy:

- Only audit containers that **declare** they hold comparable things.
- Compare **numerically with a tolerance**. A quarter-pixel difference is not a
  design defect.
- Measure **settled layout**. Fonts load and transitions run; an intermediate
  frame is not a value anyone chose.

And when a check genuinely cannot be certain — an overflow heuristic, say — name
it that way in its own output. `possible vertical overflow` invites a look.
`contract violation` claims something it cannot back.

---

## In one page

1. Tokens do not know their boxes. Give scaled values a ceiling relative to the container.
2. Every sizing decision needs an overflow decision. Clipped is worse than spilled.
3. Nested radius is parent radius minus border minus padding, computed where those live.
4. The container sets the height; members fill it.
5. Shape and border are separate contracts. Colour stays with the component.
6. Sizes are tiers with a shared factor.
7. Geometry does not animate.
8. Leading icons follow the icon-side setting. Chevrons, checks and shortcuts do not.
9. Register exceptions and debt by name.
10. A preset is structure, not palette: 33 values and 29 flags in eight groups. What the page is MADE of moves the feeling more than the accent does.
11. Centre what cannot fill its box.
12. Verify guarantees by measuring. Never let the check share the implementation's error.
13. Keep the checks honest, or they stop being read.
