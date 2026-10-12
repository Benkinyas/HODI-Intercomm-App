import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';

class CheckReachabilityScreen extends StatefulWidget {
  final Future<void> Function() onSendTestPage;
  final VoidCallback onPass;

  const CheckReachabilityScreen({
    super.key,
    required this.onSendTestPage,
    required this.onPass,
  });

  @override
  State<CheckReachabilityScreen> createState() => _CheckReachabilityScreenState();
}

class _CheckReachabilityScreenState extends State<CheckReachabilityScreen> {
  bool _isTesting = false;
  bool _hasTested = false;

  void _triggerTest() async {
    setState(() {
      _isTesting = true;
    });
    await widget.onSendTestPage();
    setState(() {
      _isTesting = false;
      _hasTested = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reachability Check'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Prove Your Phone Will Ring',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: context.t.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Silence your phone completely, turn on Do Not Disturb, and press the button below. We will send a real test page through the full path (including the fallback phone call if unanswered).',
              style: TextStyle(
                fontSize: 16,
                color: context.t.textSecondary,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 32),
            if (!_hasTested) ...[
              SizedBox(
                width: double.infinity,
                height: 64,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: context.t.brand,
                    foregroundColor: context.t.onBrand,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _isTesting ? null : _triggerTest,
                  icon: _isTesting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(Icons.notifications_active),
                  label: Text(
                    _isTesting ? 'Sending Test Page...' : 'Send Me a Test Page',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: context.t.surfaceRaised,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: context.t.border),
                ),
                child: Column(
                  children: [
                    Text(
                      'Did your phone ring or make a sound?',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: context.t.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: context.t.pageUrgent,
                              side: BorderSide(color: context.t.pageUrgent),
                              padding: const EdgeInsets.vertical(16),
                            ),
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('Troubleshooting Settings'),
                                  content: const Text(
                                    '1. Android: Check Do Not Disturb access & Battery optimization restrictions.\n2. iPhone: Ensure Emergency Bypass is ON for the Hodi Line contact.',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx),
                                      child: const Text('OK'),
                                    ),
                                  ],
                                ),
                              );
                            },
                            child: const Text("Didn't Ring"),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: context.t.statusAvailable,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.vertical(16),
                            ),
                            onPressed: widget.onPass,
                            child: const Text('I Heard It ✓'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
