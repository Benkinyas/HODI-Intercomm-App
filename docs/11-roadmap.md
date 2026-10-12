# Roadmap

What ships when, in what order, and what we're deliberately leaving for later.

## The rule for ordering work

Build in order of risk, not in order of features. The only part of Hodi that might not work is making a silenced phone ring. The directory, the reason sheet and the status picker will definitely work. So the risky part goes first, while there's still time to recover if it fights back.

## v0: the demo, 22 September 2026

Not a product. A proof that the hard part works.

**In:**
- Android app
- Five people typed into Firestore by hand
- Directory, reason sheet with four presets, incoming page screen
- Layer 1 on the alarm channel, ringing a silenced phone with the app killed
- A Node script or single function that sends the page
- If time allows: one iPhone rung by a Twilio trial call, with Emergency Bypass set

**Out:** login, status, SOS, the fallback timer, replies, iPhone app, setup screens. All of these are specified. None of them are needed to prove the idea.

**The demo:** two phones face-down on the table, both silenced. The person watching taps a name and a phone rings.

### Build order before the demo

| Step | Task | Done when |
|---|---|---|
| 1 | Submit the Critical Alerts request to Apple | Submitted. Takes 15 minutes, costs nothing. |
| 2 | Twilio trial, save the number on an iPhone with Emergency Bypass, place one call with the phone silenced | It rings. If it doesn't, stop and rethink before building anything. |
| 3 | Firebase project, Flutter app, `firebase_messaging`, test push from the console | A notification arrives |
| 4 | Alarm channel, permissions, sound file, send script with a `notification` payload | A silenced phone with the app killed rings |
| 5 | Firestore people, directory screen | Five names on screen |
| 6 | Reason sheet, sending from the app | Tapping a preset rings the other phone |
| 7 | Incoming page screen | Shows who and why |
| 8 | Replies written back, sender's screen updates | Optional. Drop it first if time runs out. |
| 9 | Morning of the demo: test on the actual phones, battery settings off | Both phones ring |

Stop after step 4 on the first day, even if it's early. The rest is ordinary app work.

## v1: first real deployment, mid-October 2026

Every P0 requirement in [Requirements](03-requirements.md).

| Week | Work |
|---|---|
| 1 | Organisation code join, real directory, `sendPage` and `acknowledge` functions, idempotent sends, replies, sender's live progress, Riverpod throughout |
| 2 | Fallback engine with Cloud Tasks, call adapter interface, Twilio adapter, daily call cap, status with server-side expiry, held pages, SOS |
| 3 | iPhone app built through Codemagic, Africa's Talking number and adapter, setup flow for both platforms with make-specific Android steps and the Hodi line contact card, reachability check |
| 4 | Acceptance test on every handset model, accessibility pass, privacy note to staff, onboarding session with everyone, name an administrator |

**Release when:**
- [ ] The acceptance test passes, parts A and B, on every handset model in use
- [ ] Everyone has passed a reachability check
- [ ] Seven straight days with no page that failed to reach its recipient
- [ ] Privacy note given to staff
- [ ] An administrator is named

**Then:** two weeks of daily use. Ask the people who used to walk around looking for colleagues whether they still do.

## v2: once it's used every day

Only build these when someone in the organisation actually asks for them.

| Feature | Build when |
|---|---|
| Departments and search | The directory stops fitting comfortably on one or two screens, about 40 people |
| Page history for each person | Someone asks "did I miss anything yesterday?" |
| Admin screen for reachability and the roster | The administrator is doing it by querying the database |
| Pass a page to someone else if there's no reply | Someone's regularly unreachable and a colleague could cover |
| Working hours | People complain about pages in the evening |
| iPhone delivery reports | We need to separate "didn't arrive" from "didn't reply" in the numbers |

## v3: if Hodi goes beyond its first organisation

Several organisations on one system, self-service sign-up, an approval step for new members, per-sender rate limits, a small web admin panel. None of this is worth building until a second organisation actually wants it. The data model already allows it (see [decision 012](08-decisions.md#012-data-lives-under-an-organisation-from-day-one)).

## Risks

| Risk | Likelihood | Impact | What we do |
|---|---|---|---|
| People mute the app after being over-paged | Medium | Kills the product quietly | Status, the two-hour limit, reasons required, SOS kept visible, watch reply times |
| One setting wrong on a phone, nobody knows | High | That person unreachable | Reachability check at setup and every 30 days, visible in the directory |
| Android battery managers drop pages | High on Tecno, Infinix, Xiaomi | Late or missing pages | Make-specific setup steps, 30-second fallback call |
| Emergency Bypass switches itself off | Medium | Silenced iPhone unreachable | 30-day reachability check |
| iPhone users dislike missed calls in their log | Unknown | Complaints, possible muting | Ask two or three before v1. The fallback keeps calls rare. |
| Apple changes silent-mode behaviour | Low | iPhone fallback breaks | Reachability check catches it |
| SOS becomes routine | Low | Normal pages lose meaning | Public log, typed reason, confirmation, monthly count |
| Becomes a chat app | Medium | Loud alert loses its power | No threads, presets that all mean "come here", point at the "not" list |
| One developer, one point of knowledge | High | Stalls if they leave | These documents |

## Open questions

| # | Question | Who answers | By |
|---|---|---|---|
| Q-1 | Is 10 seconds right for the iPhone fallback, or should it be 0? | Two weeks of real use | v1 + 2 weeks |
| Q-2 | How long should the sound ring before stopping? | Testing in the office | v1 |
| Q-3 | Does Off site need different behaviour? | Leadership | v1 |
| Q-4 | Who is the administrator? | Leadership | Before v1 |
| Q-5 | Will iPhone users accept missed calls in their log? | Ask 3 iPhone users | Before v1 week 2 |
| Q-6 | Should leadership see everyone's page log? | Leadership | v1 |
| Q-7 | What are working hours? | HR | v2 |
| Q-8 | Is "Hodi" the right name? | Staff | Before launch |
