import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../core/components/reply_button.dart';
import '../../models/page.dart';

class IncomingPageScreen extends StatelessWidget {
  final HodiPage page;
  final Function(String responseKey) onReply;

  const IncomingPageScreen({
    super.key,
    required this.page,
    required this.onReply,
  });

  @override
  Widget build(BuildContext context) {
    final isSos = page.kind == PageKind.sos;

    return PopScope(
      canPop: false, // Prevent dismissing without replying per FR-23 & Decision 014
      child: Scaffold(
        backgroundColor: context.t.pageUrgentSurface,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: Column(
              children: [
                const SizedBox(height: 20),
                if (isSos) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: context.t.pageUrgent,
                      borderRadius: BorderRadius.circular(9999),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.warning, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'EMERGENCY SOS',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
                CircleAvatar(
                  radius: 50,
                  backgroundColor: context.t.pageUrgent.withOpacity(0.2),
                  child: Text(
                    page.fromName.isNotEmpty ? page.fromName[0].toUpperCase() : '?',
                    style: TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      color: context.t.pageUrgent,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  page.fromName,
                  style: TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    color: context.t.textPrimary,
                    height: 1.1,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: context.t.surfaceRaised,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: context.t.pageUrgent.withOpacity(0.3)),
                  ),
                  child: Text(
                    page.reason,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w500,
                      color: context.t.textPrimary,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const Spacer(),
                Row(
                  children: [
                    ReplyButton(
                      label: 'On my\nway',
                      onTap: () => onReply('on_my_way'),
                    ),
                    ReplyButton(
                      label: 'Give\nme 5',
                      onTap: () => onReply('five_minutes'),
                    ),
                    ReplyButton(
                      label: "I'm\ntied up",
                      onTap: () => onReply('busy'),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
