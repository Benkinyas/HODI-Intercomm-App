# Product brief

## The problem

Every workplace has a recurring moment. Someone needs a specific person, now, and that person is somewhere on the premises but not in front of them.

Workplaces used to have an answer for this: PA systems, desk extensions, bells, pagers. These were institutional tools. The organisation owned the alert, the alert was loud by default, and nobody thought a ringing desk phone was rude.

Mobile phones replaced all of that, and mobile phones are personal devices set up for personal life. The workplace kept the ability to send someone a message and lost the ability to summon them.

### Why the channels we have fail

Messaging is ignorable by design. Someone who gets a hundred notifications a day has to be able to ignore them, and they've trained themselves to. Being reachable and being noticed are two different things, and messaging only solves the first.

Calls are silenced by the same switch as everything else. A phone face-down on silent makes no sound when it rings. A call also demands a conversation, when the whole message is often four words long.

Walking to find the person always works. It also costs minutes every time, gets worse as the building gets bigger, and fails when the person has moved since you last saw them.

### The cause underneath

The sender knows how urgent something is. The recipient decides how loud alerts are, once, in advance, for everything.

Someone silences their phone at nine in the morning for reasons that have nothing to do with you. Every message after that inherits the decision, whether it's a newsletter or a colleague who needs them in two minutes. No mainstream channel lets a sender mark one message as different in a way the phone will respect. The only exception is an alarm, and people set alarms for themselves.

### Silence is a norm, so we can't design it away

Phones are silenced in meetings, on wards, in classrooms, around customers and near machinery. That's courtesy, often policy, sometimes safety. A solution that needs everyone audible all day has misread the problem.

### The gap

There's no way to make a specific person's phone make a sound they'll hear, on demand, while it's silenced. And there's no way to do it that the recipient will put up with for more than a few days.

Both halves count. The first is a technical problem. The second is a design problem and it's the harder one. An alert that can always be heard gets switched off by the person hearing it, unless they keep real control over when it fires.

## Who it's for

Any organisation where three things are true at once: people move around a site, phones are silenced by habit or rule, and finding someone on foot costs real time.

| Setting | The person you need is |
|---|---|
| Offices with several rooms or floors | In someone else's meeting, three rooms away |
| Clinics and care settings | With a patient, phone silenced |
| Hotels | On another floor with their hands full |
| Workshops and warehouses | Wearing ear defenders, nowhere near a screen |
| Schools | Teaching, phone in a drawer |
| Kitchens | On the line during service |
| Field teams | Outdoors, phone in a jacket pocket |

Size isn't the test. A ten-person clinic can have this problem worse than a large office, because it never had an intercom to lose.

The first deployment is one office of about 25 people on their own Android and iPhone handsets. That's where we start, not the limit of what we're building.

## What Hodi is

A replacement for the workplace intercom. Anyone on the roster can summon anyone else. The page rings on the recipient's phone. They see who wants them and why, and reply with one tap.

## What Hodi is not

| Not | Why |
|---|---|
| A chat app | Messaging tools already do this well. No threads, no files, no history. |
| A phone system | Nobody talks through Hodi. The fallback call is a doorbell, and people decline it. |
| Presence or location tracking | Status is something people set themselves. Hodi never records where anyone is. |
| A broadcast or PA system | A page goes to one person. Broadcasting is a separate product with separate problems. |
| A replacement for tools that work | Hodi is for when a message and a call have both failed. |

When someone asks to add chat, file sharing, group messages or location, point them at this table. Without it, Hodi turns into a worse WhatsApp within six months.

## Principles

### 1. A loud alert only works while it's rare

Every other decision has to respect this. Someone startled by something trivial won't complain. They'll mute the app, and nothing in our logs will show it. Pages will keep sending, and one day the page that mattered lands on a phone that's been muted for weeks.

Ask of every feature: does this make the loud alert more common or less?

### 2. The normal path does the work, the fallback covers silence

Most phones aren't silenced most of the time. For those, a notification with sound is enough, and it costs nothing. The expensive, intrusive part (a phone call) should only happen when the normal path has failed.

### 3. The recipient controls interruption, not the system

People get a status they can set in two taps, and it holds pages while they're busy. Status runs out after two hours at most, so "not now" can never quietly become "never".

### 4. Test reachability, don't assume it

If someone skips installing the app, everyone notices. If they install it and get one setting wrong, nothing looks broken until the day it matters. So we check, with a real test page, and we show the result to the people who depend on it.

### 5. Build for the people in the building

The problem is general. The first version is built for 25 people whose names we know, and one of them is the person building it. Features wait until someone in that group actually needs them.

## How we'll know it works

| Measure | Target |
|---|---|
| Pages answered within two minutes | 90% or more |
| Staff who passed a reachability check in the last 30 days | All of them |
| Time from opening the app to sending a page | Five seconds or less |
| Pages that needed the fallback call | Under 20% |
| SOS pages per month | One or fewer |

The measure that matters most can't go on a dashboard. After two weeks, ask the people who used to walk around looking for colleagues whether they still do.

We don't count total pages sent. More pages isn't success. A quiet system where the few pages sent always land is the goal.

## No AI in this product

Hodi's value is that it's predictable. A language model adds delay, cost per request, a dependency on someone else's uptime, and answers that vary from run to run. None of that belongs between a page and a ringing phone, and there's nothing in the core flow for a model to do. [Decision 009](08-decisions.md#009-no-language-model-in-the-product) records this and the one narrow place it might be reconsidered later.
