# How it works

This document explains how a page reaches someone, including someone whose phone is on silent. It's written for the whole team. You don't need to write code to follow it.

## The one idea everything depends on

A phone doesn't have one volume. It has several sound channels, and silent mode mutes some of them and spares others.

The one it always spares is the alarm. You silence your phone at night and your alarm still goes off at six. That's deliberate: you muted the world, not your own instructions to yourself.

So we never ask "how do we get past silent mode?" Nothing gets past it. We ask "which sound is still allowed, and can our page use it?"

The answer is different on Android and on iPhone, and that difference shapes the whole design.

## Two layers

Every page goes out in two layers.

**Layer 1, the ring.** Sent the instant the page is created. A push notification with sound. For most people, most of the time, this is all that happens: the phone rings, they see who and why, they reply.

**Layer 2, the fallback.** A phone call from one fixed number, the Hodi line. It only happens if nobody replies to layer 1 within a short window. It exists for the phone that was silenced.

```
  Page sent
     │
     ▼
  LAYER 1: ring now ──────────► Replied? ──yes──► Done. No call.
     │                              │
     │                              no
     │                              │
     │                      Wait for the fallback window
     │                              │
     │                              ▼
     └─────────────────► LAYER 2: phone call ──► rings through silent
```

This order matters for three reasons.

It's quick. Nobody waits for the first ring. If the phone isn't silenced, it rings straight away.

It's cheap. Layer 1 is free. Layer 2 costs a little per call. Most pages never reach layer 2.

It keeps the intrusive part rare. A phone call is more disruptive than a notification, and a missed call stays in your call log. Keeping the call as a fallback means it only happens when it's actually needed.

## What happens on each phone

### Android, not silenced

Layer 1 rings. Done.

### Android, silenced

Layer 1 still rings. Android lets an app send its notification on the alarm channel, and silent mode doesn't mute the alarm channel. So on Android, the first layer already beats silent mode.

Layer 2 on Android is a safety net for a different problem. Some Android phones, especially Tecno, Infinix, Xiaomi and Oppo, aggressively shut down background apps to save battery, which can delay or swallow a notification. If an Android page goes unanswered for longer than usual, the call catches that case.

### iPhone, not silenced

Layer 1 rings. Done.

### iPhone, silenced

Layer 1 arrives but makes no sound. Apple doesn't let any ordinary app make sound while the phone is silenced. The screen may light up, but a phone face-down on a desk won't be noticed.

So when the page goes unanswered, layer 2 fires. The call rings through silent mode because every iPhone user has saved the Hodi line as a contact with **Emergency Bypass** switched on. That's an Apple setting, chosen per contact, that lets that one contact's calls ring even when the phone is silenced or in a Focus mode.

### Summary

| | Not silenced | Silenced |
|---|---|---|
| **Android** | Layer 1 rings | Layer 1 rings (alarm channel) |
| **iPhone** | Layer 1 rings | Layer 1 is silent, layer 2 call rings |

Layer 2 also covers the rare case on Android where layer 1 never arrived.

## Why there's a wait before the fallback

The obvious question: if we know silenced iPhones need the call, why not call straight away?

Because we can't tell whether an iPhone is silenced. Apple gives apps no way to read the silent switch. From the server's point of view, a silenced phone and a phone whose owner hasn't looked yet are identical.

So we use the only signal we have: no reply. If layer 1 goes unanswered for a few seconds, the phone was probably silenced, or the person didn't hear it, and the call goes out.

The window is short and it's a setting, not a fixed rule:

| Platform | Default window | Why |
|---|---|---|
| iPhone | 10 seconds | Silence is the likely reason for no reply, so don't wait long |
| Android | 30 seconds | Layer 1 already beat silent mode, so the call only covers delivery failures |

Setting the iPhone window to 0 means "always call immediately". That's a valid choice if the missed-call clutter doesn't bother people, and it's one change on the server.

## The call is a doorbell

Nobody answers a Hodi call. It rings, you see "Hodi line" on the screen, you decline it, you open the app. The call carries no information except "someone wants you". The app carries who and why.

If someone does answer, a short voice says who is paging them and hangs up.

Two side effects people should hear about during setup, not discover later: the call leaves a missed call in their log, and it only rings through silent mode if Emergency Bypass is set on the contact.

## When someone replies

The recipient's screen shows three buttons: **On my way**, **Give me 5**, **I'm tied up**. Tapping any of them:

- stops the ring on every device they own
- cancels the fallback call if it hasn't gone out yet, or hangs it up if it's ringing
- tells the sender, within a couple of seconds

There's no button to dismiss the page without replying. A silent dismissal leaves the sender guessing, which is the exact problem Hodi exists to fix.

## Status

Status is how people protect themselves from being interrupted all day.

| Status | What a page does |
|---|---|
| Available | Rings normally. This is the default. |
| In a meeting | Held silently |
| Driving | Held silently |
| Focused | Held silently |
| Off site | Rings, and the sender is told they're not in the building |

A held page isn't lost. It's delivered quietly the moment the status ends, still showing who sent it, why, and when.

The sender sees the status before they page anyone. Often that's enough: they see "In a meeting until 3:40" and decide to wait. No interruption, problem solved.

No status lasts longer than two hours. You pick 30 minutes, an hour, or two hours, and when it ends you're Available again without doing anything. Without that limit, someone sets "In a meeting" on a Tuesday, forgets, and stays unreachable for a month while everyone assumes the app works.

## SOS

For a real emergency. An SOS:

- ignores status and working hours
- fires layer 1 and layer 2 at the same time, with no wait
- uses its own distinct sound
- needs a typed reason (no presets) and a second confirmation tap
- shows up in a log that everyone in the organisation can see

Anyone can send one, because emergencies can happen to anyone and asking permission first defeats the point. What keeps it rare is that it's visible and it takes a deliberate effort. If SOS gets used more than about once a month, something's wrong, either with the organisation or with the feature.

## Checking that it actually works

The most dangerous failure in this system is silent. Someone installs the app, gets one setting wrong, and nothing looks broken. Their name is in the list, pages send, the logs look fine, and their phone stays quiet.

So every user runs a **reachability check**: they silence their phone and press a button, and the system sends them a real page through the full path, fallback included. If they hear it, we record the date. If they don't, the app walks them through the setting that's probably wrong.

The check runs during setup and again every 30 days. The directory marks anyone who hasn't passed recently, so the people who depend on them can see the gap before it matters.

## What could make this better later

Apple has one official route that lets an app ring through silent mode: the **Critical Alerts** permission. Apple grants it by hand, mostly to health and safety apps, and a workplace paging tool will probably be refused. We're applying anyway, because it's free and it takes a few minutes.

If Apple says yes, we flip one setting on the server. iPhones then ring through silent mode on layer 1, the same way Android does, and the fallback call becomes rare on every platform. Nobody needs to update the app or change a setting.

## The short version

1. Every page rings immediately.
2. Android rings through silent mode on its own.
3. iPhones can't, so an unanswered iPhone page gets a phone call after 10 seconds, and that call rings through silent mode.
4. Replying stops everything.
5. Status holds pages for up to two hours.
6. SOS skips the wait and ignores status.
7. We test that each phone actually rings, instead of hoping.
