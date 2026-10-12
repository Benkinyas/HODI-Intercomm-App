import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../models/page.dart';
import 'page_delivery.dart';

class IosDelivery implements PageDelivery {
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  @override
  Future<void> init({required void Function(HodiPage page) onOpenPage}) async {
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(iOS: darwinSettings);

    await _notifications.initialize(initSettings);
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
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      sound: 'hodi_page.caf',
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    const details = NotificationDetails(iOS: darwinDetails);
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
