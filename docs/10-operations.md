# Operations

Running Hodi once it's live: what it costs, what to watch, and what to do when things go wrong.

## Who runs it

One named administrator. They add and remove people, chase anyone who hasn't passed a reachability check, own the telephony account, and are the person staff ask when their phone doesn't ring.

If nobody is named, this lands on whoever built it and stays there. Name someone before launch.

## Costs

Prices from Africa's Talking's published Kenya rates, September 2026. Check before budgeting.

### One-off

| Item | Cost | When |
|---|---|---|
| Africa's Talking voice number | KES 5,000 + 16% VAT, about KES 5,800 | v1 |
| Google Play developer account | $25 once | Only if publishing on Play. Installing the APK directly is free. |
| Apple Developer Program | $99 a year | When the iPhone app ships |

### Monthly

| Item | Cost |
|---|---|
| Voice number rental | KES 2,000 + VAT, about KES 2,320 |
| Firebase | Free allowance covers this workload. Needs a card on file. |
| Push notifications (FCM, APNs) | Free |
| Codemagic iPhone builds | Free tier is enough |

### Per call

Only fallback calls cost anything. Outgoing calls are billed at KES 2.50 per minute, charged by the minute, and a fallback rings for 20 seconds. So each one costs **about KES 2.50**.

Because the call is a fallback, most pages cost nothing.

| Scenario | Calls a day | Per month |
|---|---|---|
| 25 people, 20 pages a day, typical | About 5 | About KES 375 |
| 25 people, every iPhone page needs the call | About 8 | About KES 600 |
| 300 people, 150 pages a day | About 35 | About KES 2,600 |

Total running cost for the first deployment: **roughly KES 2,700 to 3,000 a month.** Money isn't the constraint.

## Spend protection

A hard daily limit on fallback calls, enforced by the server in `config/delivery.dailyCallCap`. Default 200.

When the cap is hit, pages still ring on layer 1, senders are told the call couldn't be placed, and the administrator gets an alert. The cap exists so a bug can't empty the telephony balance overnight. If it's ever hit in normal use, raise it deliberately after checking why.

Also set a low-balance alert in the Africa's Talking dashboard.

## What to watch

Weekly, from the page log. A simple query or spreadsheet export is enough; no analytics service needed.

| Signal | Healthy | If it's off |
|---|---|---|
| Pages answered within 2 minutes | 90%+ | Check which devices aren't replying. Usually one person's setup. |
| Pages needing the call | Under 20% | Check layer 1 delivery. If one person causes most of it, they're probably always silenced, which is fine. |
| Median reply time | Under 60s | People may be tuning it out. Ask them. |
| People unchecked 30+ days | Zero | Chase them this week |
| SOS this month | 0 or 1 | Look at the log and talk to the senders |
| Pages per person per day | 2 to 3 | 15 or more means it's being used as chat |

## Runbooks

### Someone joins

1. Give them the organisation code.
2. Sit with them for five minutes while they set up. Don't send instructions by email.
3. Watch the reachability check pass. Don't take their word for it.
4. If their phone model is new to the device list, run the release acceptance test on it and add it.

### Someone leaves

1. Deactivate them in the admin view.
2. Pages in flight are cancelled automatically.
3. Their page history is deleted with everyone else's after 90 days.

### "My phone didn't ring"

Work through in this order. The first two cover most cases.

**Android:**
1. Run the reachability check. If it passes now, the page may have arrived while the phone was restarting or had no signal.
2. Check battery settings for their phone make (instructions are in the app's setup).
3. Check Do Not Disturb access is still granted.
4. Check notifications for Hodi are still on in system settings.
5. Reinstall, which recreates the notification channel.

**iPhone:**
1. Run the reachability check.
2. Open Contacts, Hodi line, Ringtone. Is Emergency Bypass still on? It sometimes switches itself off.
3. Is the Hodi line number saved correctly?
4. Are notifications for Hodi allowed?
5. Did the fallback call show in their call log? If yes but silent, it's Emergency Bypass.

### The organisation code leaks

Change it in `orgs/{orgId}.codeHash`. Existing members stay signed in. New joiners need the new code.

### Never change the Hodi line number

Every iPhone user's Emergency Bypass setting is attached to it. Changing it means every iPhone user redoes setup, and anyone who doesn't becomes silently unreachable.

If it absolutely has to change: announce it, give everyone a week, run a reachability check for every iPhone user, and keep the old number active for a month.

### Apple grants Critical Alerts

1. Add the entitlement to the iOS app and ship an update.
2. After most iPhones have updated, set `criticalAlertsGranted: true` in `config/delivery`.
3. iPhones now ring through silent mode on layer 1. The fallback window for iPhones becomes 30 seconds, like Android.
4. Keep Emergency Bypass set. It's still the backup.

## Incidents

| Situation | Effect | Response |
|---|---|---|
| Firebase outage | Nothing works | Tell staff to use phones and messaging. Nothing to fix on our side. |
| Telephony outage | Silenced iPhones can't be reached | Layer 1 still works for everyone else. Tell iPhone users to unsilence if it's prolonged. |
| Call cap hit unexpectedly | Fallback stops for the day | Check the page log for a loop or a duplicate trigger before raising the cap |
| A release breaks delivery | Pages silent | Roll back. The acceptance test should have caught it, so find out why it didn't. |
| An OS update changes behaviour | Pages silent on one platform | Run the acceptance test on an updated phone the day an update lands |

## Privacy

Before anyone installs, give staff a short written note covering:

- what Hodi records: who paged whom, when, why, and whether they replied
- who can see it: sender and recipient see their own pages, everyone sees SOS pages, the administrator sees reachability dates
- what it never records: location, or anything outside Hodi
- how long it's kept: 90 days
- that the fallback call leaves a missed call in their phone's log

Installing on a personal phone something that can make noise at any time needs informed agreement, not just a policy.
