# Requirements

This is the testable specification. Every requirement has an ID so code, tests and bug reports can point at it.

Priority: **P0** blocks the v1 release. **P1** ships within a month of v1. **P2** is deferred until someone needs it.

## Users

Everyone plays two roles. There's no hierarchy in v1: anyone can page anyone.

| Role | Wants | Worst outcome |
|---|---|---|
| Sender | To reach a named person without leaving their seat | Silence, so they have to go walking anyway |
| Recipient | To be reachable without being interrupted all day | Being startled for something that could have waited |
| Administrator | To keep the roster current and everyone reachable | Someone unreachable without anyone knowing |

The sender wants the alert louder. The recipient wants it quieter. Both are right, and the design has to satisfy both.

## User stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-1 | sender | see everyone in one list | I can reach someone without searching or typing |
| US-2 | sender | send a page in under five seconds | the app is faster than walking |
| US-3 | sender | say why I need someone | they can judge how quickly to come |
| US-4 | sender | know whether they're coming | I can decide whether to wait |
| US-5 | sender | see someone's status before paging | I don't interrupt someone who's busy |
| US-6 | recipient | hear a page even when my phone is silenced | I'm not unreachable while I'm working |
| US-7 | recipient | see who and why at a glance | I can decide without reading carefully |
| US-8 | recipient | reply with one tap | answering costs me almost nothing |
| US-9 | recipient | mark myself busy for a while | I'm not interrupted in a meeting |
| US-10 | recipient | have my busy status end by itself | I can't make myself unreachable by accident |
| US-11 | anyone | raise an emergency that overrides status | real urgency is never blocked |
| US-12 | anyone | prove my phone will actually ring | I'm not silently unreachable |
| US-13 | administrator | see who hasn't verified their phone | I can fix it before it matters |

## Functional requirements

### Access

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-1 | Join with a shared organisation code, then name, role, photo and phone number | Joining takes under two minutes. A wrong code is rejected with a clear message. Phone numbers are validated as E.164 before saving. | P0 |
| FR-2 | Stay signed in | The app opens straight to the directory after a force-close, a restart and seven days unused. | P0 |
| FR-3 | Support several devices per person | A page rings on all of them. Replying on one stops the ring on the others. | P0 |
| FR-4 | Administrator can deactivate a person | They leave every directory within 30 seconds. Pages in flight to them are cancelled. | P1 |

### Directory

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-5 | Home screen lists everyone active with photo, name, role, status and reachability | Renders within one second from a cold start. Works with 25 people and with 200. | P0 |
| FR-6 | Mark people who haven't passed a reachability check in 30 days | The marker doesn't rely on colour alone. Tapping it explains what it means. | P0 |
| FR-7 | Search and departments | Deferred until the roster passes about 40 people. | P2 |

### Sending

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-8 | Tap a person to open a reason sheet with four presets and a text field. A preset sends immediately. | Three taps and under five seconds from opening the app. The sheet opens over the directory. | P0 |
| FR-9 | A reason is required | No path sends a page with an empty reason. Free text is capped at 120 characters. | P0 |
| FR-10 | Show the recipient's status and when it ends, before sending | Accurate to within 30 seconds of the recipient changing it. | P0 |
| FR-11 | Show the sender live progress | The sender sees Ringing, then Calling their phone if the fallback fires, then the reply. The screen updates within two seconds of a reply. After five minutes with no reply it says so and offers a normal phone call. | P0 |
| FR-12 | Sender can withdraw an unanswered page | The ring stops and any fallback call is cancelled within five seconds. | P1 |

