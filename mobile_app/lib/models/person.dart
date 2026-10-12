import 'status.dart';

class Person {
  final String id;
  final String name;
  final String role;
  final String? photoUrl;
  final bool active;
  final UserStatus status;
  final DateTime? lastVerifiedAt;
  final bool prefersVisualAlert;

  const Person({
    required this.id,
    required this.name,
    required this.role,
    this.photoUrl,
    required this.active,
    required this.status,
    this.lastVerifiedAt,
    this.prefersVisualAlert = false,
  });

  bool get isReachabilityOverdue {
    if (lastVerifiedAt == null) return true;
    final diff = DateTime.now().difference(lastVerifiedAt!);
    return diff.inDays >= 30;
  }

  factory Person.fromMap(String id, Map<String, dynamic> data) {
    DateTime? lastVerified;
    if (data['lastVerifiedAt'] != null) {
      lastVerified = (data['lastVerifiedAt'] as dynamic).toDate();
    }
    return Person(
      id: id,
      name: data['name'] ?? 'Unknown',
      role: data['role'] ?? 'Staff',
      photoUrl: data['photoUrl'],
      active: data['active'] ?? true,
      status: UserStatus.fromMap(data),
      lastVerifiedAt: lastVerified,
      prefersVisualAlert: data['prefersVisualAlert'] ?? false,
    );
  }
}
