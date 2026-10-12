import 'package:flutter/material.dart';

@immutable
class HodiTokens extends ThemeExtension<HodiTokens> {
  const HodiTokens({
    required this.surface,
    required this.surfaceRaised,
    required this.textPrimary,
    required this.textSecondary,
    required this.textTertiary,
    required this.border,
    required this.brand,
    required this.onBrand,
    required this.pageUrgent,
    required this.pageUrgentSurface,
    required this.statusAvailable,
    required this.statusBusy,
    required this.statusAway,
    required this.statusUnknown,
  });

  final Color surface;
  final Color surfaceRaised;
  final Color textPrimary;
  final Color textSecondary;
  final Color textTertiary;
  final Color border;
  final Color brand;
  final Color onBrand;
  final Color pageUrgent;
  final Color pageUrgentSurface;
  final Color statusAvailable;
  final Color statusBusy;
  final Color statusAway;
  final Color statusUnknown;

  static const light = HodiTokens(
    surface: Color(0xFFF7F9F8),
    surfaceRaised: Color(0xFFFFFFFF),
    textPrimary: Color(0xFF111827),
    textSecondary: Color(0xFF4B5563),
    textTertiary: Color(0xFF9CA3AF),
    border: Color(0xFFE5E7EB),
    brand: Color(0xFF1B4D3E),
    onBrand: Color(0xFFFFFFFF),
    pageUrgent: Color(0xFFD64545),
    pageUrgentSurface: Color(0xFFFFF1F1),
    statusAvailable: Color(0xFF16A34A),
    statusBusy: Color(0xFFD97706),
    statusAway: Color(0xFF2563EB),
    statusUnknown: Color(0xFF9CA3AF),
  );

  static const dark = HodiTokens(
    surface: Color(0xFF0F1412),
    surfaceRaised: Color(0xFF1A211E),
    textPrimary: Color(0xFFF3F4F6),
    textSecondary: Color(0xFF9CA3AF),
    textTertiary: Color(0xFF6B7280),
    border: Color(0xFF2A332F),
    brand: Color(0xFF4ADE80),
    onBrand: Color(0xFF0F1412),
    pageUrgent: Color(0xFFEF6B6B),
    pageUrgentSurface: Color(0xFF3A1515),
    statusAvailable: Color(0xFF4ADE80),
    statusBusy: Color(0xFFFBBF24),
    statusAway: Color(0xFF60A5FA),
    statusUnknown: Color(0xFF6B7280),
  );

  @override
  HodiTokens copyWith({
    Color? surface,
    Color? surfaceRaised,
    Color? textPrimary,
    Color? textSecondary,
    Color? textTertiary,
    Color? border,
    Color? brand,
    Color? onBrand,
    Color? pageUrgent,
    Color? pageUrgentSurface,
    Color? statusAvailable,
    Color? statusBusy,
    Color? statusAway,
    Color? statusUnknown,
  }) {
    return HodiTokens(
      surface: surface ?? this.surface,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
      textPrimary: textPrimary ?? this.textPrimary,
      textSecondary: textSecondary ?? this.textSecondary,
      textTertiary: textTertiary ?? this.textTertiary,
      border: border ?? this.border,
      brand: brand ?? this.brand,
      onBrand: onBrand ?? this.onBrand,
      pageUrgent: pageUrgent ?? this.pageUrgent,
      pageUrgentSurface: pageUrgentSurface ?? this.pageUrgentSurface,
      statusAvailable: statusAvailable ?? this.statusAvailable,
      statusBusy: statusBusy ?? this.statusBusy,
      statusAway: statusAway ?? this.statusAway,
      statusUnknown: statusUnknown ?? this.statusUnknown,
    );
  }

  @override
  HodiTokens lerp(ThemeExtension<HodiTokens>? other, double t) {
    if (other is! HodiTokens) return this;
    return HodiTokens(
      surface: Color.lerp(surface, other.surface, t)!,
      surfaceRaised: Color.lerp(surfaceRaised, other.surfaceRaised, t)!,
      textPrimary: Color.lerp(textPrimary, other.textPrimary, t)!,
      textSecondary: Color.lerp(textSecondary, other.textSecondary, t)!,
      textTertiary: Color.lerp(textTertiary, other.textTertiary, t)!,
      border: Color.lerp(border, other.border, t)!,
      brand: Color.lerp(brand, other.brand, t)!,
      onBrand: Color.lerp(onBrand, other.onBrand, t)!,
      pageUrgent: Color.lerp(pageUrgent, other.pageUrgent, t)!,
      pageUrgentSurface: Color.lerp(pageUrgentSurface, other.pageUrgentSurface, t)!,
      statusAvailable: Color.lerp(statusAvailable, other.statusAvailable, t)!,
      statusBusy: Color.lerp(statusBusy, other.statusBusy, t)!,
      statusAway: Color.lerp(statusAway, other.statusAway, t)!,
      statusUnknown: Color.lerp(statusUnknown, other.statusUnknown, t)!,
    );
  }
}

extension HodiContext on BuildContext {
  HodiTokens get t => Theme.of(this).extension<HodiTokens>() ?? HodiTokens.light;
}
