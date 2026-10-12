# Testing

What we test, how, and the one test that decides whether a build can ship.

## The test that decides release

Run on every handset model in use, before every release, and whenever someone joins with a new model.

**Part A: silenced phone**

1. Ringer set to silent.
2. App swiped fully away from recent apps. Killed, not in the background.
3. Screen off, phone face-down, left alone for 30 minutes so it drops into power-saving mode.
4. Someone sends a page from another phone.
5. **Pass:** the phone makes a sound within 20 seconds. On Android that should be layer 1, within 5 seconds. On iPhone it's the fallback call, around 10 seconds.
6. Reply. **Pass:** sound stops within 3 seconds, the sender sees the reply within 2.

**Part B: phone not silenced**

1. Ringer on, normal volume.
2. App killed, screen off.
3. Send a page.
4. **Pass:** layer 1 rings within 5 seconds on both platforms.
5. Reply within the fallback window. **Pass:** no call arrives.

Both parts must pass on every model. There's no partial credit: this test measures the one thing the product promises.

## Delivery matrix

Every combination the system has to handle. The expected result is what should happen; the test confirms it does.

| Platform | Ringer | App | Status | Expected |
|---|---|---|---|---|
| Android | On | Killed | Available | Layer 1 rings |
| Android | Silent | Killed | Available | Layer 1 rings (alarm channel) |
| Android | Silent | Open | Available | In-app incoming screen with sound |
| Android | Silent | Killed | Available, no reply 30s | Layer 1, then call |
| Android | Any | Any | In a meeting | Nothing until status ends, then quiet delivery |
| Android | Silent | Killed | In a meeting, SOS | Layer 1 and call together |
| iPhone | On | Killed | Available | Layer 1 rings |
| iPhone | Silent | Killed | Available | Layer 1 silent, call after 10s rings |
| iPhone | Silent | Killed | Available, Focus on | Layer 1 shows (Time Sensitive), call rings |
| iPhone | On | Open | Available | In-app screen, no system banner |
| iPhone | Any | Any | In a meeting | Nothing until status ends |
| iPhone | Silent | Killed | In a meeting, SOS | Layer 1 and call together, call rings |
| iPhone | Silent | Killed | Emergency Bypass off | Call is silent. **This is a fail**, caught by the reachability check. |

## Devices

Test on real phones. Emulators don't reproduce battery managers, Doze, or Emergency Bypass.

Keep a list of every model in use, updated whenever someone joins.

| Model | OS | Owner | Part A | Part B | Last tested |
|---|---|---|---|---|---|
| | | | | | |

Priorities:

1. The cheapest Android phone anyone uses. Low RAM and aggressive battery management find most bugs.
2. At least one Tecno or Infinix, if anyone has one.
3. The oldest iPhone in use.
4. Whatever the most senior sender uses, because they'll notice first.

## Automated tests

### Delivery engine (unit)

The engine is plain TypeScript with no Firebase inside it, so it's quick to test with fakes.

| Test | Checks |
|---|---|
| Window for an iPhone-only person | 10 seconds |
| Window for Android-only | 30 seconds |
| Window for someone with both | 10, the shorter |
| Window when `criticalAlertsGranted` | 30 on iPhone too |
| SOS | 0, call placed alongside layer 1 |
| Status in the future | Held, release scheduled at expiry |
| Status expired one second ago | Rings |
| Fallback task, page already acknowledged | Exits, no call |
| Fallback task, daily cap reached | No call, state records it |
| Same request id sent twice | One page, one ring |

### State transitions

Every arrow in the page state diagram in [Architecture](06-architecture.md), and a test that each illegal transition is rejected (for example, acknowledged back to ringing).

### Security rules

Run against the Firestore emulator.

| Test | Expected |
|---|---|
| Read someone else's page | Denied |
| Read an SOS page you're not part of | Allowed |
| Read anyone's `private/contact` | Denied, including your own |
| Write your own status directly | Denied, must use the function |
| Write your own name | Allowed |
| Read another organisation's people | Denied |
| Write any page | Denied |

### App

Widget tests for each core component, including large text and screen reader labels. Golden tests for the incoming page at 100% and 200% text size, since that's the screen where layout breaks would hurt most.

Integration tests run against the Firebase emulators with `FakeCallAdapter`, which records calls instead of dialling.

## Manual checks before each release

- [ ] Part A and Part B pass on every model in the device list
- [ ] Reachability check passes on a fresh install, both platforms
- [ ] Reachability check correctly fails with Emergency Bypass turned off
- [ ] Reachability check correctly fails with battery optimisation on (Tecno or Xiaomi)
- [ ] Replying on one device stops the ring on the person's other device
- [ ] Withdrawing a page stops the ring and cancels the call
- [ ] A held page arrives quietly when the status ends
- [ ] SOS rings through a status and fires the call at once
- [ ] VoiceOver and TalkBack read the incoming page correctly
- [ ] Visual alert mode works with sound off
- [ ] Offline banner shows, and sending fails with a clear message

## After release

The page log is the ongoing test. Watch these weekly:

| Signal | Healthy | Worry |
|---|---|---|
| Pages answered within 2 minutes | 90% or more | Anything lower means pages aren't landing |
| Pages that needed the call | Under 20% | Higher means layer 1 is failing or people are silencing more than expected |
| Median time to reply | Under 60 seconds | Rising means people are learning to ignore it |
| People unchecked for 30 days | Nobody | Anyone, because they may be unreachable right now |
| SOS per month | One or fewer | More means it's becoming routine |