### Delivery

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-13 | **A page must be heard on a silenced phone** | With the ringer silenced, the screen off and the app swiped away, a page produces sound within 20 seconds on every handset model in use. **This is the product's defining requirement. Failing it blocks release whatever else works.** | P0 |
| FR-14 | Layer 1 fires immediately | Median time from send to the first ring on a non-silenced phone is under three seconds. | P0 |
| FR-15 | Android layer 1 uses the alarm audio channel | Rings on a silenced Android phone with the app killed. Verified on at least one Tecno or Infinix device. | P0 |
| FR-16 | iOS layer 1 is a Time Sensitive push with sound | Rings on a non-silenced iPhone. Breaks through Focus modes. | P0 |
| FR-17 | Layer 2 places a call from the Hodi line when a page goes unanswered | Fires after the fallback window: 10 seconds on iPhone, 30 on Android, both set on the server. Every call comes from the same number. | P0 |
| FR-18 | Replying cancels layer 2 | A reply before the window ends means no call. A reply while the call rings hangs it up within three seconds. | P0 |
| FR-19 | If Critical Alerts is granted, iPhones skip layer 2 | Controlled by one server flag. Turning it on needs no app update and no user action. | P1 |
| FR-20 | A page's sound lasts up to 30 seconds, repeating with gaps | It stops on any reply. Unanswered, it stops by itself and leaves a notification on screen. | P0 |
| FR-21 | Every page is logged | Records send time, which layers fired and when, reply time, outcome and call cost. | P0 |

### Receiving

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-22 | An incoming page fills the screen and shows over the lock screen: sender's name, photo, reason, and nothing else | The name is readable at arm's length. Works at 200% text size. A screen reader announces sender and reason when it appears. | P0 |
| FR-23 | Reply with one of three fixed answers: On my way, Give me 5, I'm tied up | Each button is at least 64 points tall. All three close the screen and notify the sender within two seconds. **There is no way to close the screen without replying.** | P0 |
| FR-24 | Unanswered pages stay visible as missed pages | They survive a restart and show who, why and when. | P0 |

### Status

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-25 | Set a status: Available, In a meeting, Driving, Focused or Off site, for 30 minutes, 1 hour or 2 hours | Two taps. Other people see when it ends. | P0 |
| FR-26 | No status lasts longer than two hours | No path creates a longer status. When it ends, the person is Available again without doing anything. | P0 |
| FR-27 | Status expiry is checked on the server when a page is sent, using server time | A phone that's asleep, offline or force-closed can't keep an expired status alive. A page sent one second after expiry rings normally. | P0 |
| FR-28 | Pages to someone In a meeting, Driving or Focused are held, not dropped | The sender is told it's held and until when. It's delivered quietly within 30 seconds of the status ending, with sender, reason and time intact. | P0 |
| FR-29 | Outside working hours, pages arrive without sound unless the sender deliberately overrides | The override is a separate action and is logged. | P1 |

### SOS

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-30 | Anyone can send an SOS. It ignores status and working hours, fires both layers at once, and uses its own sound. | Rings on a phone set to In a meeting. The call goes out with no window. | P0 |
| FR-31 | An SOS needs a typed reason of at least 10 characters. No presets. | Send stays disabled until the minimum is met. | P0 |
| FR-32 | An SOS needs a second confirmation. It's the only confirmation step in the app. | A single tap or gesture can't send one. | P0 |
| FR-33 | Every SOS appears in a log everyone can see: sender, recipient, time and reason | The log is reachable from the main screen, not buried in settings. | P0 |

### Reachability

| ID | Requirement | Acceptance | P |
|---|---|---|---|
| FR-34 | Anyone can send a real test page to their own phone and confirm they heard it | Uses exactly the same path as a real page, fallback call included. A pass records the date. A fail opens instructions for that phone's make and platform. | P0 |
| FR-35 | Setup can't finish until the check passes | A failed check returns the person to the relevant setup step. | P0 |
| FR-36 | Prompt a new check every 30 days | The prompt is a quiet notification, never alarm-level. | P1 |
| FR-37 | Administrator sees everyone's last check date | People unchecked for 30 days are listed separately and can be prompted from there. | P1 |

## Non-functional requirements

### Speed

| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Send to layer 1 ring, median | 3 seconds or less |
| NFR-2 | Send to layer 1 ring, 95th percentile | 8 seconds or less |
| NFR-3 | Cold start to usable directory | 1 second or less |
| NFR-4 | Reply to sender seeing it | 2 seconds or less |

### Reliability

| ID | Requirement |
|---|---|
| NFR-5 | Every page reaches its recipient through one layer or the other at least 99% of the time, measured monthly from the page log. |
| NFR-6 | Delivery must work with the app killed, the screen off and the phone idle long enough to enter power-saving mode. A test with the app open proves nothing. |
| NFR-7 | Layer 1 notifications expire after 60 seconds in transit. A page that arrives minutes late misleads people. |
| NFR-8 | If delivery can't be confirmed, tell the sender plainly. Never show an endless spinner. |
| NFR-9 | Sending a page is idempotent. A retried request or a duplicate server trigger never rings someone twice. |
| NFR-10 | Tested on every handset model the organisation uses, not on emulators. |

### Security and privacy

| ID | Requirement |
|---|---|
| NFR-11 | All traffic over TLS. Database rules stop anyone reading another person's page history. |
| NFR-12 | Phone numbers are used by the server only. The app never shows one person's number to another. |
| NFR-13 | No location data is collected, inferred or stored. Status is self-declared only. |
| NFR-14 | Page logs are deleted after 90 days. |
| NFR-15 | Before installing, staff get a written note saying what the app records and who can see it. |
| NFR-16 | No secrets in the app bundle. Credentials live on the server. Tokens on the device go in secure storage. |
| NFR-17 | A hard daily cap on fallback calls, enforced on the server, so a bug can't spend the whole telephony balance. |

### Accessibility

| ID | Requirement |
|---|---|
| NFR-18 | Anyone can choose sustained vibration plus a flashing visual alert instead of sound. An audible-alert app mustn't exclude deaf or hard-of-hearing staff. |
| NFR-19 | WCAG 2.1 AA contrast everywhere. Status never shown by colour alone. |
| NFR-20 | Every control labelled for screen readers. |
| NFR-21 | Readable and usable at 200% system text size. |
| NFR-22 | Touch targets at least 48 points. Primary actions 64. |
| NFR-23 | Respect the system's reduce-motion setting. |

### Platform

| ID | Requirement |
|---|---|
| NFR-24 | Android 8.0 and later. iOS 15 and later. |
| NFR-25 | One Flutter codebase. Platform differences live behind one delivery interface. |
| NFR-26 | Runs smoothly on a phone with 2 GB of RAM. |

## Out of scope for v1

| Excluded | Why |
|---|---|
| Messaging and threads | Other tools do it. Adding it makes Hodi a worse chat app. |
| Voice or video calls | The fallback call is a doorbell, never a conversation. |
| Location tracking | Would make the app feel like surveillance. |
| Departments and search | Not needed under about 40 people. The data model already supports them. |
| Group pages | Each extra recipient multiplies the interruption. Needs its own design. |
| Rate limits | Visible logs are enough at 25 people. Needed before a few hundred. |
| Web app | The point is reaching people away from a screen. |
| Multiple organisations | Only if Hodi goes beyond its first organisation. |
| Any AI feature | See [decision 009](08-decisions.md#009-no-language-model-in-the-product). |

## Assumptions

| ID | Assumption | If it's wrong |
|---|---|---|
| A-1 | Staff use their own phones, so we can ask for settings but not enforce them | Company phones with device management would let us push settings |
| A-2 | Installing Hodi is company policy | Adoption becomes a design problem |
| A-3 | Everyone works in one building | Off-site status needs more thought |
| A-4 | One developer builds and runs it | The scope is sized for that |
| A-5 | Apple will refuse Critical Alerts | If they approve, iPhones stop needing the call |
| A-6 | iPhone users accept a missed call in their log for unanswered pages | **Not yet tested.** Ask two or three iPhone users before building v1. |
| A-7 | Telephony costs stay small | They're a few thousand shillings a month even in bad cases |
