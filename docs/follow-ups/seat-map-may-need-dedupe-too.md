# 좌석 조회도 회차 조회처럼 중복 응답을 돌려줄 가능성이 있다

**Symptom**: 회차 조회(`searchSchByMov`)는 같은 회차를 가격 상품별로 중복 반환하는 것이 실제 CGV에서 확인되어 `bookmarklet/src/cgv/dedupe.ts`로 대응했다. 좌석 조회(`searchIfSeatData`)도 같은 성격의 응답 구조라 같은 문제를 겪을 가능성이 있다는 지적이 나왔다.

**Observed evidence**: 코드 리뷰(`code-review medium`, 2026-08-27, altitude 각도)에서 나온 지적. 다만 2026-08-27 실제 천안펜타포트 IMAX관 조회에서는 좌석 167석이 중복 없이 정확히 나왔고(`docs/decisions/cgv-data-source.md` 참고), 재현되지 않았다.

**Suspected cause**: 회차 목록은 가격 상품 단위로 나뉘어 중복되지만, 좌석 배치는 물리적 좌석 단위라 중복될 이유가 없어 보인다. 확인된 사실이 아니라 유추다.

**What was tried**: 고치지 않았다. 실측에서 재현되지 않아 근거가 없는 상태에서 코드를 바꾸지 않았다.

**Proposed next step**: 다른 상영관·회차에서 좌석 조회 응답에 같은 (row, number) 좌석이 두 번 나오는지 실측으로 확인한 뒤, 나온다면 `bookmarklet/src/cgv/api.ts`의 `fetchSeatMap`에도 (row, number) 기준 중복 제거를 추가한다.
