# Mobile implementation

How the Flutter app is built. Read [Architecture](06-architecture.md) first for the server side.

## Checkpoint

Before writing code, settle these. They're settled.

| Question | Answer |
|---|---|
| Platforms | Android and iPhone, from one codebase |
| Framework | Flutter 3.x, Dart 3 |
| State | Riverpod |
| Navigation | go_router. Hub and spoke, directory as the hub. |
| Offline | Cached directory readable offline. Sending needs a connection and says so. |
| Devices | Phones only. Tablets work but aren't designed for. |
| Audience | Staff at work, often distracted, often one-handed |

### Risk assessment

Scoring each dimension 1 to 5 before building, following the mobile feasibility index:

| Dimension | Score | Note |
|---|---|---|
| Platform clarity | 5 | Both platforms defined, constraints researched |
| Accessibility readiness | 4 | Specified in the design system, needs testing |
| Interaction complexity | 1 | Tap, tap, done |
| Performance risk | 1 | One list, no media, no heavy animation |
| Offline dependence | 3 | Paging needs network by nature |

Score: (5 + 4) − (1 + 1 + 3) = **4, moderate.** The screens are simple. The risk is almost entirely in background delivery, which is why it gets built and tested first.

## Project structure

Feature-first, so everything about one feature sits together.

```
lib/
  main.dart
  app/
    router.dart
    theme/
      tokens.dart            HodiTokens theme extension
      theme.dart
  core/
    components/              PersonRow, StatusPill, ReplyButton, ...
    firebase/
    platform/
      delivery/
        page_delivery.dart           interface
        android_alarm_delivery.dart
        ios_delivery.dart
      reachability.dart
  features/
    directory/
      directory_screen.dart
      directory_controller.dart
    send/
      reason_sheet.dart
      sent_screen.dart
      send_controller.dart
    incoming/
      incoming_page_screen.dart
      incoming_controller.dart
    status/
    sos/
    setup/
      steps/
      setup_controller.dart
  models/
    person.dart  page.dart  status.dart
```

## Packages

| Package | Why |
|---|---|
| `firebase_core`, `firebase_messaging`, `cloud_firestore`, `cloud_functions`, `firebase_auth` | Backend |
| `flutter_local_notifications` 17 or later | Android alarm channel, full-screen intents, iOS foreground handling |
| `permission_handler` | Notifications, Do Not Disturb access, battery optimisation |
| `flutter_riverpod` | State |
| `go_router` | Navigation |
| `flutter_secure_storage` | Anything sensitive kept on the device |
| `device_info_plus` | Phone make, to show the right battery instructions |
| `path_provider`, `open_filex` | Writing and opening the Hodi line contact card |

Keep this list short. Every package is something that can break on an OS update.

## State

Riverpod providers wrap every service, so tests can swap in fakes.

```dart
final pageDeliveryProvider = Provider<PageDelivery>((ref) {
  return Platform.isAndroid ? AndroidAlarmDelivery() : IosDelivery();
});

final directoryProvider = StreamProvider<List<Person>>((ref) {
  final org = ref.watch(currentOrgProvider);
  return FirebaseFirestore.instance
      .collection('orgs/$org/people')
      .where('active', isEqualTo: true)
      .orderBy('name')
      .snapshots()
      .map((s) => s.docs.map(Person.fromDoc).toList());
});

final pageProvider = StreamProvider.family<Page, String>((ref, pageId) {
  final org = ref.watch(currentOrgProvider);
  return FirebaseFirestore.instance
      .doc('orgs/$org/pages/$pageId')
      .snapshots()
      .map(Page.fromDoc);
});
```

The sent screen watches `pageProvider(pageId)`. When the server writes a reply, the screen updates. No polling.

## The delivery interface

```dart
abstract interface class PageDelivery {
  /// Create channels, register handlers. Call before runApp.
  Future<void> init({required void Function(IncomingPage) onOpen});

  /// What's missing for this phone to receive pages.
  Future<ReadinessReport> readiness();

  /// Show a page locally (foreground, and the reachability check).
  Future<void> show(IncomingPage page);

  /// Remove a page's notification.
  Future<void> cancel(int notificationId);
}
```

Everything above this interface is shared Dart. Everything below it is platform-specific.

## Android

### The alarm channel

