# Design system

Tokens, components and screen rules. The goal is that nobody writes a hard-coded colour, size or duration anywhere in the app.

## What Hodi should feel like

Calm until it isn't. Almost all the time, Hodi is a quiet list of faces you glance at and close. For a few seconds a day, it's the loudest thing in the room. The design has to hold both without feeling like two different apps.

The model is a light switch, not a chat app. One obvious action, instant feedback, nothing to learn.

Three rules follow, and every screen gets checked against them:

1. **Sending must be faster than walking.** Three taps, five seconds, no navigation, no confirmation.
2. **Receiving must be readable at a glance.** Someone interrupted mid-task reads at half speed. Who, and why, large, with nothing competing.
3. **Nothing decorative.** Every element earns its place. Fewer things on screen means faster reading under stress.

## Tokens

All values come from a `HodiTokens` theme extension. Widgets read tokens; they never contain raw numbers or hex values.

### Colour

Semantic names only. A widget asks for `textSecondary`, never for `#4B5563`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `surface` | `#F7F9F8` | `#0F1412` | Screen background |
| `surfaceRaised` | `#FFFFFF` | `#1A211E` | Sheets, rows |
| `textPrimary` | `#111827` | `#F3F4F6` | Names, headings |
| `textSecondary` | `#4B5563` | `#9CA3AF` | Roles, supporting text |
| `textTertiary` | `#9CA3AF` | `#6B7280` | Hints, disabled |
| `border` | `#E5E7EB` | `#2A332F` | Dividers |
| `brand` | `#1B4D3E` | `#4ADE80` | Primary actions, focus rings |
| `onBrand` | `#FFFFFF` | `#0F1412` | Text on brand |
| `pageUrgent` | `#D64545` | `#EF6B6B` | Incoming page screen and SOS only |
| `pageUrgentSurface` | `#FFF1F1` | `#3A1515` | Behind urgent content |
| `statusAvailable` | `#16A34A` | `#4ADE80` | Available |
| `statusBusy` | `#D97706` | `#FBBF24` | Meeting, driving, focused |
| `statusAway` | `#2563EB` | `#60A5FA` | Off site |
| `statusUnknown` | `#9CA3AF` | `#6B7280` | Not checked recently |

**Red is reserved.** `pageUrgent` appears on the incoming page screen and on SOS controls, and nowhere else. If red shows up in settings or the directory, it stops meaning "someone needs you now".

A deep green brand, not blue. Nearly every notification app is blue. Green reads as calm, which matches what Hodi is most of the time, and it makes the red interruption land harder by contrast.

One accent per screen. The directory uses brand green. The incoming page uses urgent red. They never share a screen.

No gradients, no glows, no shadows beyond the platform's default elevation.

### Type

Use the platform's system font: SF Pro on iPhone, Roboto on Android. Don't bundle a custom font. It adds size, and the system fonts are better tuned for small screens and dynamic type.

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `displayName` | 34 | 700 | 1.1 | Sender's name on the incoming page |
| `title` | 24 | 700 | 1.2 | Screen titles |
| `body` | 17 | 400 | 1.5 | Reasons, explanations |
| `label` | 15 | 600 | 1.3 | Buttons |
| `caption` | 13 | 500 | 1.4 | Roles, times, status text |

Sizes scale with the system text setting. Times use tabular figures so "3:40" and "11:10" line up.

### Space

| Token | Value |
|---|---|
| `space1` | 4 |
| `space2` | 8 |
| `space3` | 12 |
| `space4` | 16 |
| `space6` | 24 |
| `space8` | 32 |

### Shape, touch and motion

| Token | Value | Note |
|---|---|---|
| `radiusMd` | 12 | Buttons, rows |
| `radiusLg` | 20 | Sheets |
| `radiusFull` | 9999 | Avatars, pills |
| `touchMin` | 48 | Every tappable thing |
| `touchPrimary` | 64 | Reply buttons, presets |
| `motionFast` | 150 ms, ease-out | Press feedback |
| `motionSheet` | 200 ms, ease-out | Sheets opening |

Nothing animates for longer than 200 ms. The incoming page appears; it doesn't slide or fade in. Animation on an urgent screen is delay.

Only animate transform and opacity. When the system's reduce-motion setting is on, sheets appear without movement.

### In code

```dart
@immutable
class HodiTokens extends ThemeExtension<HodiTokens> {
  const HodiTokens({
    required this.surface,
    required this.textPrimary,
    required this.brand,
    required this.pageUrgent,
    // ...every token above
  });

  final Color surface;
  final Color textPrimary;
  final Color brand;
  final Color pageUrgent;

  static const light = HodiTokens(
    surface: Color(0xFFF7F9F8),
    textPrimary: Color(0xFF111827),
    brand: Color(0xFF1B4D3E),
    pageUrgent: Color(0xFFD64545),
  );

  @override
  HodiTokens copyWith({Color? surface /* ... */}) => /* ... */;

  @override
  HodiTokens lerp(HodiTokens? other, double t) => /* ... */;
}

extension HodiContext on BuildContext {
  HodiTokens get t => Theme.of(this).extension<HodiTokens>()!;
}

// In a widget
Text(name, style: TextStyle(color: context.t.textPrimary));
```

A lint rule should flag any `Color(0x...)` literal outside the tokens file.

## Core components

Build these first. Every screen is made from them. Nobody reaches for a raw `ElevatedButton` or `Container` with inline styling.

