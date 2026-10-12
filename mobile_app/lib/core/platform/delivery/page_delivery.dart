import '../../../models/page.dart';

class ReadinessReport {
  final bool notificationsAllowed;
  final bool dndAccessAllowed;
  final bool batteryOptimizationIgnored;
  final bool emergencyBypassConfigured;

  const ReadinessReport({
    required this.notificationsAllowed,
    required this.dndAccessAllowed,
    required this.batteryOptimizationIgnored,
    required this.emergencyBypassConfigured,
  });

  bool get isReady => notificationsAllowed && emergencyBypassConfigured;
}

abstract class PageDelivery {
  Future<void> init({required void Function(HodiPage page) onOpenPage});
  Future<ReadinessReport> readiness();
  Future<void> show(HodiPage page);
  Future<void> cancel(int notificationId);
}
