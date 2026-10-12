# User flows

Every screen, every path, and what happens when things go wrong. Diagrams are plain text so they render anywhere.

Each screen answers one question. If a screen starts answering two, split it or cut something.

## Navigation model

Hub and spoke. The directory is the hub. Everything else is one step away from it and returns to it.

```
                        ┌──────────────────┐
                        │    DIRECTORY     │  "Who do I need?"
                        │      (hub)       │
                        └────────┬─────────┘
          ┌──────────┬───────────┼───────────┬──────────────┐
          ▼          ▼           ▼           ▼              ▼
    ┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ ┌─────────────┐
    │  REASON  │ │ STATUS │ │   SOS   │ │  CHECK   │ │  SOS LOG    │
    │  SHEET   │ │ PICKER │ │ COMPOSE │ │ REACHABLE│ │             │
    └────┬─────┘ └────────┘ └────┬────┘ └──────────┘ └─────────────┘
         │                       │
         ▼                       ▼
    ┌─────────────────────────────────┐
    │          SENT / WAITING         │  "Are they coming?"
    └─────────────────────────────────┘

    ┌─────────────────────────────────┐
    │        INCOMING PAGE            │  "Who wants me, and why?"
    │   (arrives on top of anything)  │
    └─────────────────────────────────┘
```

Every key action is reachable within three taps of opening the app. Sending a page takes three.

## Screen inventory

| Screen | Question it answers | Type | Entry | Exit |
|---|---|---|---|---|
| Directory | Who do I need? | Root | App open | Tap a person, tap own status, tap check |
| Reason sheet | Why do I need them? | Bottom sheet | Tap a person | Tap a preset (sends) or dismiss |
| SOS compose | Is this really an emergency? | Full screen | SOS on the reason sheet | Confirm (sends) or cancel |
| Sent / waiting | Are they coming? | Full screen | After sending | Reply received, or back |
| Status picker | How long am I busy? | Bottom sheet | Tap own status bar | Pick status and duration |
| Incoming page | Who wants me, and why? | Full screen, over lock screen | Page arrives | One of three replies |
| Check reachable | Will my phone actually ring? | Full screen | Link in directory, or setup | Pass or retry |
| SOS log | Who raised emergencies? | Full screen | Link in directory | Back |
| Setup | Am I ready to receive pages? | Linear, 4 steps | First launch | Check passes |

Nine screens including setup. Four are used daily: directory, reason sheet, sent, incoming.

## Flow 1: sending a page

The budget is three taps and five seconds. If it takes longer than walking, people walk.

```
 DIRECTORY
   │  sees: Amina · Finance · ● Available
   │
   │ tap Amina                                          [tap 1]
   ▼
 REASON SHEET  (slides up over the directory)
   │  Come to my office
   │  Call me
   │  Quick question
   │  Need you now
   │  [ type a reason... ]
   │  ─────────────────
   │  SOS
   │
   │ tap "Come to my office"  ── sends immediately ──   [tap 2]
   ▼
 SENT / WAITING
   │  Amina
   │  "Come to my office"
   │  ● Ringing
   │
   ├── reply arrives ──────────► "On my way"  ──► back to DIRECTORY
   │
   ├── 10s, no reply (iPhone) ─► "Calling her phone"
   │                                  │
   │                                  └── reply ──► "On my way"
   │
   └── 5 min, no reply ────────► "No answer. Call her normally?"
                                      │
                                      ├── Call ──► opens the phone dialler
                                      └── Done ──► DIRECTORY
```

The third tap is only needed for the free-text path. A preset sends on tap 2.

There's no "are you sure?" step. Choosing and confirming are one tap. That removes undo, so the presets are large and spaced apart: we prevent the mistake instead of offering to reverse it.

## Flow 2: receiving a page

```
 Page arrives at the phone
   │
   ├── Status is Available or Off site ──► ring (layer 1)
   │
   └── Status is Meeting / Driving / Focused
          │
          └──► held on the server. Nothing happens on the phone yet.
               Released quietly when the status ends.

 Ring (layer 1)
   │
   ▼
 INCOMING PAGE  (full screen, over the lock screen)
   │
   │     ┌─────────────────────────┐
   │     │                         │
   │     │        [ photo ]        │
   │     │                         │
   │     │     David Otieno        │
   │     │   Come to my office     │
   │     │                         │
   │     │                         │
   │     │ ┌───────┐┌─────┐┌──────┐│
   │     │ │On my  ││Give ││I'm   ││
   │     │ │way    ││me 5 ││tied  ││
   │     │ │       ││     ││up    ││
   │     │ └───────┘└─────┘└──────┘│
   │     └─────────────────────────┘
   │
   ├── tap a reply ──► ring stops everywhere, fallback cancelled,
   │                   sender told ──► DIRECTORY
   │
   ├── no reply within the window ──► fallback call (layer 2)
   │                                        │
   │                                        └── decline call, open app,
   │                                            same screen, same replies
   │
   └── no reply at all ──► sound stops after 30s,
                           notification stays,
                           shows as a missed page
```

No dismiss button. Every way out of this screen tells the sender something.

## Flow 3: status and held pages

```
 DIRECTORY
   │ tap own status bar ("● Available")
   ▼
 STATUS PICKER
   │  In a meeting     Driving     Focused     Off site
   │
   │ tap "In a meeting"
   ▼
   │  For how long?
   │  30 min     1 hour     2 hours      ← 2 hours is the most on offer
   │
   │ tap "1 hour"
   ▼
 DIRECTORY
   │  "● In a meeting · until 3:40"
   │
   └── at 3:40, on the server ──► back to Available
                                  held pages delivered quietly
```