Created at startup, before any page can arrive. If a page references a channel the phone has never seen, Android falls back to default behaviour and the page arrives silently. Every log will say it succeeded.

```dart
const pageChannel = AndroidNotificationChannel(
  'hodi_page_v1',
  'Pages',
  description: 'Someone at work needs you.',
  importance: Importance.max,
  audioAttributesUsage: AudioAttributesUsage.alarm,
  sound: RawResourceAndroidNotificationSound('hodi_page'),
  bypassDnd: true,
);
```

A second channel, `hodi_sos_v1`, with its own sound. Separate channels mean someone who mutes pages in system settings still gets emergencies.

**Channels can't be changed after they're created.** Change the sound, importance or audio usage, and phones that already have the channel keep the old one. You have to ship a new id. That's why the id has `_v1`. When you're testing and a change doesn't seem to take, uninstall the app completely before debugging anything else.

### Permissions, in order

| Permission | Why | What breaks without it |
|---|---|---|
| `POST_NOTIFICATIONS` (Android 13+) | Show anything at all | Nothing arrives |
| Do Not Disturb access | Makes `bypassDnd` work | The flag is ignored with no error |
| `USE_FULL_SCREEN_INTENT` | The incoming page shows over the lock screen | Page is a banner only |
| Ignore battery optimisation | Survive aggressive battery managers | Pages delayed or dropped on many phones |

Android 14 restricts full-screen intents to calling and alarm apps, and Google Play can revoke the permission from apps that don't fit. The incoming page is a genuine call-style screen, so Hodi fits honestly. Keep it looking like one.

### Showing the page

```dart
AndroidNotificationDetails(
  channel.id, channel.name,
  importance: Importance.max,
  priority: Priority.max,
  category: AndroidNotificationCategory.call,
  fullScreenIntent: true,
  audioAttributesUsage: AudioAttributesUsage.alarm,
  additionalFlags: Int32List.fromList([4]),  // FLAG_INSISTENT: repeat the sound
  visibility: NotificationVisibility.public,
);
```

`FLAG_INSISTENT` makes the sound repeat until the notification is dealt with. Without it, Android cuts notification sounds at around five seconds. The insistent sound stops when the app cancels the notification after a reply, or after the 30-second limit enforced by the app's own timer.

### Phones that kill background apps

Tecno (HiOS), Infinix (XOS), Xiaomi (MIUI and HyperOS), Oppo and Realme (ColorOS) all manage background apps aggressively. The in-app battery prompt isn't enough on them. People also need to allow auto-start and turn off app-specific power saving in system settings.

Setup reads the make with `device_info_plus` and shows instructions for that phone. Keep the instructions in a small JSON file in the app so they can be updated with a release, not in code.

```json
{
  "tecno": [
    "Settings → Apps → Hodi → Battery → Don't restrict",
    "Phone Master → Auto-start → allow Hodi",
    "Settings → Notifications → Hodi → turn off 'Block when screen is off'"
  ]
}
```

These paths change between OS versions. Check them on real phones before each release.

### Manifest

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
<uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<activity
    android:name=".MainActivity"
    android:showWhenLocked="true"
    android:turnScreenOn="true"
    android:launchMode="singleTop" ... >
```

Google Play asks for a justification for the battery optimisation permission. "Time-critical workplace alerts that must arrive while the app is in the background" is the honest answer.

## iPhone

### What an iPhone can and can't do

An iPhone app can't make sound while the phone is silenced. It also can't show a full-screen page over the lock screen from a notification; only the system's call interface can do that. So on iPhone:

- Layer 1 is a notification banner with sound, which is heard only if the phone isn't silenced.
- Tapping it opens the app straight to the incoming page screen.
- Layer 2, the phone call, is what rings through silent mode.

The design system describes the incoming page as full screen over the lock screen. On iPhone, read that as "full screen once the app opens". It's a platform limit, not a design choice.

### Capabilities to enable

| Capability | Needs Apple's approval? | Why |
|---|---|---|
| Push notifications | No | Layer 1 |
| Time Sensitive notifications | No | Break through Focus modes |
| Critical Alerts | **Yes, apply separately** | Would let layer 1 ring through silent mode |

Apply for Critical Alerts early. It's free, needs no working app, and Apple takes days to weeks. Build as if it'll be refused. If it's granted, set `criticalAlertsGranted: true` in `config/delivery` and every iPhone upgrades without an app update.

### Sound files

iPhone notification sounds must be in the app bundle, under 30 seconds, in `.caf`, `.aiff` or `.wav`. Convert with:

```
afconvert hodi_page.wav hodi_page.caf -d ima4 -f caff -v
```

### Foreground pages

When the app is open and a page arrives, don't let the system show a banner as well as the in-app screen. That's the double notification bug.

```dart
await FirebaseMessaging.instance
    .setForegroundNotificationPresentationOptions(
      alert: false, badge: false, sound: false,
    );

