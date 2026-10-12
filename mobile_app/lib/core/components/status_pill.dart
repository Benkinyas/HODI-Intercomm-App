import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../models/status.dart';

class StatusPill extends StatelessWidget {
  final UserStatus status;

  const StatusPill({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color dotColor;
    if (status.isExpired) {
      dotColor = context.t.statusAvailable;
    } else {
      switch (status.type) {
        case UserStatusType.available:
          dotColor = context.t.statusAvailable;
          break;
        case UserStatusType.meeting:
        case UserStatusType.driving:
        case UserStatusType.focused:
          dotColor = context.t.statusBusy;
          break;
        case UserStatusType.offsite:
          dotColor = context.t.statusAway;
          break;
      }
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: context.t.surfaceRaised,
        borderRadius: BorderRadius.circular(9999),
        border: Border.all(color: context.t.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: context.t.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
