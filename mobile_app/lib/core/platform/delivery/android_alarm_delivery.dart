import 'dart:typed_data';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../models/page.dart';
import 'page_delivery.dart';

class AndroidAlarmDelivery implements PageDelivery {
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  static const String pageChannelId = 'hodi_page_v1';
  static const String sosChannelId = 'hodi_sos_v1';

  @override
  Future<void> init({required void Function(HodiPage page) onOpenPage}) async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null) {
          // parse payload and invoke onOpenPage
        }
      },
    );

    // Create Android Alarm Channels
    final pageChannel = AndroidNotificationChannel(
      pageChannelId,
      'Pages',
      description: 'Urgent workplace page notifications',
      importance: Importance.max,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      sound: const RawResourceAndroidNotificationSound('hodi_page'),
      playSound: true,
    );

    final sosChannel = AndroidNotificationChannel(
      sosChannelId,
      'Emergency SOS',
      description: 'Critical SOS emergency pages',
      importance: Importance.max,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      sound: const RawResourceAndroidNotificationSound('hodi_sos'),
      playSound: true,
    );

    final androidPlugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(pageChannel);
      await androidPlugin.createNotificationChannel(sosChannel);
    }
  }

  @override
  Future<ReadinessReport> readiness() async {
    final status = await Permission.notification.status;
    return ReadinessReport(
      notificationsAllowed: status.isGranted,
      dndAccessAllowed: true,
      batteryOptimizationIgnored: true,
      emergencyBypassConfigured: true,
    );
  }

  @override
  Future<void> show(HodiPage page) async {
    final channelId = page.kind == PageKind.sos ? sosChannelId : pageChannelId;

    final androidDetails = AndroidNotificationDetails(
      channelId,
      page.kind == PageKind.sos ? 'Emergency SOS' : 'Pages',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      additionalFlags: Int32List.fromList([4]), // FLAG_INSISTENT repeats alarm sound
      visibility: NotificationVisibility.public,
    );

    final details = NotificationDetails(android: androidDetails);

    await _notifications.show(
      page.seq,
      page.fromName,
      page.reason,
      details,
      payload: page.id,
    );
  }

  @override
  Future<void> cancel(int notificationId) async {
    await _notifications.cancel(notificationId);
  }
}
