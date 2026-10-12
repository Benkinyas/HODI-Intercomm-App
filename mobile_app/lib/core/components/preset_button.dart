import 'package:flutter/material.dart';
import '../../app/theme/tokens.dart';

class PresetButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const PresetButton({
    super.key,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: context.t.surfaceRaised,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            constraints: const BoxConstraints(minHeight: 64),
            padding: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: context.t.border),
            ),
            alignment: Alignment.centerLeft,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w600,
                    color: context.t.textPrimary,
                  ),
                ),
                Icon(Icons.arrow_forward_ios, size: 16, color: context.t.textTertiary),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
