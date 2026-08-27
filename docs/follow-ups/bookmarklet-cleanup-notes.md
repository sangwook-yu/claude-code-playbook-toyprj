# 북마클릿 코드의 중복·비효율 정리 항목

**Symptom**: 코드 리뷰에서 정확성 결함은 아니지만 정리하면 좋을 항목 여럿이 나왔다.

**Observed evidence**: 코드 리뷰(`code-review medium`, 2026-08-27, 재사용·단순화·효율 각도)에서 나온 지적들을 모았다.
- `hhmm()` 시각 포맷 함수가 `main.ts`와 `alarm/notify.ts`에 그대로 중복 구현되어 있다.
- 알람 제목·본문 조립 로직이 `main.ts`의 `toState()`와 `alarm/notify.ts`의 `describe()`에 각각 따로 있고, `describe()`는 실제로 `main.ts`에서 쓰이지 않는다.
- `panel/panel.ts`에 "작은 버튼 만들고 클릭 핸들러 붙이기" 두 줄짜리 패턴이 여섯 곳에서 반복된다.
- `main.ts`가 조건마다 독립적으로 회차·좌석을 조회해, 같은 지점·영화·날짜를 다른 구역으로 감시하는 조건 두 개를 등록하면 완전히 같은 데이터를 중복 조회한다.
- 확인 한 번에 패널이 여러 번(조건별 checking→ok/failed 단계마다) 통째로 다시 그려진다.

**Suspected cause**: 없음 — 코드 구조상 자연스럽게 생긴 중복과 비효율이다.

**What was tried**: 고치지 않았다. 스펙의 수용 기준이나 주 경로를 깨지 않는 정리 항목이라 `AGENTS.md` 예산에 따라 미룬다.

**Proposed next step**: 시간이 날 때 `hhmm`을 한 곳(예: `alarm/notify.ts`)에서만 정의해 `main.ts`가 가져다 쓰게 하고, 알람 문구 조립도 `describe()` 하나로 합친다. 패널의 작은 버튼 생성은 헬퍼 함수로 뽑는다. 조건 간 중복 조회는 감시 주기를 실측하며 정할 때 함께 본다.
