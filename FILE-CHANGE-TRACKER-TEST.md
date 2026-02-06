# File Change Tracker 테스트 가이드

## 🎯 구현 내용

### FileChangeTracker 클래스
- ✅ FileSystemWatcher로 모든 파일 변경 실시간 감시
- ✅ 타임스탬프와 함께 변경 기록 (30초간 메모리 유지)
- ✅ AI active window 플래그 (±5초)
- ✅ 제외 패턴 필터링 (node_modules, .git, dist 등)
- ✅ 5초마다 자동 메모리 정리

### AIResponseDetector 통합
- ✅ FileChangeTracker 주입
- ✅ AI 응답 감지 시 타임윈도우 매칭 (±5초)
- ✅ 변경된 파일 목록 추출 및 로깅
- ✅ 통계 정보 출력

## 📝 테스트 시나리오

### 시나리오 1: Extension 활성화 및 FileChangeTracker 초기화

**단계:**
1. F5 키를 눌러 Extension Development Host 실행
2. Debug Console 확인

**예상 결과:**
```
[Phase 1] Step 1: Registering Hover Provider...
[Phase 1] ✅ Hover Provider registered
[Phase 1] Step 2: Starting File Change Tracker...
[FileChangeTracker] Starting file change tracking...
[FileChangeTracker] ✅ File watcher started successfully
[Phase 1] ✅ File Change Tracker started
[Phase 1] Step 3: Starting AI Response Detector...
[AIResponseDetector] Starting polling (5s interval)...
[Phase 1] ✅ AI Response Detector started (5s polling)
[Phase 1] ========================================
[Phase 1] AI Context Tracker 활성화 완료
[Phase 1] - Hover Provider: 활성
[Phase 1] - File Change Tracker: 활성 (30s 메모리)
[Phase 1] - AI Response Detector: 활성 (5s 간격)
[Phase 1] - DB File Watcher: 활성 (500ms debounce)
[Phase 1] ========================================
```

**확인:**
- [ ] Extension이 오류 없이 활성화됨
- [ ] FileChangeTracker가 성공적으로 시작됨
- [ ] 정보 메시지 팝업 표시

---

### 시나리오 2: 파일 변경 감지 테스트

**단계:**
1. Extension Development Host에서 테스트 프로젝트 폴더 열기
2. 새 파일 생성: `test-file.ts`
3. 파일 수정: `test-file.ts`에 코드 작성
4. 파일 삭제: `test-file.ts` 삭제
5. Debug Console 확인

**예상 결과:**
```
[FileChangeTracker] Recorded create: test-file.ts at 2026-02-06T06:45:23.456Z
[FileChangeTracker] Recorded change: test-file.ts at 2026-02-06T06:45:25.123Z
[FileChangeTracker] Recorded change: test-file.ts at 2026-02-06T06:45:27.789Z
[FileChangeTracker] Recorded delete: test-file.ts at 2026-02-06T06:45:30.456Z
```

**확인:**
- [ ] 파일 생성 감지 성공
- [ ] 파일 변경 감지 성공 (여러 번)
- [ ] 파일 삭제 감지 성공
- [ ] 타임스탬프 정확히 기록

---

### 시나리오 3: 제외 패턴 테스트

**단계:**
1. `node_modules/` 폴더의 파일 수정
2. `.git/` 폴더의 파일 수정 (있다면)
3. `package-lock.json` 수정
4. Debug Console 확인

**예상 결과:**
```
(아무 로그도 출력되지 않음)
```

**확인:**
- [ ] node_modules 파일 변경 무시
- [ ] .git 파일 변경 무시
- [ ] lock 파일 변경 무시
- [ ] 불필요한 로그 없음

---

### 시나리오 4: AI 응답 감지 및 파일 매칭

**단계:**
1. Extension Development Host의 **개발창(메인 창)**에서:
   - 새 파일 생성: `ai-test.ts`
   - 간단한 코드 작성:
     ```typescript
     function hello() {
       console.log("test");
     }
     ```
2. Cursor에게 질문: "이 코드를 리팩토링해줘" (또는 다른 AI 요청)
3. AI가 응답하고 파일이 수정될 때까지 대기
4. Debug Console 확인

**예상 결과:**
```
[CursorDB] 검색 중: 68개 composer의 모든 AI bubble 확인...
[CursorDB] 전체 AI bubble 발견: XXX개
[CursorDB] 🔍 최신 AI bubble Top 5:
  1. xxxxxxxx... - 2026-02-06T06:50:15.123Z - "좋습니다, 코드를 리팩토링..."
  
[AIResponseDetector] ✅ New AI response detected: xxxxxxxx...
[AIResponseDetector] Processing AI bubble...
  - Bubble ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  - Composer ID: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
  - Created: 2026-02-06T06:50:15.123Z
  - Text (first 100 chars): 좋습니다, 코드를 리팩토링하겠습니다...
  - User prompt (first 100 chars): 이 코드를 리팩토링해줘...

[FileChangeTracker] AI active window set: 2026-02-06T06:50:10.123Z ~ 2026-02-06T06:50:20.123Z
[FileChangeTracker] 🔍 Searching for changes in window:
  - Response time: 2026-02-06T06:50:15.123Z
  - Window: 2026-02-06T06:50:10.123Z ~ 2026-02-06T06:50:20.123Z
  ✅ Match: ai-test.ts at 2026-02-06T06:50:16.456Z (change)

[FileChangeTracker] Found 1 changed files in window

[AIResponseDetector] 📁 Changed files during AI response:
  1. ai-test.ts
     Full path: C:\Users\...\ai-test.ts

[AIResponseDetector] 📊 Tracker stats:
  - Total tracked files: X
  - Total changes: Y
  - Oldest change: 2026-02-06T06:45:23.456Z
```

