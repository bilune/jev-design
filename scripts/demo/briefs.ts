/**
 * The script of the demo film.
 *
 * Chosen by measurement, not taste. Two tools sit beside this file and both
 * were used on every candidate: `probe.mjs` says what the engine returned,
 * `preview.mts` renders it so it can be looked at. The second one exists
 * because the first is not enough — the opening beat of an earlier cut scored
 * 78% and arrived on screen as a muddy brown.
 *
 * What a brief has to clear:
 *
 *  1. It has to LOOK good, judged from a render and not from a score. The one
 *     reliable predictor found so far is the canvas: below about 0.25 or above
 *     about 0.9 in lightness it holds its contrast, and a saturated mid-tone
 *     one washes out no matter what it scores. This is what ruled out every
 *     warm candidate tried for a third style — a spice market, a desert
 *     sunset, a pumpkin patch, a campfire — all of which land mid-tone.
 *  2. It has to be nameable by someone who has never seen the app. A brief the
 *     viewer cannot picture makes the before-and-after unreadable: they watch
 *     the UI change but have no claim to check it against. This is what ruled
 *     out the briefs that score highest of all, a NORAD war room and a Memphis
 *     Group poster.
 *
 * NOTHING HERE DESCRIBES ITS OWN ANSWER. "Spotify: black, green, rounded
 * pills" would score better than "Spotify" — 81% against 54% — but it reads as
 * dictating the result, and measurement says the extra words buy almost
 * nothing real: bare "Spotify" returns the same green to within a hundredth of
 * a chroma unit, and "An Atlassian product like Jira" the same Atlassian blue.
 * What drops is the model's confidence in its own answer, not the answer. The
 * one place a hint was genuinely load-bearing, "a darkroom under red
 * safelight", was cut rather than kept: without the hint the engine reads
 * "darkroom" as literally unlit and returns achromatic black, so the red was
 * never its idea.
 *
 * The ORDER carries an argument. Brands are the weakest evidence this engine
 * can offer, because a viewer's first theory on seeing one is that the colours
 * were looked up rather than derived. So the film opens on styles nobody could
 * have precomputed and lets the brands arrive last, as a bonus rather than as
 * the premise.
 *
 * Two mechanical constraints on top of that. The app starts on a white canvas,
 * so beat one has to be dark or the opening change does not read. And each
 * entry inverts its predecessor on mode, corner shape and density at once, so
 * no two consecutive results can be mistaken for a tweak of each other.
 */
export type Beat = {
  brief: string
  /** What the engine returned when this was measured, for the record. */
  measured: string
  /** Seconds to hold on the restyled dashboard. */
  hold: number
}

export const beats: Beat[] = [
  /* ── Three styles, to establish that these are derived and not recalled ── */
  {
    brief: "A cyberpunk city in the rain",
    measured: "56% · near-black, bright cyan, bracket borders, emissive, compact",
    /* The opener holds longest. The viewer is still working out that the whole
       page changed and not just a colour, and every beat after this one reads
       faster for having been given the time here. */
    hold: 4.5,
  },
  {
    brief: "An 18th century printed book",
    measured: "80% · aged paper, black serif, small caps, hairline rules, hatched chart",
    /* The only warm beat, and the only one that is not a screen. It earns the
       slot on a render rather than on the number: every other attempt at
       warmth — a Penguin paperback, a spice market, a nautical map — came back
       on a mid-tone canvas and washed out. */
    hold: 4,
  },
  {
    brief: "Brutalism",
    measured: "76% · concrete grey, uppercase, heavy rules, square, compact",
    hold: 4,
  },

  /* ── Then three products, as the payoff ─────────────────────────────────── */
  {
    brief: "An Atlassian product like Jira",
    measured: "74% · white canvas, Atlassian blue, compact, full borders",
    hold: 3.5,
  },
  {
    brief: "Spotify",
    measured: "54% · near-black canvas, the right green, squircle corners, cozy",
    hold: 3.5,
  },
  {
    brief: "Minecraft",
    measured: "59% · grass-green canvas, pixel icons, blocky figures, 0 radius",
    /* The closer, and the frame most likely to be used as a thumbnail. The
       icon family and the figure face both change here, which is the detail
       that proves this is not a palette swap, so it holds long enough to be
       paused on. */
    hold: 5,
  },
]
