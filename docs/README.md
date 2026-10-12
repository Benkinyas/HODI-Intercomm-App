# Hodi documentation

Hodi lets anyone in an organisation summon a specific colleague with one tap. The page rings on the colleague's phone straight away. If the phone is silenced and the page goes unanswered, a fallback makes it ring anyway.

That is the whole product. These documents explain why it exists, how it works, and how to build and run it.

> *Hodi* is what you call out at a door before entering. The reply is *karibu*. It's a working name.

## Where to start

If you have ten minutes, read [How it works](02-how-it-works.md). It explains the one technical idea everything else depends on, in plain language, without assuming you write code.

If you're deciding whether to fund or approve this, read the [Product brief](01-product-brief.md) and the [Roadmap](11-roadmap.md).

If you're building it, read in order: How it works, [Architecture](06-architecture.md), [Mobile implementation](07-mobile-implementation.md), then [Decisions](08-decisions.md) so you know which choices are settled and why.

## The documents

| # | Document | For | Answers |
|---|---|---|---|
| 01 | [Product brief](01-product-brief.md) | Everyone | What problem, for whom, and what we refuse to build |
| 02 | [How it works](02-how-it-works.md) | Everyone | How a page reaches a silenced phone |
| 03 | [Requirements](03-requirements.md) | Product, engineering, QA | What exactly the system must do, and how we test it |
| 04 | [User flows](04-user-flows.md) | Design, engineering | Every screen, every path, every edge case |
| 05 | [Design system](05-design-system.md) | Design, engineering | Tokens, components, screens, sound, accessibility |
| 06 | [Architecture](06-architecture.md) | Engineering | Components, data model, delivery engine |
| 07 | [Mobile implementation](07-mobile-implementation.md) | Engineering | Flutter structure, platform code, gotchas |
| 08 | [Decisions](08-decisions.md) | Engineering, product | Settled choices and the reasoning behind them |
| 09 | [Testing](09-testing.md) | Engineering, QA | The device matrix and the test that decides release |
| 10 | [Operations](10-operations.md) | Whoever runs it | Costs, monitoring, onboarding staff, incidents |
| 11 | [Roadmap](11-roadmap.md) | Everyone | What ships when, and what we're deliberately leaving out |

## Glossary

| Term | Meaning |
|---|---|
| Page | A request from one person for another person's attention. Always has a reason attached. |
| Sender | The person sending a page. |
| Recipient | The person being paged. |
| Ring | The immediate alert, delivered as a push notification with sound. |
| Fallback | A phone call placed to the recipient when a page goes unanswered. Rings through silent mode. |
| Fallback window | How long the system waits for an answer before placing the fallback call. |
| Acknowledge | The recipient tapping one of the three replies. Stops the ring and cancels the fallback. |
| Status | A self-declared state like "In a meeting" that holds pages silently. Lasts at most two hours. |
| Held page | A page waiting for the recipient's status to expire. Delivered quietly when it does. |
| SOS | An emergency page. Ignores status and fires the ring and the fallback at the same time. |
| Hodi line | The single fixed phone number that places every fallback call. Never changes. |
| Emergency Bypass | An iPhone setting, per contact, that lets that contact's calls ring through silent mode. |
| Alarm channel | An Android notification channel that plays on the alarm audio stream, which silent mode doesn't mute. |
| Reachability check | A real test page sent to your own phone to prove your setup works. |

## Status of these documents

Draft, September 2026. The first deployment is one office of about 25 people. The design is meant to hold up to a few hundred without a rewrite.

When something in the build contradicts a document, fix the document in the same change. Out-of-date docs are worse than none, because people trust them.