FirebaseMessaging.onMessage.listen((m) {
  final page = IncomingPage.fromData(m.data);
  if (page != null) router.go('/incoming', extra: page);
});
```

Play the page sound yourself while the incoming screen is up.

### Delivery reports (optional, v1)

A Notification Service Extension runs when a push arrives, even if the app is closed. It can call the server to record that the page reached the phone, which lets the sender see "Delivered" and lets us measure layer 1 separately from replies.

It's a small Swift target in the iOS project. It isn't needed for the demo.

### The Hodi line contact

Setup hands the person a ready-made contact card, so nobody types the number wrong.

```dart
Future<void> offerHodiContact(String number) async {
  final vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Line;Hodi;;;',
    'FN:Hodi line',
    'TEL;TYPE=WORK,VOICE:$number',
    'END:VCARD',
  ].join('\r\n');

  final dir = await getTemporaryDirectory();
  final file = File('${dir.path}/hodi-line.vcf');
  await file.writeAsString(vcf);
  await OpenFilex.open(file.path);   // iOS offers "Add to Contacts"
}
```

Then three screenshots showing Contacts, Hodi line, Edit, Ringtone, Emergency Bypass. Then the reachability check proves it worked. No app can switch Emergency Bypass on for someone. It has to be done by hand.

## Notification ids

Local notifications need integer ids. Use `page.seq` from the server. Don't use `pageId.hashCode`: two pages can hash to the same number, and replying to one would dismiss the other.

## Background handler

```dart
@pragma('vm:entry-point')
Future<void> hodiBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  if (message.data['type'] == 'cancel') {
    final seq = int.tryParse(message.data['seq'] ?? '');
    if (seq != null) await FlutterLocalNotificationsPlugin().cancel(seq);
  }
}

// In main(), before runApp:
FirebaseMessaging.onBackgroundMessage(hodiBackgroundHandler);
```

This handles cancel messages when someone replies on another device. The ring itself doesn't depend on it: on Android the system posts the `notification` payload directly.

## Building iOS without a Mac

Codemagic builds Flutter iOS apps in the cloud and has a free tier. You still need the Apple Developer Program ($99 a year) for signing and TestFlight.

## Gotchas

The mistakes that cost the most time, roughly in order of how often they happen.

| Symptom | Cause | Fix |
|---|---|---|
| Changed the sound, nothing changed | Channel already exists on the phone | Uninstall, or bump the channel id |
| Silent on a killed Android app | Server sent data-only | Send a `notification` block with `channelId` |
| Rings with the app open, silent when closed | Tested in the foreground only | Always test with the app swiped away |
| Silent despite `bypassDnd: true` | Do Not Disturb access not granted | Check the readiness report |
| Arrives minutes late on some phones | Battery manager | Make-specific setup steps |
| Two notifications on iPhone when open | System banner plus in-app screen | Foreground presentation options off |
| Sound cuts off after five seconds | Not insistent | `FLAG_INSISTENT` |
| Build fails on the sound resource | Capital letter or hyphen in filename | Lowercase and underscores only |
| Replying dismisses the wrong page | Hash-based notification id | Use `seq` |
| iPhone call doesn't ring on silent | Emergency Bypass off or reverted | Reachability check |

## Before release

- [ ] Every touch target at least 48 points, primary actions 64
- [ ] Offline state shown on the directory, sending fails clearly
- [ ] No secrets in the app. Tokens in secure storage.
- [ ] Directory uses `ListView.builder`
- [ ] No debug logging in release builds
- [ ] Tested on the cheapest phone anyone in the office uses
- [ ] Every control has a screen reader label
- [ ] The acceptance test in [Testing](09-testing.md) passes on every handset model
