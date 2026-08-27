# 날짜·시간을 비운 채 조건을 등록할 수 있다

**Symptom**: 조건 등록 폼에서 영화·지점·좌석 구역은 비어 있으면 막지만, 날짜·시작·끝 시각은 검증하지 않는다.

**Observed evidence**: 코드 리뷰(`code-review medium`, 2026-08-27)에서 나온 지적. `bookmarklet/src/main.ts`의 `buildCondition`이 `draft.date`/`fromTime`/`toTime`을 비어 있어도 그대로 저장한다. `toTime`이 빈 문자열이면 `schedule.startTime <= ""`가 항상 거짓이 되어 회차가 전부 걸러지고, 조건은 "회차 0개 확인"으로만 보여 원인을 알 수 없다.

**Suspected cause**: `<input type="date/time">`을 사용자가 브라우저 기본 지우기 동작으로 비울 수 있다.

**What was tried**: 고치지 않았다. 엣지케이스 방어는 `AGENTS.md` 예산 밖이다.

**Proposed next step**: `buildCondition`에서 `date`/`fromTime`/`toTime`이 비어 있으면 다른 필드처럼 에러로 막는다.