**확인:**
- [ ] AI 응답 정상 감지
- [ ] AI active window 설정 성공
- [ ] 타임윈도우 매칭 성공 (±5초)
- [ ] 변경된 파일 정확히 추출
- [ ] 파일 경로 정확히 표시
- [ ] 통계 정보 정확
- [ ] 정보 메시지 팝업: "AI response detected! 1 file(s) changed"

---

### 시나리오 5: 여러 파일 동시 변경

**단계:**
1. 3개 파일 생성: `file1.ts`, `file2.ts`, `file3.ts`
2. Cursor에게 질문: "이 3개 파일을 모두 수정해줘"
3. AI가 응답하고 파일들이 수정될 때까지 대기
4. Debug Console 확인

**예상 결과:**
```
[AIResponseDetector] 📁 Changed files during AI response:
  1. file1.ts
     Full path: C:\Users\...\file1.ts
  2. file2.ts
     Full path: C:\Users\...\file2.ts
  3. file3.ts
     Full path: C:\Users\...\file3.ts

[AIResponseDetector] 📊 Tracker stats:
  - Total tracked files: X
  - Total changes: Y
  - Oldest change: ...
```

**확인:**
- [ ] 여러 파일 모두 감지
- [ ] 파일 목록 정확
- [ ] 중복 없음

---

### 시나리오 6: 메모리 자동 정리 (30초)

**단계:**
1. 파일 수정: `cleanup-test.ts`
2. 35초 대기
3. Debug Console 확인

**예상 결과:**
```
[FileChangeTracker] Recorded change: cleanup-test.ts at 2026-02-06T06:55:00.000Z
... (30초 후) ...
[FileChangeTracker] Cleaned up 1 old file entries
```

**확인:**
- [ ] 30초 후 자동 정리 실행
- [ ] 오래된 변경 기록 제거
- [ ] 메모리 누수 없음

---

### 시나리오 7: AI 응답 없이 파일만 변경

**단계:**
1. 사용자가 직접 파일 수정
2. AI 응답 없이 5초 이상 대기
3. Debug Console 확인

**예상 결과:**
```
[FileChangeTracker] Recorded change: manual-edit.ts at 2026-02-06T06:58:00.000Z
[AIResponseDetector] No new AI responses (already processed)
```

**확인:**
- [ ] 파일 변경 감지는 정상 작동
- [ ] AI 응답 없으므로 파일 매칭 안 함
- [ ] 불필요한 처리 없음

---

### 시나리오 8: 타임윈도우 밖의 변경 (음성 케이스)

**단계:**
1. 파일 수정: `old-change.ts`
2. 10초 대기 (±5초 윈도우 밖)
3. Cursor에게 **다른** 질문
4. Debug Console 확인

**예상 결과:**
```
[FileChangeTracker] Recorded change: old-change.ts at 2026-02-06T07:00:00.000Z
... (10초 후) ...
[AIResponseDetector] ✅ New AI response detected: ...
[FileChangeTracker] 🔍 Searching for changes in window:
  - Response time: 2026-02-06T07:00:10.000Z
  - Window: 2026-02-06T07:00:05.000Z ~ 2026-02-06T07:00:15.000Z

[FileChangeTracker] Found 0 changed files in window

[AIResponseDetector] 📁 Changed files during AI response:
  (No files changed in ±5s window)
```

**확인:**
- [ ] 오래된 변경은 매칭되지 않음
- [ ] 타임윈도우 로직 정확
- [ ] False positive 없음

---

## 📊 성능 측정

### 파일 감지 속도
- 파일 변경 → 로그 출력: ___ms

### 타임윈도우 매칭 성능
- AI 응답 → 파일 매칭 완료: ___ms
- 검색한 파일 수: ___개

### 메모리 사용량
- 초기: ___MB
- 파일 100개 변경 후: ___MB
- 30초 정리 후: ___MB

## ✅ 체크리스트

### 기능
- [ ] FileSystemWatcher 작동
- [ ] 파일 생성 감지
- [ ] 파일 변경 감지
- [ ] 파일 삭제 감지
- [ ] 제외 패턴 필터링 작동
- [ ] 타임윈도우 매칭 (±5초)
- [ ] AI active window 설정
- [ ] 30초 자동 메모리 정리
- [ ] 통계 정보 정확

### AIResponseDetector 통합
- [ ] FileChangeTracker 주입 성공
- [ ] AI 응답 감지 시 파일 매칭
- [ ] 변경된 파일 목록 출력
- [ ] 통계 정보 출력

### 안정성
- [ ] 오류 없이 작동
- [ ] 메모리 누수 없음
- [ ] 성능 저하 없음
- [ ] 로그 명확

## 🐛 발견된 이슈

| 이슈 | 설명 | 심각도 | 상태 |
|------|------|--------|------|
|      |      |        |      |

## 📝 개선 사항

| 항목 | 설명 | 우선순위 |
|------|------|----------|
|      |      |          |

## 🎯 다음 단계

검증 완료 후:
1. ✅ File Change Tracker 완료
2. ⏭️ Git Tracker (GitAITracker) 구현
3. ⏭️ Diff Parser 구현
4. ⏭️ Metadata Store 구현

---

**테스트 일시:** ___________  
**테스트 환경:** VS Code Extension Development Host  
**테스트 결과:** ✅ 성공 / ❌ 실패
