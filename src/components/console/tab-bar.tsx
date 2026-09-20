"use client"

import { sections, type SectionValue } from "./sections"

/**
 * The five sections, in the thumb's reach.
 *
 * On a phone the tab strip and the navigation drawer held the same five
 * destinations, both above the fold, and between them they took 15% of the
 * viewport. Worse, they took the part of the screen a thumb reaches last: on
 * an 844px phone everything actionable sat inside the top 140px.
 *
 * This is the same list, rendered where a phone expects it. The drawer keeps
 * what has no place in five slots — the lanes, the team, the shift commands
 * and the account — and stops being a second copy of the tabs.
 *
 * It is a row of buttons and not a `TabsList` on purpose: the tabs still own
 * the panels and the state, and this drives them. Two lists rendering one
 * state is the thing the file above it exists to prevent.
 */
export function TabBar({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: SectionValue) => void
}) {
  return (
    <nav className="ui-tabbar" aria-label="Sections">
      {sections.map((s) => {
        const active = s.value === value
        return (
          <button
            key={s.value}
            type="button"
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            className="ui-tabbar-item"
            onClick={() => onValueChange(s.value)}
          >
            <s.icon />
            <span className="truncate">{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
