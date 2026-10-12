enum PageKind { page, sos, test }

enum PageState {
  held,
  ringing,
  calling,
  acknowledged,
  missed,
  cancelled,
  expired
}

class HodiPage {
  final String id;
  final String fromId;
  final String fromName;
  final String? fromPhotoUrl;
  final String toId;
  final String reason;
  final PageKind kind;
  final int seq;
  final PageState state;
  final DateTime createdAt;
  final DateTime? heldUntil;
  final String? response; // 'on_my_way' | 'five_minutes' | 'busy'
  final DateTime? respondedAt;

  const HodiPage({
    required this.id,
    required this.fromId,
    required this.fromName,
    this.fromPhotoUrl,
    required this.toId,
    required this.reason,
    required this.kind,
    required this.seq,
    required this.state,
    required this.createdAt,
    this.heldUntil,
    this.response,
    this.respondedAt,
  });

  String get responseText {
    switch (response) {
      case 'on_my_way':
        return 'On my way';
      case 'five_minutes':
        return 'Give me 5';
      case 'busy':
        return "I'm tied up";
      default:
        return response ?? '';
    }
  }

  factory HodiPage.fromMap(String id, Map<String, dynamic> data) {
    PageKind kind;
    switch (data['kind']) {
      case 'sos':
        kind = PageKind.sos;
        break;
      case 'test':
        kind = PageKind.test;
        break;
      default:
        kind = PageKind.page;
    }

    PageState state;
    switch (data['state']) {
      case 'held':
        state = PageState.held;
        break;
      case 'calling':
        state = PageState.calling;
        break;
      case 'acknowledged':
        state = PageState.acknowledged;
        break;
      case 'missed':
        state = PageState.missed;
        break;
      case 'cancelled':
        state = PageState.cancelled;
        break;
      case 'expired':
        state = PageState.expired;
        break;
      default:
        state = PageState.ringing;
    }

    DateTime created = DateTime.now();
    if (data['createdAt'] != null) {
      created = (data['createdAt'] as dynamic).toDate();
    }

    DateTime? held;
    if (data['heldUntil'] != null) {
      held = (data['heldUntil'] as dynamic).toDate();
    }

    DateTime? respAt;
    if (data['respondedAt'] != null) {
      respAt = (data['respondedAt'] as dynamic).toDate();
    }

    return HodiPage(
      id: id,
      fromId: data['fromId'] ?? '',
      fromName: data['fromName'] ?? 'Colleague',
      fromPhotoUrl: data['fromPhotoUrl'],
      toId: data['toId'] ?? '',
      reason: data['reason'] ?? '',
      kind: kind,
      seq: data['seq'] ?? 0,
      state: state,
      createdAt: created,
      heldUntil: held,
      response: data['response'],
      respondedAt: respAt,
    );
  }
}
