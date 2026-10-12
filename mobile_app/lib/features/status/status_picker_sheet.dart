import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../models/status.dart';

class StatusPickerSheet extends StatefulWidget {
  final UserStatus currentStatus;
  final Function(UserStatusType type, int durationMinutes) onSelectStatus;

  const StatusPickerSheet({
    super.key,
    required this.currentStatus,
    required this.onSelectStatus,
  });

  @override
  State<StatusPickerSheet> createState() => _StatusPickerSheetState();
}

class _StatusPickerSheetState extends State<StatusPickerSheet> {
  UserStatusType? _selectedType;
  int _selectedDuration = 60; // default 1 hour

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: BoxDecoration(
        color: context.t.surfaceRaised,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Set Your Status',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: context.t.textPrimary,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildStatusTile(UserStatusType.available, 'Available', Icons.check_circle_outline),
          _buildStatusTile(UserStatusType.meeting, 'In a meeting', Icons.groups_outlined),
          _buildStatusTile(UserStatusType.driving, 'Driving', Icons.directions_car_outlined),
          _buildStatusTile(UserStatusType.focused, 'Focused', Icons.do_not_disturb_on_outlined),
          _buildStatusTile(UserStatusType.offsite, 'Off site', Icons.location_off_outlined),

          if (_selectedType != null && _selectedType != UserStatusType.available) ...[
            const SizedBox(height: 20),
            Text(
              'For how long?',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: context.t.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildDurationChip(30, '30 min'),
                const SizedBox(width: 8),
                _buildDurationChip(60, '1 hour'),
                const SizedBox(width: 8),
                _buildDurationChip(120, '2 hours (Max)'),
              ],
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: context.t.brand,
                foregroundColor: context.t.onBrand,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () {
                final type = _selectedType ?? UserStatusType.available;
                widget.onSelectStatus(type, type == UserStatusType.available ? 0 : _selectedDuration);
                Navigator.pop(context);
              },
              child: const Text(
                'Save Status',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTile(UserStatusType type, String title, IconData icon) {
    final isSelected = _selectedType == type;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: isSelected ? context.t.brand : context.t.border),
        ),
        tileColor: isSelected ? context.t.brand.withOpacity(0.08) : null,
        leading: Icon(icon, color: isSelected ? context.t.brand : context.t.textSecondary),
        title: Text(
          title,
          style: TextStyle(
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: context.t.textPrimary,
          ),
        ),
        trailing: isSelected ? Icon(Icons.check, color: context.t.brand) : null,
        onTap: () {
          setState(() {
            _selectedType = type;
          });
        },
      ),
    );
  }

  Widget _buildDurationChip(int minutes, String label) {
    final isSelected = _selectedDuration == minutes;
    return Expanded(
      child: ChoiceChip(
        label: Center(child: Text(label)),
        selected: isSelected,
        selectedColor: context.t.brand,
        labelStyle: TextStyle(
          color: isSelected ? context.t.onBrand : context.t.textPrimary,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
        onSelected: (val) {
          if (val) {
            setState(() {
              _selectedDuration = minutes;
            });
          }
        },
      ),
    );
  }
}
