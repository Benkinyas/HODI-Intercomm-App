import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../core/components/person_row.dart';
import '../../core/components/status_pill.dart';
import '../../models/person.dart';
import '../../models/status.dart';

class DirectoryScreen extends StatelessWidget {
  final UserStatus ownStatus;
  final List<Person> people;
  final Function(Person recipient) onSelectPerson;
  final VoidCallback onTapOwnStatus;
  final VoidCallback onTapReachabilityCheck;
  final VoidCallback onTapSosLog;

  const DirectoryScreen({
    super.key,
    required this.ownStatus,
    required this.people,
    required this.onSelectPerson,
    required this.onTapOwnStatus,
    required this.onTapReachabilityCheck,
    required this.onTapSosLog,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hodi Directory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_edu),
            tooltip: 'SOS Log',
            onPressed: onTapSosLog,
          ),
        ],
      ),
      body: Column(
        children: [
          // Own status bar
          InkWell(
            onTap: onTapOwnStatus,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: context.t.brand.withOpacity(0.08),
              child: Row(
                children: [
                  Text(
                    'Your Status: ',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: context.t.textPrimary,
                    ),
                  ),
                  StatusPill(status: ownStatus),
                  const Spacer(),
                  Icon(Icons.edit, size: 16, color: context.t.brand),
                ],
              ),
            ),
          ),
          Divider(height: 1, color: context.t.border),
          // Roster
          Expanded(
            child: ListView.builder(
              itemCount: people.length,
              itemBuilder: (ctx, idx) {
                final person = people[idx];
                return PersonRow(
                  person: person,
                  onTap: () => onSelectPerson(person),
                );
              },
            ),
          ),
          // Bottom links
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: context.t.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  onPressed: onTapReachabilityCheck,
                  icon: Icon(Icons.verified_user_outlined, size: 18, color: context.t.brand),
                  label: Text(
                    'Check I can be reached',
                    style: TextStyle(color: context.t.brand, fontWeight: FontWeight.bold),
                  ),
                ),
                TextButton(
                  onPressed: onTapSosLog,
                  child: Text(
                    'SOS Log',
                    style: TextStyle(color: context.t.textSecondary),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
