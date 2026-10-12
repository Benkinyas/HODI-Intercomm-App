import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../core/components/preset_button.dart';
import '../../models/person.dart';

class ReasonSheet extends StatefulWidget {
  final Person recipient;
  final Function(String reason) onSendPage;
  final VoidCallback onSendSos;

  const ReasonSheet({
    super.key,
    required this.recipient,
    required this.onSendPage,
    required this.onSendSos,
  });

  @override
  State<ReasonSheet> createState() => _ReasonSheetState();
}

class _ReasonSheetState extends State<ReasonSheet> {
  final TextEditingController _customController = TextEditingController();

  @override
  void dispose() {
    _customController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom +
            MediaQuery.of(context).padding.bottom +
            20,
      ),
      decoration: BoxDecoration(
        color: context.t.surfaceRaised,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: context.t.brand.withOpacity(0.15),
                  child: Text(
                    widget.recipient.name.isNotEmpty
                        ? widget.recipient.name[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      color: context.t.brand,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Page ${widget.recipient.name}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: context.t.textPrimary,
                        ),
                      ),
                      Text(
                        widget.recipient.role,
                        style: TextStyle(
                          fontSize: 13,
                          color: context.t.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                )
              ],
            ),
            if (widget.recipient.status.isBusy) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: context.t.statusBusy.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: context.t.statusBusy.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: context.t.statusBusy, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        '${widget.recipient.name} is ${widget.recipient.status.label}. Page will be held until status ends.',
                        style: TextStyle(
                          fontSize: 13,
                          color: context.t.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            Text(
              'Select a Reason',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: context.t.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            PresetButton(
              label: 'Come to my office',
              onTap: () => widget.onSendPage('Come to my office'),
            ),
            PresetButton(
              label: 'Call me',
              onTap: () => widget.onSendPage('Call me'),
            ),
            PresetButton(
              label: 'Quick question',
              onTap: () => widget.onSendPage('Quick question'),
            ),
            PresetButton(
              label: 'Need you now',
              onTap: () => widget.onSendPage('Need you now'),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _customController,
                    maxLength: 120,
                    decoration: InputDecoration(
                      hintText: 'Or type custom reason...',
                      counterText: '',
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: context.t.border),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  style: IconButton.styleFrom(
                    backgroundColor: context.t.brand,
                    foregroundColor: context.t.onBrand,
                  ),
                  icon: const Icon(Icons.send),
                  onPressed: () {
                    final text = _customController.text.trim();
                    if (text.isNotEmpty) {
                      widget.onSendPage(text);
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),
            Divider(color: context.t.border),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: context.t.pageUrgent,
                  side: BorderSide(color: context.t.pageUrgent),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon: const Icon(Icons.warning_amber_rounded),
                label: const Text(
                  'Emergency SOS Override',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                onPressed: widget.onSendSos,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