What the sender sees when they try to page someone who's busy:

```
 REASON SHEET
   │  Amina · In a meeting until 3:40
   │  ─────────────────────────────────
   │  Pages will wait until she's free.
   │
   │  [presets as normal]
   │
   │ tap a preset
   ▼
 SENT / WAITING
   │  Held until 3:40
   │  She'll see it when her meeting ends.
   │
   │  [ Wait ]        [ It can't wait: send SOS ]
```

The SOS option here matters. Without it, someone facing a held page gets up and walks, and the app has failed at its one job.

## Flow 4: SOS

```
 REASON SHEET
   │ tap SOS  (set apart below the presets, in red)
   ▼
 SOS COMPOSE
   │  This will ring even if Amina is busy,
   │  and everyone will see it in the SOS log.
   │
   │  What's the emergency?
   │  [ ............................... ]   ← at least 10 characters
   │
   │  [ Send SOS ]  (disabled until 10 characters)
   │
   │ tap Send SOS
   ▼
 CONFIRM
   │  Send an emergency page to Amina?
   │  [ Cancel ]            [ Send ]
   │
   │ tap Send
   ▼
 SENT / WAITING
   │  SOS · Ringing and calling
   │  (both layers fire at once)
```

This is the only confirmation step in the app. Everywhere else, speed matters more than preventing mistakes. Here it's the other way round.

## Flow 5: setup

A straight line. The rule: **setup isn't finished until the phone has actually made a sound.**

```
 1. WELCOME
      "Reach anyone at work, even when their phone is silenced."
      [ Set up ]
        │
 2. WHO ARE YOU                                   step 1 of 3
      Organisation code · Name · Role · Photo · Phone number
      [ Continue ]
        │
 3. MAKE YOUR PHONE REACHABLE                     step 2 of 3
        │
        ├── Android
        │     a. Allow notifications
        │     b. Allow Do Not Disturb access
        │     c. Allow background activity
        │        (instructions for THIS make: Tecno, Samsung, Xiaomi...)
        │
        └── iPhone
              a. Allow notifications
              b. Save the Hodi line  [ Add contact ]  ← opens a ready-made card
              c. Turn on Emergency Bypass
                 (three screenshots: Contacts → Hodi line → Edit
                  → Ringtone → Emergency Bypass)
        │
 4. PROVE IT                                      step 3 of 3
      "Silence your phone, then press this."
      [ Send me a test page ]
        │
        ▼
      Real page, full path, fallback included
        │
        ├── "I heard it"      ──► You're reachable ✓  ──► DIRECTORY
        │
        └── "I didn't hear it" ──► back to step 3, pointing at the
                                   setting that's most likely wrong
```

Step 4 is the most important screen in the app. It shows the whole product working in a few seconds, it proves this phone's setup instead of assuming it, and it's the moment people understand what Hodi is.

The same screen, reached from the directory, is the 30-day reachability check.

## Edge cases and recovery

Every state needs a way forward. No dead ends.

### Directory

| State | What the person sees | Way forward |
|---|---|---|
| Loading, first launch | Skeleton rows with photo circles and text bars | Loads within a second |
| Loading, later launches | Cached list shown instantly, refreshed quietly | None needed |
| Offline | Cached list, banner: "Offline. Pages will send when you reconnect." | Automatic retry |
| Empty (only you on the roster) | "No one else has joined yet." | [ Share the organisation code ] |
| Your own check is overdue | Banner: "Check your phone can still receive pages." | [ Check now ] |

### Sending

| State | What the sender sees | Way forward |
|---|---|---|
| Send fails, network | "Couldn't send. Check your connection." shown on the sheet | [ Try again ] |
| Recipient has no registered device | "Amina hasn't finished setting up Hodi." | [ Call her normally ] |
| Recipient not reachability-checked in 30 days | Grey marker plus "May not hear pages" on the sheet | Send anyway, or call normally |
| No reply after 5 minutes | "No answer." | [ Call normally ] or [ Done ] |
| Daily fallback call cap reached | Page still rings on layer 1. Sender told: "Couldn't call her phone." | [ Call normally ] |

### Receiving

| State | What happens |
|---|---|
| Page arrives while you're on a phone call | Ring is quieter, shown as a heads-up. Fallback call is skipped because the line is busy. |
| Two pages arrive together | Shown one after another. The second waits until you reply to the first. |
| Sender withdraws the page | The screen closes. A short note says it was withdrawn. |
| You reply while offline | Reply is queued, sent on reconnect, and the ring stops locally at once. |

### Setup

| State | Way forward |
|---|---|
| Wrong organisation code | Shown next to the field: "That code isn't recognised." |
| A permission is refused | Explain what breaks without it. [ Open settings ] |
| Test page not heard, Android | Point at battery settings for this make first, then DND access |
| Test page not heard, iPhone | Point at Emergency Bypass first, then the saved number |
| Test page not heard twice | "Something's still wrong. Ask [administrator's name] for help." |

## Building blocks to make first

These cover every screen above. Build them once and reuse them.

| Component | Used on |
|---|---|
| PersonRow | Directory, SOS log |
| StatusPill | Directory, reason sheet, status bar |
| ReachabilityMarker | Directory, reason sheet |
| PresetButton | Reason sheet |
| ReplyButton | Incoming page |
| ProgressLine (Ringing, Calling, reply) | Sent / waiting |
| SetupStep scaffold (title, body, one action, step counter) | All four setup screens |
| InlineError | Every screen with an action |
| Banner | Directory offline and overdue states |

Specs for each are in the [design system](05-design-system.md).
