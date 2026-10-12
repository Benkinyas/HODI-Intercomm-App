# Decisions

Settled choices and why we made them. Before reopening one, read why it was made. If the reasons have changed, write a new decision that replaces it rather than editing the old one.

Each record: the situation, what we decided, and what it costs us.

---

## 001. Two layers: ring now, call as a fallback

Status: accepted

Situation. Most phones aren't silenced most of the time. For those, a push notification with sound works and costs nothing. Silenced iPhones can't be reached by any push without Apple's special permission. A phone call can reach them, but calls are intrusive, cost money, and leave a missed call in the log.

Decision. Every page fires a push immediately (layer 1). If nobody replies within a short window, the server places a call from the Hodi line (layer 2). A reply at any point cancels layer 2.

Consequences. Non-silenced phones ring instantly for free. Silenced iPhones wait a few seconds for the call. The call stays rare, which keeps it tolerable. We need a scheduler for delayed work.

---

## 002. Infer silence from no reply, because it can't be detected

Status: accepted

Situation. We'd call silenced iPhones immediately if we knew they were silenced. Apple gives apps no way to read the silent switch. Workarounds that time a silent audio clip only run with the app open and are unreliable.

Decision. No reply within the fallback window stands in for "probably silenced". Windows are set on the server: 10 seconds on iPhone, 30 on Android.

Consequences. A silenced iPhone rings 10 seconds late. Someone who simply hasn't looked in 10 seconds gets a call they didn't strictly need. Setting the iPhone window to 0 turns this into "always call", which trades speed for more missed calls in people's logs. That's a one-line change if people prefer it.

Replaces: an earlier plan with a 20-second wait before any loud alert. That was rejected because it delayed the first ring for everyone, not just silenced phones.

---

## 003. Status protects people, not delay

Status: accepted

Situation. If every page rings immediately, people need some other way to avoid being interrupted all day, or they'll mute the app.

Decision. People set a status (meeting, driving, focused) that holds pages silently. Held pages are delivered quietly when the status ends. No status lasts more than two hours.

Consequences. The recipient controls their own interruptions. The two-hour limit means nobody becomes unreachable by forgetting. Senders sometimes have to wait, which is why a held page offers SOS as an escape.

---

## 004. Status expiry is checked on the server with server time

Status: accepted

Situation. A timer on the phone won't fire if the phone is asleep, offline or the app is killed. A phone's clock can also be wrong.

Decision. The server writes `statusExpiresAt` from its own clock and checks it at the moment a page is sent. Clients never write expiry times.

Consequences. A stale status can't outlive its limit. Setting status goes through a function rather than a direct database write.

---

## 005. The iPhone fallback is a real phone call to an Emergency Bypass contact

Status: accepted

Situation. Apple lets exactly one kind of third-party sound through silent mode without special permission: calls and texts from a contact the user has marked with Emergency Bypass.

Decision. Every iPhone user saves the Hodi line as a contact and turns on Emergency Bypass during setup. Layer 2 calls come from that number, always.

Consequences. The Hodi line can never change, because every user's setting is attached to it. Each iPhone needs a manual setup step that no app can do for them. Users report the setting sometimes reverting on its own, so the reachability check has to catch that. Each call costs about KES 2.50.

---

## 006. Apply for Critical Alerts, but don't depend on it

Status: accepted

Situation. Critical Alerts would let layer 1 ring through silent mode on iPhone, making the call unnecessary. Apple grants it by hand, mainly for health and safety, and is likely to refuse a workplace paging app.

Decision. Apply anyway, since it's free and needs no working app. Build everything assuming refusal. Keep a `criticalAlertsGranted` flag on the server.

Consequences. If Apple approves, flipping the flag upgrades every iPhone with no app update. If not, nothing changes.

---

## 007. Android rings via a notification payload, not a data message

Status: accepted

Situation. A data-only FCM message is handled by the app's own code, which has to start up in the background. Battery managers on many Android phones delay or prevent that. A `notification` payload is posted by Android itself.

Decision. The ring on Android is always a `notification` payload naming the alarm channel. Data-only messages are used only for cancels, which must be silent anyway.

