import 'package:flutter/material.dart';
import 'tokens.dart';

class HodiTheme {
  static ThemeData get lightTheme {
    const tokens = HodiTokens.light;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: tokens.surface,
      colorScheme: ColorScheme.light(
        background: tokens.surface,
        surface: tokens.surfaceRaised,
        primary: tokens.brand,
        secondary: tokens.brand,
        error: tokens.pageUrgent,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.surface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: tokens.textPrimary,
        ),
      ),
      extensions: const [tokens],
    );
  }

  static ThemeData get darkTheme {
    const tokens = HodiTokens.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: tokens.surface,
      colorScheme: ColorScheme.dark(
        background: tokens.surface,
        surface: tokens.surfaceRaised,
        primary: tokens.brand,
        secondary: tokens.brand,
        error: tokens.pageUrgent,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: tokens.surface,
        foregroundColor: tokens.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: tokens.textPrimary,
        ),
      ),
      extensions: const [tokens],
    );
  }
}
