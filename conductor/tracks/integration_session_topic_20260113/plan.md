# Plan: Integration - Session & Topic Management

## Phase 1: Foundation & Dependency Injection
- [x] Task: Instantiate `SummaryGenerator` and its dependencies (`BasicTopicExtractor`, `BasicInsightGenerator`) in `main.ts`. [f70dfb8]
- [x] Task: Instantiate `SessionManagerImpl` and `TopicManager` in `MonologLiveApp`. [6030bc3]
- [x] Task: Update `MonologLiveApp.initialize()` to ensure all managers are ready. [1367884]

## Phase 2: Session Lifecycle Integration
- [x] Task: Implement `startSession` using `SessionManager.startSession()`. [0a196a9]
- [x] Task: Implement `stopSession` using `SessionManager.endSession()`. [6a3c18d]
- [x] Task: Update UI state to reflect session start/stop accurately. [e2220ba]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Session Lifecycle Integration' (Protocol in workflow.md)

## Phase 3: Real-time Data Tracking
- [x] Task: Update `voiceManager.onTranscript` to save transcript segments via `SessionManager.addTranscriptSegment()`. [c182593]
- [x] Task: Update `commentSystem.generateComment` flow to save generated comments via `SessionManager.addComment()`. [d8007d0]
- [ ] Task: Integrate `TopicField` with `TopicManager` to handle topic updates and influence context.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Real-time Data Tracking' (Protocol in workflow.md)

## Phase 4: Post-Session Features & UI
- [ ] Task: Implement a "Session Summary" notification or display after `stopSession`.
- [ ] Task: Add "Enhance Transcription" button/option to the UI after session end.
- [ ] Task: Connect "Enhance Transcription" to `SummaryGenerator.enhanceTranscript()`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Post-Session Features & UI' (Protocol in workflow.md)