Consequences. The ring doesn't depend on our code running. We can't record exactly when an Android phone received a page, only when the person replied. The 30-second Android fallback covers pages that never arrived.

Corrects: an earlier note that said data-only messages "arrive silently" on a killed app. More accurately, they depend on the app waking up, and that's what can't be trusted.

---

## 008. Flutter

Status: accepted

Situation. Flutter and Expo (React Native) can both reach Android's alarm channel. Flutter's notification package exposes the alarm audio setting, full-screen intents and the insistent flag directly. Expo's needs a native plugin for full-screen intents and the insistent flag. Expo's advantage, building iOS without a Mac, is also available to Flutter through Codemagic.

Decision. Flutter.

Consequences. The critical notification features are available from Dart without writing native plugins.

---

## 009. No language model in the product

Status: accepted

Situation. It'll be asked whether Hodi should use AI.

Decision. No. Hodi's value is that it's predictable. A model adds delay, cost per request, a dependency on another company's uptime, and output that varies from run to run. None of those belong between a page and a ringing phone, and nothing in the core flow needs one. Rewriting or summarising a sender's reason is specifically ruled out: their four words are already the clearest version.

Consequences. None to manage.

Might revisit: setup troubleshooting, if people struggle with the hundreds of Android variants. If we ever build it: never in the delivery path, grounded in a maintained list of real device instructions rather than the model's memory, returning one of a fixed set of diagnoses rather than free text, falling back to the standard checklist when unsure, and with a monthly spending cap.

---

## 010. Sending goes through a callable function, not a database trigger

Status: accepted

Situation. A Firestore trigger on "page created" would work, but triggers can fire more than once, can't return errors to the sender, and run after the write has already happened.

Decision. The app calls a `sendPage` function. It validates, decides, delivers and returns the outcome (ringing, or held until a time).

Consequences. The sender gets an immediate, accurate answer. Validation happens before anything is written.

---

## 011. Sends are idempotent

Status: accepted

Situation. Networks time out, apps retry, functions retry. Without protection, a retry rings someone twice.

Decision. The app generates a request id for each page. The page document uses that id. Creating it is a transaction that returns the existing page if it's already there.

Consequences. A page rings once no matter how many times the request arrives.

---

## 012. Data lives under an organisation from day one

Status: accepted

Situation. There's one organisation now. Supporting a second later means moving every document and rewriting every security rule.

Decision. All data sits under `orgs/{orgId}`.

Consequences. One extra path segment everywhere. No migration if a second organisation arrives.

---

## 013. SOS relies on visibility, not permission

Status: accepted

Situation. An emergency override is necessary. It's also the feature most likely to wreck the product: if SOS becomes routine, normal pages stop meaning anything.

Decision. Anyone can send one. It needs typed text, a second confirmation, and it appears in a log everyone can see.

Consequences. Real emergencies are never blocked by permissions. Misuse is visible to colleagues, which does more than a rate limit would. Watch the monthly count.

---

## 014. No way to close an incoming page without replying

Status: accepted

Situation. A dismiss button lets the recipient close the page without telling the sender anything. That recreates the silence Hodi exists to end.

Decision. Three replies only. Every exit tells the sender something.

Consequences. Slightly more friction for the recipient. "I'm tied up" costs the same one tap as dismissing would have.

---

## 015. Background audio keep-alive is rejected for now

Status: rejected

Situation. An iPhone app with the background audio mode can keep itself running with a silent audio loop, then play a sound through silent mode when a page arrives. It works technically.

Decision. Not now. It drains battery continuously, dies if the user force-quits the app, and Apple rejects apps that use background audio without real audio features. Without the Enterprise Program, which needs 100 or more employees, we'd face App Store review.

Consequences. Kept as a known option if Critical Alerts is refused and people object to the fallback calls.

---

## 016. The reachability check is a launch requirement

Status: accepted

Situation. The worst failure in this product looks like success: pages send, logs are green, and one phone never rings because of a setting.

Decision. Setup can't finish until a real test page is heard. The check repeats every 30 days. The directory shows who hasn't passed.

Consequences. Setup takes a minute longer. In exchange, the failure that would otherwise stay hidden until it matters becomes visible straight away.
