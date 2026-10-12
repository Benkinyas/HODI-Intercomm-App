import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';

class ReachabilityMarker extends StatelessWidget {
  final VoidCallback? onTap;

  const ReachabilityMarker({super.key, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap ??
          () {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text("Not Checked"),
                content: const Text(
                    "This person hasn't confirmed their phone can receive pages in the last 30 days. They might not hear your page."),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text("OK"),
                  )
                ],
              ),
            );
          },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: context.t.textTertiary),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded, size: 12, color: context.t.textTertiary),
            const SizedBox(width: 4),
            Text(
              "Not checked",
              style: TextStyle(
                fontSize: 11,
                color: context.t.textTertiary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
