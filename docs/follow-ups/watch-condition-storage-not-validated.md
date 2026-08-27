# 저장소의 낡은 감시 조건이 패널을 깨뜨릴 수 있다

**Symptom**: `localStorage`에 이전 버전 형식이나 손상된 조건 데이터가 남아 있으면, 패널이 시작하자마자 렌더링에 실패할 수 있다.

**Observed evidence**: 코드 리뷰(`code-review medium`, 2026-08-27)에서 나온 지적. `bookmarklet/src/watch/storage.ts`의 `loadConditions`는 `Array.isArray(parsed)`만 확인하고 각 원소의 내부 구조(`regions` 배열 여부 등)는 검증하지 않는다. `main.ts`의 `toState()`가 곧바로 `condition.regions.map(...)`을 호출한다.

**Suspected cause**: 저장 형식이 앞으로 바뀌거나, 사용자가 개발자 도구로 값을 직접 편집하는 경우 이 경로를 탄다.

**What was tried**: 고치지 않았다. `AGENTS.md`의 검증·리뷰 예산이 스펙 밖 엣지케이스 방어를 범위 밖으로 명시하고 있어, 지금은 손대지 않았다.

**Proposed next step**: `loadConditions`에서 각 조건의 필수 필드(특히 `regions`가 배열인지)를 검사해, 형식에 안 맞는 항목은 조용히 걸러내고 나머지는 정상 로드한다.