### PersonRow

The directory's building block.

```
┌──────────────────────────────────────────────┐
│ (photo)  Amina Wanjiru              ● Avail. │
│          Finance                              │
└──────────────────────────────────────────────┘
```

| Prop | Type | Note |
|---|---|---|
| `person` | `Person` | Name, role, photo |
| `status` | `Status` | Drives the StatusPill |
| `reachable` | `bool` | False shows the ReachabilityMarker |
| `onTap` | `VoidCallback` | Opens the reason sheet |

Row height at least 64. The whole row is the tap target, not just the name. Photo is 44 across. Screen reader label: "Amina Wanjiru, Finance, available. Double tap to page."

### StatusPill

A dot and a word. Never the dot alone, because a colourblind user can't tell green from amber.

| Variant | Colour token | Text |
|---|---|---|
| available | `statusAvailable` | Available |
| busy | `statusBusy` | In a meeting · until 3:40 |
| away | `statusAway` | Off site |

### ReachabilityMarker

A small grey outline icon beside the name with the label "Not checked". Tapping it explains: "Amina hasn't confirmed her phone can receive pages in the last 30 days. She might not hear you."

Quiet on purpose. It's a flag for attention, not an error.

### PresetButton

Full-width, 64 tall, `surfaceRaised` with a `border` outline, `label` text. Tapping sends immediately. At least `space3` between buttons so a thumb can't hit two.

### ReplyButton

Used only on the incoming page. Three across the bottom, equal width, 64 tall at minimum, white text on a darker shade of `pageUrgent`. Full width across the screen so either thumb reaches all three.

### ProgressLine

The sender's view of what's happening.

```
● Ringing  →  ● Calling her phone  →  ✓ On my way
```

Each stage appears when it happens. Never shows a spinner without words.

### SetupStep

The scaffold for all four setup screens: step counter, title, one or two sentences, one primary action, optional secondary link. One screen, one job.

### InlineError

Shown directly under the control that failed, in `textPrimary` with an icon, never as a toast that vanishes before it's read.

### Banner

Full width at the top of the directory, inside the safe area. One sentence and one action. Used for offline and overdue-check states only.

## Screens

### Directory

Own status bar at the top, tappable. A scrolling list of PersonRows below, sorted by first name. At the bottom, a quiet text link: "Check I can be reached", and next to it "SOS log".

No "new page" button. The list is the action.

Built with `ListView.builder` so 200 rows cost the same as 25.

### Reason sheet

A bottom sheet over the directory, so the sender doesn't lose their place. Recipient's name and status at the top. Four PresetButtons. A text field with a send arrow. A divider, then SOS, set apart below everything else and in red.

The sheet respects the bottom safe area, so the lowest button never sits under the home indicator.

### Incoming page

Full screen, `pageUrgentSurface` background, over the lock screen.

Photo, then the sender's name in `displayName`, then the reason in `body`. The three ReplyButtons across the bottom in the thumb zone. Nothing else: no app bar, no navigation, no timestamp.

For an SOS, the top line reads "Emergency" in `pageUrgent` above the name.

### Sent / waiting

Recipient's name, the reason sent, and the ProgressLine. When a reply arrives, show it large for a moment, then return to the directory.

## Platform differences

Share the logic. Let the chrome follow each platform.

| Same on both | Follows the platform |
|---|---|
| Screens and flows | Fonts (SF Pro, Roboto) |
| Tokens and colours | Back navigation (edge swipe, system back) |
| Copy | Sheet styling |
| Reply options | Icons (SF Symbols, Material) |
| Data and rules | Permission prompts |

Use `.adaptive` constructors where Flutter offers them, for switches, dialogs and progress indicators.

## Accessibility

These aren't extras. An app whose whole point is an audible alert has to work for people who can't hear it.

| Requirement | How |
|---|---|
| Deaf and hard-of-hearing staff | A profile setting swaps sound for sustained vibration and a flashing screen. The incoming page stays up and bright until answered. |
| Contrast | WCAG AA at every size used. Check the status pills specifically, since small coloured shapes are the usual failure. |
| Colour | Status always has a word beside the dot. |
| Screen readers | Every control has a label. The incoming page announces "Page from David Otieno: Come to my office" as soon as it appears. |
| Large text | Tested at 200%. The incoming page holds very little text so it survives large sizes. |
| Reach | Primary actions sit in the bottom third. Reply buttons span the full width. |
| Motion | Reduce-motion turns off sheet movement entirely. |

## Sound

This sound will interrupt people repeatedly for years. A bad one breeds resentment no feature can undo. Give it real attention.

| Rule | Why |
|---|---|
| Distinctive | It mustn't sound like a ringtone, WhatsApp or a system alarm. People should know it's Hodi before they look. |
| Rising, not constant | Start moderate and rise over three seconds. Full volume from the first instant is a fright. A rising sound is a summons. |
| Short, repeating | Two to three seconds with a gap, repeating for up to 30. Continuous noise is punishing. |
| Human, not industrial | Closer to a doorbell or chime than a klaxon. A page means someone's at your door. |
| Tested across a room | Hold it at the far side of an office, not against your ear. That's the real use. |

One sound for pages, one distinct sound for SOS. No per-sender tones: recognition depends on consistency.

On Android, a notification sound is cut off at about five seconds unless the notification is set to insist. Keep each cycle under five seconds and let the insistent flag handle repetition.
