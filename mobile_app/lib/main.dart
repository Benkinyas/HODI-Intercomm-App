import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/theme/theme.dart';
import 'models/person.dart';
import 'models/status.dart';
import 'models/page.dart';
import 'features/directory/directory_screen.dart';
import 'features/send/reason_sheet.dart';
import 'features/send/sent_screen.dart';
import 'features/incoming/incoming_page_screen.dart';
import 'features/sos/sos_compose_screen.dart';
import 'features/status/status_picker_sheet.dart';
import 'features/reachability/check_reachability_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: HodiApp()));
}

class HodiApp extends StatelessWidget {
  const HodiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hodi',
      debugShowCheckedModeBanner: false,
      theme: HodiTheme.lightTheme,
      darkTheme: HodiTheme.darkTheme,
      home: const MainHodiFlow(),
    );
  }
}

class MainHodiFlow extends StatefulWidget {
  const MainHodiFlow({super.key});

  @override
  State<MainHodiFlow> createState() => _MainHodiFlowState();
}

class _MainHodiFlowState extends State<MainHodiFlow> {
  UserStatus _ownStatus = const UserStatus(type: UserStatusType.available);
  HodiPage? _activeSentPage;
  HodiPage? _incomingPage;

  final List<Person> _people = [
    Person(
      id: 'p1',
      name: 'Amina Wanjiru',
      role: 'Finance Manager',
      active: true,
      status: const UserStatus(type: UserStatusType.available),
    ),
    Person(
      id: 'p2',
      name: 'David Otieno',
      role: 'Head of Operations',
      active: true,
      status: UserStatus(
        type: UserStatusType.meeting,
        expiresAt: DateTime.now().add(const Duration(minutes: 45)),
      ),
    ),
    Person(
      id: 'p3',
      name: 'Grace Kiprop',
      role: 'Senior Nurse',
      active: true,
      status: const UserStatus(type: UserStatusType.available),
    ),
    Person(
      id: 'p4',
      name: 'Brian Mutua',
      role: 'IT Specialist',
      active: true,
      status: const UserStatus(type: UserStatusType.available),
      lastVerifiedAt: DateTime.now().subtract(const Duration(days: 40)), // Overdue
    ),
  ];

  void _openReasonSheet(Person recipient) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ReasonSheet(
        recipient: recipient,
        onSendPage: (reason) {
          Navigator.pop(ctx);
          _sendPage(recipient, reason, PageKind.page);
        },
        onSendSos: () {
          Navigator.pop(ctx);
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (c) => SosComposeScreen(
                recipient: recipient,
                onConfirmSos: (reason) {
                  Navigator.pop(c);
                  _sendPage(recipient, reason, PageKind.sos);
                },
              ),
            ),
          );
        },
      ),
    );
  }

  void _sendPage(Person recipient, String reason, PageKind kind) {
    final newPage = HodiPage(
      id: 'page_${DateTime.now().millisecondsSinceEpoch}',
      fromId: 'me',
      fromName: 'You',
      toId: recipient.id,
      reason: reason,
      kind: kind,
      seq: 101,
      state: recipient.status.isBusy && kind != PageKind.sos
          ? PageState.held
          : PageState.ringing,
      createdAt: DateTime.now(),
    );

    setState(() {
      _activeSentPage = newPage;
    });

    // Simulate server transitions (Layer 1 -> Layer 2 -> Acknowledgement test)
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted && _activeSentPage?.id == newPage.id && _activeSentPage?.state == PageState.ringing) {
        setState(() {
          _activeSentPage = HodiPage(
            id: newPage.id,
            fromId: newPage.fromId,
            fromName: newPage.fromName,
            toId: newPage.toId,
            reason: newPage.reason,
            kind: newPage.kind,
            seq: newPage.seq,
            state: PageState.calling,
            createdAt: newPage.createdAt,
          );
        });
      }
    });
  }

  void _openStatusPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatusPickerSheet(
        currentStatus: _ownStatus,
        onSelectStatus: (type, durationMinutes) {
          setState(() {
            _ownStatus = UserStatus(
              type: type,
              expiresAt: durationMinutes > 0
                  ? DateTime.now().add(Duration(minutes: durationMinutes))
                  : null,
            );
          });
        },
      ),
    );
  }

  void _openReachabilityCheck() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (c) => CheckReachabilityScreen(
          onSendTestPage: () async {
            await Future.delayed(const Duration(seconds: 2));
          },
          onPass: () {
            Navigator.pop(c);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Reachability verified! Next check in 30 days.')),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_incomingPage != null) {
      return IncomingPageScreen(
        page: _incomingPage!,
        onReply: (resp) {
          setState(() {
            _incomingPage = null;
          });
        },
      );
    }

    if (_activeSentPage != null) {
      return SentScreen(
        page: _activeSentPage!,
        onWithdraw: () {
          setState(() {
            _activeSentPage = null;
          });
        },
        onDone: () {
          setState(() {
            _activeSentPage = null;
          });
        },
      );
    }

    return DirectoryScreen(
      ownStatus: _ownStatus,
      people: _people,
      onSelectPerson: _openReasonSheet,
      onTapOwnStatus: _openStatusPicker,
      onTapReachabilityCheck: _openReachabilityCheck,
      onTapSosLog: () {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Organization SOS Audit Log'),
            content: const Text('No emergency SOS pages raised in the last 30 days.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
            ],
          ),
        );
      },
    );
  }
}
