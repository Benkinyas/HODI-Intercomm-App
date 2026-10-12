import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../models/page.dart';

class ProgressLine extends StatelessWidget {
  final HodiPage page;

  const ProgressLine({super.key, required this.page});

  @override
  Widget build(BuildContext context) {
    if (page.state == PageState.acknowledged) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle, color: context.t.statusAvailable, size: 24),
          const SizedBox(width: 8),
          Text(
            page.responseText.isNotEmpty ? page.responseText : 'Replied',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: context.t.statusAvailable,
            ),
          ),
        ],
      );
    }

    if (page.state == PageState.held) {
      return Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.pause_circle_outline, color: context.t.statusBusy, size: 24),
              const SizedBox(width: 8),
              Text(
                'Page held - recipient busy',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: context.t.statusBusy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Will be delivered quietly when status ends.',
            style: TextStyle(fontSize: 14, color: context.t.textSecondary),
          ),
        ],
      );
    }

    if (page.state == PageState.calling) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(context.t.brand),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Calling her phone (Layer 2)...',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: context.t.brand,
            ),
          ),
        ],
      );
    }

    // Default: ringing
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: context.t.brand,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'Ringing phone (Layer 1)...',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: context.t.brand,
          ),
        ),
      ],
    );
  }
}
