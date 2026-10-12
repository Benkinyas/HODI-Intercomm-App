enum UserStatusType {
  available,
  meeting,
  driving,
  focused,
  offsite,
}

class UserStatus {
  final UserStatusType type;
  final DateTime? expiresAt;

  const UserStatus({
    required this.type,
    this.expiresAt,
  });

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }

  bool get isBusy {
    if (isExpired) return false;
    return type == UserStatusType.meeting ||
        type == UserStatusType.driving ||
        type == UserStatusType.focused;
  }

  String get label {
    if (isExpired) return 'Available';
    switch (type) {
      case UserStatusType.available:
        return 'Available';
      case UserStatusType.meeting:
        return 'In a meeting';
      case UserStatusType.driving:
        return 'Driving';
      case UserStatusType.focused:
        return 'Focused';
      case UserStatusType.offsite:
        return 'Off site';
    }
  }

  factory UserStatus.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const UserStatus(type: UserStatusType.available);
    final typeStr = map['type'] as String? ?? 'available';
    final expiresAtTimestamp = map['statusExpiresAt'];
    DateTime? expiresAt;
    if (expiresAtTimestamp != null) {
      expiresAt = (expiresAtTimestamp as dynamic).toDate();
    }
    UserStatusType type;
    switch (typeStr) {
      case 'meeting':
        type = UserStatusType.meeting;
        break;
      case 'driving':
        type = UserStatusType.driving;
        break;
      case 'focused':
        type = UserStatusType.focused;
        break;
      case 'offsite':
        type = UserStatusType.offsite;
        break;
      default:
        type = UserStatusType.available;
    }
    return UserStatus(type: type, expiresAt: expiresAt);
  }
}
