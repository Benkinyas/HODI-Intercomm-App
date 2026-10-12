import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../models/person.dart';

class SosComposeScreen extends StatefulWidget {
  final Person recipient;
  final Function(String reason) onConfirmSos;

  const SosComposeScreen({
    super.key,
    required this.recipient,
    required this.onConfirmSos,
  });

  @override
  State<SosComposeScreen> createState() => _SosComposeScreenState();
}

class _SosComposeScreenState extends State<SosComposeScreen> {
  final TextEditingController _reasonController = TextEditingController();
  bool _canSend = false;

  @override
  void initState() {
    super.initState();
    _reasonController.addListener(() {
      setState(() {
        _canSend = _reasonController.text.trim().length >= 10;
      });
    });
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  void _promptConfirmation() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: context.t.surfaceRaised,
        title: Row(
          children: [
            Icon(Icons.warning, color: context.t.pageUrgent),
            const SizedBox(width: 8),
            const Text('Confirm Emergency SOS'),
          ],
        ),
        content: Text(
          'Send emergency SOS page to ${widget.recipient.name}?\n\nThis will bypass silent mode, ignore busy status, and post to the organisation audit log.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: context.t.pageUrgent,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              widget.onConfirmSos(_reasonController.text.trim());
            },
            child: const Text('Send SOS Now'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency SOS'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: context.t.pageUrgentSurface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: context.t.pageUrgent.withOpacity(0.5)),
              ),
              child: Text(
                'This emergency alert will ring immediately even if ${widget.recipient.name} is in a meeting. Everyone will see it in the SOS log.',
                style: TextStyle(
                  fontSize: 15,
                  color: context.t.textPrimary,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              "What's the emergency?",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: context.t.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonController,
              maxLines: 4,
              maxLength: 120,
              decoration: InputDecoration(
                hintText: 'Type reason (minimum 10 characters)...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 64,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _canSend ? context.t.pageUrgent : context.t.border,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _canSend ? _promptConfirmation : null,
                child: const Text(
                  'Send SOS',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
