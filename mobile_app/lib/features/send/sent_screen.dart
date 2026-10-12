import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';
import '../../core/components/progress_line.dart';
import '../../models/page.dart';

class SentScreen extends StatelessWidget {
  final HodiPage page;
  final VoidCallback onWithdraw;
  final VoidCallback onDone;

  const SentScreen({
    super.key,
    required this.page,
    required this.onWithdraw,
    required this.onDone,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Page Sent'),
        automaticallyImplyLeading: false,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Spacer(),
            CircleAvatar(
              radius: 40,
              backgroundColor: context.t.brand.withOpacity(0.15),
              child: Text(
                page.fromName.isNotEmpty ? page.fromName[0].toUpperCase() : '?',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: context.t.brand,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              page.reason,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: context.t.textPrimary,
              ),
            ),
            const SizedBox(height: 32),
            ProgressLine(page: page),
            const Spacer(),
            if (page.state == PageState.acknowledged)
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: context.t.brand,
                    foregroundColor: context.t.onBrand,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: onDone,
                  child: const Text('Done', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: context.t.textSecondary,
                    side: BorderSide(color: context.t.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: onWithdraw,
                  child: const Text('Withdraw Page', style: TextStyle(fontSize: 16)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
