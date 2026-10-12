import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../models/person.dart';
import 'status_pill.dart';
import 'reachability_marker.dart';

class PersonRow extends StatelessWidget {
  final Person person;
  final VoidCallback onTap;

  const PersonRow({
    super.key,
    required this.person,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 64),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: context.t.border)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: context.t.brand.withOpacity(0.15),
              backgroundImage: person.photoUrl != null ? NetworkImage(person.photoUrl!) : null,
              child: person.photoUrl == null
                  ? Text(
                      person.name.isNotEmpty ? person.name[0].toUpperCase() : '?',
                      style: TextStyle(
                        color: context.t.brand,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          person.name,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: context.t.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (person.isReachabilityOverdue) ...[
                        const SizedBox(width: 6),
                        const ReachabilityMarker(),
                      ]
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    person.role,
                    style: TextStyle(
                      fontSize: 13,
                      color: context.t.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            StatusPill(status: person.status),
          ],
        ),
      ),
    );
  }
}
