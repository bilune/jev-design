# Generating the whole interface from a sentence, with Jev

Jev (TypeSafe's System One model) does not write text. It answers typed
questions: a boolean with a probability, a choice with a distribution, a score
against an ordered rubric. That sounds like a poor fit for design work, and it
would be — if the design surface were free-form. It is not. This repo's engine
is a fixed set of knobs, which is exactly the shape Jev answers well.

```sh
# from the dashboard: the "Describe the style" field in the design panel
# from the shell:
node --env-file=.env.jev ./node_modules/.bin/tsx scripts/jev/cli.mts "<brief>" --critique
```

**Measured: 2 requests, ~1.3s wall, USD 0.00022 for a complete redesign.**

## The files

| file | what it holds |
|---|---|
| `src/design/jev/catalog.ts` | every value the generator may reach for: 19 typefaces, 23 hues, 10 canvases, 10 depth recipes, 6 easing curves, and the ordered ladders |
| `src/design/jev/generate.ts` | the questions, the two-stage pipeline, and `assemble()` where all arithmetic lives |
| `src/app/api/design/generate/route.ts` | POST a brief, get a config; the key stays on the server |
| `src/components/console/style-brief.tsx` | the field in the design panel |
| `experiments/` | the four measurements the design below is based on |

## It cannot invent a value, so give it more to choose from

That was the starting hypothesis and it holds, but not in the obvious way.

**A `choice` accepts at most 255 options.** Past that the API returns
`400 Too many choices`. Below it, discrimination does not degrade at all: a
plant hidden among 8, 25, 60, 120 and 250 distractors was found every time at
0.99–1.00 confidence, and latency barely moved (330ms to 405ms).
`experiments/01-choice-scale.mjs`.

**A whole request holds about 2,000 labels.** 20 questions of 100 options each
went through in 1,059ms and 50k input tokens; 25 × 200 was rejected for exceeding
the 64k ceiling. `experiments/02-semantic-and-payload.mjs`.

**Matching is semantic, not lexical.** Against a catalog of 250 palettes whose
labels share no word with the brief: *the inside of a submarine at depth* →
muted blue on midnight; *a hospital discharge summary printed on a dot matrix* →
muted zinc on paper; *a nuclear reactor control room during an alarm* → vivid red
on midnight.

**Ordering does not bias it.** The same 250 options in five different orders
picked the same hue and the same canvas every time, from index 25, 154 and 239.
`experiments/03-position-bias.mjs`.

## But enumerating is the wrong way to give it more

The flat 250-palette catalog is where the hypothesis breaks. Confidence collapsed
to 0.06–0.16, because probability mass splits across near-synonyms: `neon-amber-on-sand`,
`ink-amber-on-sand` and `washed-amber-on-sand` are three names for roughly one
answer, and the winner among them is arbitrary.

So the catalog is **factored into orthogonal axes** instead. Same outcome space,
three questions of 23, 6 and 10 options rather than one of 250:

| brief | flat, 250 labels | factored, 39 labels |
|---|---|---|
| 1980s amber phosphor terminal | `neon-amber-on-sand` @ 0.14 | `vivid-amber-on-midnight` @ 0.99 / 0.37 / 0.36 |
| a children's hospital waiting room | `pastel-blue-on-paper` @ 0.29 | `pastel-blue-on-paper` @ 0.48 / 0.84 / 0.87 |
| a nuclear control room during an alarm | `vivid-red-on-paper` @ 0.21 | `vivid-red-on-midnight` @ 0.95 / 0.56 / 0.73 |

Factoring is 6.4× cheaper, slightly faster, far more confident — and **more often
right**. The flat catalog put a CRT terminal and a nuclear alarm on a pale page,
because no single label held enough mass to beat the noise. `experiments/04-flat-vs-factored.mjs`.

The reachable space is the product of the axes, so selection produces generation:
**19,665,000 combinations** of face, palette and depth before the ordered ladders
are counted, and the ladders are continuous.

## Discrete answers, continuous output

A `score` question returns an *expected* score, which lands between rungs. "How
rounded is this style" answered 2.4 over a five-rung ladder interpolates to a real
radius. The model never emits a value; it says how far up the ladder the brief
sits, and the ladder is ours.

The ends need a deadzone, and it has to be applied **in the unit that ships**. An
expected score of 0.11 clears a deadzone defined in answer space and still yields
a 0.0138rem radius: not zero, not visible, and enough to break every guarantee the
engine makes about square corners. Anything under a pixel collapses to nothing.

## Fewer questions than knobs

The engine has 29 scalars and 12 flags. The model answers 29 questions. Corner
radius of controls and of surfaces is one question, because it is one decision;
asking twice is how they drift apart.

Two flags are not asked at all:

- `mode` is whether the canvas is dark. Asking it separately is how you get
  light-mode flags on a midnight page.
- `motion` is the bottom rung of the speed ladder wearing a different name. Asked
  separately, the first run of this generator returned `motion: off` alongside a
  55ms duration — Jev answers every question in a request in parallel and in
  isolation, so neither knew about the other.

Every relationship the engine already derives is a question that does not have to
be asked, and therefore an inconsistency that cannot occur.

## One request or several

Measured on the same brief, three runs each:

| brief | single request | two staged requests |
|---|---|---|
| brutalist (the brief states the shape) | `hard`, tint 0.20 | `hard`, tint 0.02 |
| soft consumer (the brief states the shape) | `lifted`, tint 1.6 | `lifted`, tint 0.95 |
| compliance dashboard (the brief states nothing) | `soft`, edge 1.6 | `lifted`, edge 1.0 |

When the brief carries the answer, staging changes nothing. Staging pays on
questions whose right answer is a function of an earlier answer: *how much accent
bleeds into a panel's fill* is unanswerable without knowing whether the panel has
a fill, and single-request runs over-tint every time because they are answering
against the brief instead. On the brief with no shape signal the two modes
disagree outright, and the staged answer is the reasoned one — it knows the panels
came out `raised`, so it lifts them.

The split is not about cost or speed. It is that a parallel sampler cannot
condition one answer on another, and some design decisions are conditional by
nature. Stage 1 is everything derivable from the brief alone; stage 2 is
everything derivable only from stage 1; stage 3 is `assemble()`, and is not a
request at all.

## Guards, where two answers could still fight

`assemble()` resolves the couplings the prompt cannot be trusted to hold:

- A hard offset shadow is a square-corner device. Above a 0.4rem radius it reads
  as a rendering bug, so the shape wins and the depth follows it.
- A glow is emitted light. On a white page it is a smudge, so it downgrades.
- Accent lightness is contrast bookkeeping: the same accent that reads on paper
  disappears on midnight. The model says how far the accent should lift off the
  page; which direction that is, is arithmetic.
- Weights snap to the hundred. A ladder interpolates smoothly, but the font only
  ships the steps it ships and 450 renders as 400 anyway.

## Repeatability

Three runs of the same brief returned roundness 0 / 0 / 0 and border weight
2.96 / 2.95 / 2.96. Under 1% spread. A style is reproducible without caching or
seeding.

## Steerable, with conventional priors

`navSide`, `iconSide` and `actionsAlign` came back identical across four unrelated
briefs, which looked stuck. It was not: a brief asking for navigation on the right
edge and icons after labels gets exactly that. The constants were correct priors.
Unconventional structure has to be briefed; it will not be invented.

## Jev as its own critic, within limits

`--critique` sends the finished tokens back and asks whether they describe one
deliberate style and whether they match the brief. Against a brutalist brief:

| config | coherent | matches brief |
|---|---|---|
| the one Jev produced | 0.81 | 0.84 |
| a deliberately opposite config | 0.16 | 0.11 |
| brutalist with a 1rem radius and a blurred shadow | 0.72 | 0.80 |

It separates right from wrong decisively and subtle from correct barely at all.
It is a usable gate on *did we build the style that was asked for*, not on
internal consistency. That stays where it already lives: in the families and in
the runtime audit.

## Does a generated style break the dashboard?

Six briefs chosen to be hostile — psychedelic rock poster, Soviet spacecraft,
luxury fashion magazine, children's plastic toy, court filing, concrete
brutalism — were generated, applied and audited in the browser. **Zero
consistency issues, no horizontal overflow, in all six.** That is the containment
work paying off, not luck: every scaled value already carries a ceiling relative
to its box.

## Writing the questions

Everything above is about *what* to ask. This is about *how*, and none of it was
arrived at by reading the output and liking it. `scripts/jev/bench` scores twelve
briefs against what a competent designer would accept, and reports per-question
confidence. Both numbers had to move before a change was kept.

```sh
node --env-file=.env.jev ./node_modules/.bin/tsx scripts/jev/bench/run.mts --repeat 3
node --env-file=.env.jev ./node_modules/.bin/tsx scripts/jev/bench/diagnose.mts
```

### The aggregate score is the wrong instrument

The first benchmark run returned 96% for every prompt variant tried, including
deliberately bad ones. Twelve briefs and fifty assertions cannot separate a good
prompt from a mediocre one, because most design decisions are easy and the model
gets them either way. What separated them was **per-question confidence**, which
is why `diagnose.mts` exists. It found five questions answering below 0.45 and one
score that varied by 0.37 of a rung across twelve unrelated styles — a question
that was not reading the brief at all.

### Three shapes of question, each earned

**A plain choice**, when the options are genuinely distinct and the brief decides
between them: hue, typeface, easing.

**A convention**, when one option is the default and the brief usually says
nothing. `indicatorSide` answered at 0.29 confidence while returning `start` 67%
of the time. That is not confusion about design — no style brief mentions which
side a tick sits on, so the mass split and the answer flickered between runs for
no reason. Naming the convention in the criteria (`this_is_the_convention: pick
this unless the brief asks for something else`) took it to 0.90. Steerability
survived: a brief asking for a mirrored layout still gets one, verified on every
run.

| question | confidence before | after |
|---|---|---|
| `indicatorSide` | 0.29 | 0.90 |
| `titleAlign` | 0.69 | 0.81 |
| `navSide` | 0.82 | 0.96 |
| `labelCase` | 0.71, `upper` for 75% of briefs | 0.82, `upper` for 50% |

That last row is the one that mattered. All-caps labels are an interface habit,
not a neutral default, and the model was applying them to a paperback. Naming
sentence case as the convention put the burden of proof back on the style that
wants shouting labels — and the terminal and the brutalist brief still get caps.

**A rubric with signals**, when a ladder needs something to match against. Levels
written as bare adjectives — "Regular. Medium. Semibold. Bold." — give the model
nothing, so every brief lands in the middle:

| score | spread before | after |
|---|---|---|
| `surfaceTint` | 0.37 | 0.90 |
| `speed` | 0.85 | 1.12 |
| `labelTracking` | 0.72 | 0.99 |
| `controlSize` | 0.82 | 1.02 |

Spread, not confidence, is the metric for a score. Confidence concentrated on one
rung would defeat the point: the expected score *between* rungs is what produces a
continuous value. A score is healthy when it moves across briefs and suspect when
it does not.

### What the ablations cost

Production is `v0`, imported from `src/design/jev/generate.ts`, so the benchmark
cannot drift from what ships. Every other variant removes one thing.

| variant | score | confidence | tokens |
|---|---|---|---|
| **v0 — what ships** | **99.4%** | **0.69** | 7245 |
| − JSON criteria, everything back to one sentence | 93.2% | 0.59 | 4565 |
| − the convention marks | 94.9% | 0.64 | 6588 |
| − the per-level signals | 98.3% | 0.65 | 6230 |
| + a description of the dashboard being styled | 98.3% | 0.66 | 7521 |
| + the task framing in front of the brief | 99.4% | 0.68 | 7338 |
| − the face tiers, all 19 in one list | 100.0% | 0.68 | 7772 |

Two of those are things we were paying for and not getting:

- **The task framing did nothing.** "Configure a design engine so an entire
  operations dashboard takes on the style described below" plus a note about
  answering for the style rather than the screen: identical score, slightly lower
  confidence. The state is now the brief and nothing else. The questions already
  carry the context; state only has to carry the material being judged.
- **Describing the dashboard made it worse.** Listing the sidebar, the metrics,
  the charts and the table cost a point of score, a point of confidence and 276
  tokens. The docs warn that irrelevant detail in state acts as a distractor, and
  a dashboard's contents turn out to be irrelevant to what a style looks like.

And one honest non-result: **tiering the typefaces does not buy accuracy.** The
flat nineteen-face list scores the same. What tiering buys is 7% fewer tokens and
a second question confident about five options rather than diffuse over nineteen.
That is a real reason to keep it, and it is not the reason we first gave.

### Two questions the diagnosis caught that reading output never would

**`surface` was not reading the brief.** 83% `flat` at 0.68 confidence across
twelve unrelated styles. Moving it to stage two (so it knows the canvas and the
borders) and naming `flat` as the convention took it to 0.74 — and it now varies.

**Depth was a flat catalog in miniature.** One choice over ten recipes where
`none`, `hairline` and `whisper` are three names for "no real shadow". Same
failure as the 250-palette list: probability split across synonyms, 75% `none` at
0.60 confidence. Factored into *how much* (a score) and *what kind* (a choice),
with a lookup table pairing them, it answers at 0.85 and 0.80.

That refactor also produced the one regression worth recording. A phosphor
terminal correctly asked for `glow`, then answered rung 0 on "how far do panels
sit off the page" — terminals are flat — and the rung cancelled the glow. The
axis was wrong: **emission is not elevation.** The question now asks how strongly
a panel sets itself apart *by shadow or by light*, and the benchmark has a case
pinning it so it cannot come back.

### The guardrail had to be recalibrated too

The first diagnostic flagged every anchored convention as a fault, because it
flagged any question returning the same label for most briefs. But a convention
answered at 0.96 is a decision the prompt was built to make. Flagging it would
have trained us to ignore the report — which is the failure mode that makes a
guardrail worse than none. It now flags a choice only when it defaults *while
unsure*, and judges a score on spread rather than confidence.

## Naming a company instead of describing a style

The obvious thing to type is a brand. It half works, and the half that fails is
instructive. `experiments/05-brands.mts` scores twelve products against facts
about them that are not in dispute — Linear is dark, Carbon is square, Slack's
sidebar is aubergine — in three conditions. Three runs, stable to a point:

| brief | score |
|---|---|
| the brand name alone | **60–63%** |
| the brand name plus three or four words | **100%** |
| the same style described, nobody named | **97%** |

Per brand, the name alone splits cleanly:

| works from the name | fails from the name |
|---|---|
| Spotify 3/3, Apple 3/3, Nintendo 2/2, Bloomberg 3/4 | Linear 0/3, Vercel 0/3, Slack 0/1, Windows 95 1/4 |

The split is not about how famous the company is. It is about whether **text
describes what the product looks like**. "Spotify green", "Nintendo red" and
"Apple blue" are phrases that exist in the world. Nobody writes down that
Linear's canvas is near-black and its rows are tight — they write about what it
does. Jev is a text model that has never seen a screenshot, so a brand is only
as legible as its written description.

### The control

Every failure lands in the same place: a white page, a blue-ish accent, moderate
rounding, ordinary density. `experiments/07-control.mts` asks whether that is
knowledge of anything, by feeding it company names invented on the spot:

```
Zorblax           paper    neutral   2.5 round  cozy   geist
Flembic           paper    neutral   2.5 round  cozy   geist
Palvex            paper    violet    2.0 round  cozy   geist
Linear            paper    neutral   0.1 round  cozy   geist
Vercel            paper    neutral   1.6 round  comfortable
Slack             paper    blue      2.3 round  cozy   inter
```

`Linear`, `Vercel` and `Slack` are indistinguishable from names that did not
exist five minutes ago. The answer is not a wrong memory of those products; it is
the model's picture of "a piece of software", returned whenever the brief names
nothing it can place.

One detail is worth keeping: `Linear` comes back at roundness 0.1, sharper than
any invented name. That is the English word leaking through — *linear* means
straight — and it happens to match the product's square corners, for entirely the
wrong reason.

### It is not that the name is ambiguous

`experiments/06-brand-disambiguation.mts` tests the other explanation: that
"Linear", "Stripe", "Notion" and "Slack" are ordinary English words first, and the
model does not know a product is meant. Adding the category and nothing else —
"Linear, the software issue tracker" — moves almost nothing. Linear picks up
`compact`, and stays on a white page. The problem is not that the model failed to
identify the product. It is that identifying it buys nothing.

### What to type instead

A brand name plus three or four words about how it looks beats a full sentence of
description. The hint resolves which brand is meant and on which axes; the name
then carries everything the hint left out. That is the one place where a name
earns its keep.

## A blocking pass that asks what it knows

The obvious repair is a stage zero: ask Jev whether the brief names a product,
get it to describe that product, and hand the description to stage one. Jev
cannot describe anything — it does not generate text — so "describe" has to mean
typed questions, and the useful move is to ask them in the vocabulary text uses
for *products* rather than for design engines: what colour a company is
associated with, whether its interface is dark, how it is usually written about.
That is `src/design/jev/recognise.ts`.

It works, and it is not the win it looks like.

| | brands, name only |
|---|---|
| without the pass | 57% |
| with the pass | 60–63% |
| with three words of hint instead | 100% |

Three or four points, stable across runs, and no harm to descriptive briefs
(100% either way, +17% tokens, +350ms). **You cannot ask your way to knowledge
the model does not have.**

### Where it does pay: it knows what it does not know

Grouped by the pass's own answer to "is this product's appearance widely
described in writing":

| the pass says | briefs | accuracy from the name alone |
|---|---|---|
| it can picture it (≥0.60) | 6 | **78%** |
| it cannot (<0.60) | 6 | **39%** |

And it rejected all five controls — three company names invented on the spot and
two style briefs — as not naming a product. So the pass earns its 350ms less by
improving the answer than by letting the panel say *this one is a guess, give me
three more words*, which is worth far more than four points.

It is not a guarantee: Windows 95 reports 0.86 and scores 25%. Confident and
wrong is the failure mode every gate of this kind has.

### Gate each fact, not the batch

The first version used one gate for everything: if the pass did not claim to know
the appearance, nothing reached stage one. That threw away correct answers. For
Figma it reported 0.45 on knowing the look while answering `violet` to the colour
question — which is right, and which stage one got wrong on its own. Whether a
company has a signature colour and whether its layout is widely described are
different facts, and a model can hold one without the other. Every fact now
carries its own gate, and a claim is stated or omitted, never hedged: a hedge in
the state reads as a fact to a model that does not weigh probabilities.

### Telling it which reading is meant: a clean trade, declined

`Linear` scores 0.14 on "names a product". The pass is not failing to recall the
product; it is not considering that one was meant, because *linear* is an English
word first. Offering the product reading alongside the brief fixes exactly that:

| | bare brief | product reading offered |
|---|---|---|
| Linear, names a product | 0.14 | **0.79** |
| Linear, interface is dark | 0.39 | **0.62** |
| Stripe, names a product | 0.70 | **0.88** |
| invented names | 0.20–0.30 | 0.17–0.28 |
| style briefs | 0.02–0.05 | 0.05 |

It works and it does not make the pass hallucinate products. It was still
dropped, because of what it costs on the other side:

| framing | says it knows | says it does not | separation |
|---|---|---|---|
| the brief alone | 78%, 82%, 67% | 39%, 39%, 40% | **~35 points** |
| + the product reading | 72%, 64% | 56%, 53% | 11–16 points |

Pushing an interpretation drags the confident cases toward the middle — Windows
95 from 0.86 to 0.80, Figma from 0.47 to 0.39 — and the separation roughly
halves. **A framing that urges a reading costs you the model's honest answer
about whether it has one**, and that honest answer was the part actually paying.

The common-noun problem is real. The interface solves it more cheaply, by
noticing that the brief is one word long.

## Icons

Icons were the last thing the engine did not reach. Every style repainted every
surface and control and left the same thin lucide outlines in the middle of it —
a brutalist page with 3px rules drawing its icons at a hairline reads as two
different hands on one sheet.

Two separate decisions were needed, and only one of them is asked.

**Weight is derived.** The stroke follows the system's line width, because a
style that thickens its rules and not its icons is not a style, it is a mismatch.

**Family is a flag**, because between a stroke and a bitmap there is nothing in
between: `stroke` (lucide), `rounded` and `solid` (Phosphor), `pixel`
(pixelarticons).

The swap needed no change to any JSX. Every file imported its icons from
`lucide-react` by name, so `src/components/icons` exports the same 61 names and
the codemod changed only the import specifier — 32 files, one line each. The
registry that maps each name across the three libraries is generated by
`scripts/icons/build-registry.mts`, which reports anything it cannot resolve
rather than silently falling back, and regenerates the shim's export list so it
cannot drift from the registry (typed by hand, it already had two names no icon
uses).

One conflict had to be resolved rather than avoided. Phosphor carries its own
weight axis, and the CSS rule that gives lucide its stroke would have overridden
it, flattening thin, regular and bold into one. So the CSS rule is scoped to the
stroke family, Phosphor takes a weight computed from the same token, and the
pixel set takes neither because it is drawn in filled squares. One line weight,
three ways of obeying it.

## Using the distribution, not just the winner

There are three primitives and we use all three. What we were not using is what
they return: a `choice` gives a probability for every label, and we were taking
the argmax and discarding the rest.

The rest is not always information. The first version of this fed the runners-up
straight into the chart series, and an amber phosphor terminal — amber at 0.99 —
got a sky-blue and an indigo data series, because behind a winner that confident
the tail is noise.

So confidence decides how specific an answer to commit to, which is the docs'
own recipe, applied three ways:

| confidence | what the style has | what the series do |
|---|---|---|
| ≥ 0.60 | one hue | spaced off the accent by rotation |
| 0.25–0.60 | a band | the top few, in the order the model ranked them |
| < 0.25 | no colour | accent goes grey |

What comes out of the middle band is the point:

```
A children's vaccination clinic   pink · sky · teal · green · blue
Memphis Group, Milan 1981         magenta · lime · orange · violet · teal
A tropical fruit market           orange · green · gold · pink · sky
1980s amber phosphor terminal     (rotation — it is sure)
Concrete brutalism                (rotation, and the accent is grey)
```

Those are palettes, and they came out of a question that was already being
asked.

### Three bugs this turned up, all in our own arithmetic

**Angular distance, inverted.** The separation check between series hues used
the complement of the angle instead of the angle. Same class of error as the one
in the brand-hue script, caught the same way: the output was absurd.

**Relative colour syntax that computes but does not paint.**
`oklch(from … calc(l * 0.9) c 128)` resolves correctly under
`getComputedStyle`, and Chrome then does not paint it as an SVG fill. The charts
had valid geometry, valid colours and drew nothing. The series are computed as
plain oklch now.

**Colours outside sRGB.** The chroma ladder's top rungs are unreachable at most
hues and lightnesses — 0.25 chroma at L 0.43 is outside sRGB for an orange — and
a browser asked to paint one does not return a duller version of it. A tropical
fruit market was drawn in blood red. `clampChroma` now reduces chroma until the
colour exists, leaving lightness and hue alone, and every accent, edge and series
goes through it.

The last one was not introduced by this change. It had been producing wrong
accents all along, on any style that asked for high saturation at a dark
lightness, and only became visible once five series made the hue obviously wrong.

### Letting it choose RGB instead

The obvious way to get more colours is to ask for the channels directly: three
questions, 0–255 each, sixteen million colours. `experiments/12` tries it two
ways (256 would be one over the API's hard limit of 255 choices, so 0–254).

| brief | 255 bare integers | a described 5-rung score per channel |
|---|---|---|
| 1980s amber phosphor | `#000000` | `#564706` |
| Spotify green | `#00fe00` | `#11ed2f` |
| Slack aubergine | `#000000` | `#3e1667` |
| a fire engine | `#fe0000` | `#fa0101` |
| a clear sky at noon | `#0000fe` | `#020ef0` |

**The 255-option version fails outright.** It only ever answers 0 or 254 — amber
came back black, aubergine came back black — at 0.16–0.31 confidence. That is
the documented weakness exactly: Jev reads numbers as text and cannot judge
numeric proximity, so a list of bare integers is a lottery in which only the
anchors stand out.

**The score ladders work better than expected**, getting the hue right in four
of five, and Slack's aubergine at `#3e1667` against a real `#4A154B`. But they
get lightness systematically wrong — the amber is too dark, the sky is navy —
because "how much red" carries no notion of how light the colour is overall. And
they lose the thing that makes the engine work: an accent whose lightness is
derived from the canvas so it stays legible on any page. An RGB accent does not
know whether it is landing on paper or on void.

### Blending the hue distribution: measured, and not shipped

If the winner names one of 23 families, the distribution around it should say
where between the names the style sits — and a probability-weighted circular
mean would give a continuous angle for free.

It moves the hue by 0–2°. `experiments/13` shows why: when the model is unsure
about hue the mass does not go to neighbours, it goes to families far apart —
orange 0.46 / green 0.35, cyan 0.63 / blue 0.34, crimson 0.48 / teal 0.37. Its
uncertainty is **categorical, not continuous**. It is not saying "between orange
and gold", it is saying "either an orange thing or a green thing", and the
average of those is a colour nobody described.

Which is the argument for the current shape: the winner names the hue, and the
spread becomes separate data series rather than a blended one.

### And one that is still open

Clamping chroma keeps the hue honest but makes a "maximum saturation" style come
out muted, because at that lightness the colour genuinely does not exist. The
right answer is to move lightness to where the requested chroma is reachable
rather than to give up chroma — saturation and depth are one decision and the
engine still treats them as two.

## Two colours the engine was not actually controlling

Across twenty generated styles, two colours came out byte for byte identical
every time: the alert red and the online-dot green. `--destructive` is a fixed
value in the base stylesheet and the dot was a hard-coded `bg-emerald-500`. A
console that repaints every surface and leaves its warnings in somebody else's
red is not centrally controlled, it only looks it.

Danger, warning and success now take the style's saturation and its contrast
against its own canvas. Only the hue is fixed, because red means danger and that
is not a style decision. The chroma has a floor: a greyscale brutalist style
would otherwise render a grey alert, and a warning that does not look like one
has stopped being a warning.

The lightness needed a floor and a ceiling too, not just an offset from the
canvas. A plain subtraction put the danger colour at L 0.51 on a near-black
page — a dark red on black, legible and not a signal.

## Saturation and depth were one decision treated as two

`accentDepth` chose a lightness from the canvas, `chroma` chose a saturation
from a ladder, and the gamut clamp then discovered they were incompatible and
gave up the chroma. Every vivid style came out muted:

| brief | before | after |
|---|---|---|
| a tropical fruit market | `oklch(0.431 0.113 52)` | `oklch(0.591 0.153 52)` |
| Memphis Group | clamped from 0.30 | `oklch(0.579 0.260 334)` |
| amber phosphor terminal | `oklch(0.668 0.147 68)` | `oklch(0.748 0.165 68)` |

The colour the model asked for usually exists, a little lighter or darker. So
lightness moves to find it, inside a window narrow enough to keep the contrast
`accentDepth` was choosing, and hue is never touched because hue is the part
carrying the meaning.

## Charts take the style too

The charts were taking the style's colours and nothing else: the same flowing
curve under the same faint wash, in a teletext screen and in an Admiralty chart
alike.

Two questions, and everything else derived:

| asked | options |
|---|---|
| how the line travels | `smooth` · `straight` · `stepped` |
| how the area under it is treated | `tint` · `solid` · `hatched` · `none` |

| derived from | what it sets |
|---|---|
| `borders` | whether the plot is ruled, and dashed or solid |
| `borderWidth` | the plot line's weight |
| `chartPath` + `density` | whether samples are marked, and how |
| `radiusControl` | the bar corner radius |

The derivations are the point. A grid IS a border, so a style that draws no
boxes has no business ruling the plot area. And markers follow the path rather
than asking again: a stepped readout marks its samples, a drafted line marks its
points, and a flowing curve is not marking anything — it is claiming the values
are continuous.

What it picks, unprompted:

```
A British Admiralty nautical chart    straight · hatched   (grid dotted)
1980s teletext, colour blocks         stepped  · solid     (grid solid)
Concrete brutalism                    straight · solid     (grid solid)
A 1970s Penguin paperback             smooth   · none      (grid dotted)
```

`hatched` is diagonal ruling drawn with an SVG pattern, one per series, because
a pattern carries its own colour and cannot inherit the series'. It is the
option that would never appear in a component library and is exactly right for
a printed chart.

## Resources a dashboard actually uses

Two more, both of which a dashboard has and the engine did not.

**A page texture.** A dashboard is mostly empty page, and ours was the same flat
field in every style. Five options — none, a ruled grid, a dot field, scanlines,
paper grain — each drawn from `--ui-edge`, the system's own line colour, so the
texture is never a decoration laid over the system. It is the system, faint and
repeated. The weave ties to `--ui-space`, so a compact style gets a finer one
without a second question being asked; scanlines tie to the text size instead,
because a raster line has to line up with type rather than with layout.

**A gradient under the plot.** `chartFill` gained a fifth option: the colour
fading downward into nothing, which is the contemporary dashboard's signature
and was the one thing our chart could not do.

Unprompted:

```
An engineering blueprint             grid       · hatched
1980s amber phosphor terminal        scanlines  · tint
A 1970s Penguin paperback            grain      · none
A modern developer platform          dots       · gradient
A tropical fruit market              none       · tint
```

The fourth row is the "Vercel grid thing" and the dashboard gradient, together,
from a brief that named neither.

### Where a texture stops

An outlined panel has no fill: it is a window onto the page. That is
unnoticeable when the page is a flat colour and unreadable when it has a weave —
the card's labels came out printed over the grid.

The blunt fix is to fill every panel whenever a texture is on. It works, and it
costs something real: on a textured page `outline` and `flat` then look
identical, so two of the three surface modes collapse into one.

The distinction that actually matters is not transparency, it is **structure**.
A grid line is one pixel and a letter's stem is one or two, so they are the same
size and they fight. Scanlines the same. Grain is sub-pixel noise on a 120px
tile, and running under the text is precisely what paper does — the tooth is
under the ink as well as around it. So structured textures stop at a panel,
unstructured ones carry straight through, and `outline` keeps meaning what it
means.

### A slot named after its component is rarely what it draws

The segmented meter masked the text. `[data-slot="progress"]` is the wrapper,
and in this component it holds the label and the value as well as the bar, so
masking it combed the letters too and "Capacity today" came out with white
slashes through it. The mask belongs on `progress-track`.

### Getting the texture onto the page at all

The texture had to go on every element that paints the page colour, not just on
`<body>`: `sidebar-inset` covers the whole main column with its own opaque
background, so a texture on the body alone showed through the sidebar and
nowhere else — visible in the one place nobody looks. Both surfaces use
`background-attachment: fixed`, so the weave belongs to the window and the two
line up into one continuous field instead of each starting its own grid at its
own origin.

## Paper had no colour of its own

Asked for an eighteenth-century page, the engine produced a modern one with a
serif on it. The brief was not the problem; one line was:

```ts
okl(canvas.bg, canvas.tint * (chroma > 0.02 ? 1 : 0), hue)
```

Two faults in the same expression. The tint was **zeroed whenever the accent was
desaturated**, so a style with quiet black ink got a pure grey-white page no
matter which paper it chose. And when it was not zeroed it used the **accent's**
hue, so `sand` under a blue accent came out a blue sand.

Paper is warm because of what it is made of, not because of what you write on
it. Each canvas now carries its own hue and its own tint, neither of which the
accent can touch — and `parchment` joined them, a browned laid stock at
`oklch(0.905 0.055 66)`.

## A description that quietly excluded its own best case

With a script face in the catalog, a brief about a log "written by hand" still
came back in a book face. The `display` category described itself as "loud,
condensed or deliberately strange… a poster, a masthead, never an ordinary
interface" — which gives handwriting nowhere to go. The category was never
reached, so the face never had a chance.

Two words in a criterion, and an entire branch of the catalog was unreachable.
That is the failure this whole exercise keeps finding: not a wrong answer, an
unasked question.

## The engine was timid, and the fix was not a better instruction

`conventional()` names one option as the default so silence in the brief
resolves to it rather than to a coin flip. It fixed a real problem. It was then
applied to the axes that ARE the style — which is how a brief about a log
"written by hand" could not reach a script face: "the headings use the body
face" was marked as the convention.

Measured over ten strongly-styled briefs, counting how often an expressive axis
lands anywhere other than its default:

| | commitment | benchmark |
|---|---|---|
| as it was | 47% | 98.9% |
| **+ an instruction to commit to the style** | **36%** | — |
| − the convention marks, all expressive axes | 65% | 94.4% |
| **− the convention marks, visual axes only** | **60%** | **99.4%** |

The second row is the interesting one. Telling the model not to be conservative
made it *more* conservative, by eleven points. It is the third time this has
happened: a task framing in the state did nothing, offering the product reading
halved the recognition pass's calibration, and now an instruction to commit
makes it hedge. **An instruction that urges a disposition costs you the
model's own.** The lever is structural, not verbal.

The third row shows the cost of the blunt version — and every one of its ten
losses was `labelCase` or `titleAlign`. All-caps labels and centred titles are
interface habits rather than neutral defaults, which is exactly why they were
anchored in the first place. So those two keep their anchors and the other
eleven lose theirs: eighteen points of the boldness, none of the cost.

`conventional()` and `expressive()` now sit side by side and take the same
criteria, so an axis changes character by changing one word at its call site.

## Withdrawing the icons, and the line I did not cross

A gallery minimal and a typographic eighteenth-century page would both set an
interface in words alone, so `iconFamily` gained a fifth option: `none`.

What it does NOT do is hide content. That was the original idea — a verbosity
axis that could drop descriptions and footers for a minimal style — and it is
the wrong shape. A card's footer says "vs. semana pasada", which tells you what
the delta is measured against. A style that removes it is not deciding how the
information looks, it is deciding you do not get it. That crosses from styling
into editing.

An icon beside a label that already reads "Shipments" is different: the word is
the meaning and the icon repeats it. Nothing is lost by withdrawing it, and an
icon standing ALONE is not withdrawn, because there the icon is the only thing
saying what the control does — removing it would remove the function rather than
the ornament.

### The same anchoring trap, a third time

Turning icons off left exactly one nav item with its icon: "Rutas", which
renders through Base UI's `render` prop, so `data-slot="sidebar-menu-button"` is
replaced by `collapsible-trigger` and only the `.group/menu-button` class
survives. The `leading-icon` family had the same hole and had had it all along —
`iconSide: trailing` never moved that one item either. One member list, two
consumers, one missing anchor.

The families already carry `.group/button`, `.group/badge` and `.group/toggle`
for precisely this reason. It was still missed a third time, so it is a gate
now: `scripts/check-render-anchors.mjs`, wired into `design:check`.

It works in two halves. One reads the components and finds every slot that has
a surviving class, in the three ways they are declared — in the tag, as the
first tokens of a `cva()` base, or as `state: { slot }` inside a `useRender`
call, which is the very mechanism that replaces the slot and the way `badge`
and `sidebar-menu-button` declare theirs. The other parses the stylesheets and
checks that a selector naming such a slot also names its class.

Requiring it everywhere gave 145 findings and almost all were noise: a
`group/` class exists both as a survivor AND as an ordinary Tailwind group name
so descendants can read a parent's state, and the declaration cannot tell them
apart. What separates them is the call site — an element only loses its slot
where someone writes `render={<It/>}`. Scoped to what is actually wrapped, the
gate found **five real ones**, including the `leading-icon` family that had
been missing `.group/menu-button` since the day it was written.

It grows by itself: wrap something new and the requirement follows.

## What Jev still cannot do here

- **Invent a value.** Every colour, face, shadow and curve in the output was
  authored by a person first, in `catalog.ts`. Widening the style space means
  editing that file, not the prompt.
- **Arithmetic.** Contrast, lightness against a canvas, border tone. It does not
  count reliably and reads numbers as text.
- **See the result.** It is text-only and never sees the rendered page. What it
  can read is the audit's output, which is already text.
