# Plan: Integration - Session & Topic Management

## Phase 1: Foundation & Dependency Injection
- [x] Task: Instantiate `SummaryGenerator` and its dependencies (`BasicTopicExtractor`, `BasicInsightGenerator`) in `main.ts`. [f70dfb8]
- [x] Task: Instantiate `SessionManagerImpl` and `TopicManager` in `MonologLiveApp`. [6030bc3]
- [ ] Task: Update `MonologLiveApp.initialize()` to ensure all managers are ready.

## Phase 2: Session Lifecycle Integration
- [ ] Task: Implement `startSession` using `SessionManager.startSession()`.
- [ ] Task: Implement `stopSession` using `SessionManager.endSession()`.
- [ ] Task: Update UI state to reflect session start/stop accurately.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Session Lifecycle Integration' (Protocol in workflow.md)

## Phase 3: Real-time Data Tracking
- [ ] Task: Update `voiceManager.onTranscript` to save transcript segments via `SessionManager.addTranscriptSegment()`.
- [ ] Task: Update `commentSystem.generateComment` flow to save generated comments via `SessionManager.addComment()`.
- [ ] Task: Integrate `TopicField` with `TopicManager` to handle topic updates and influence context.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Real-time Data Tracking' (Protocol in workflow.md)

## Phase 4: Post-Session Features & UI
- [ ] Task: Implement a "Session Summary" notification or display after `stopSession`.
- [ ] Task: Add "Enhance Transcription" button/option to the UI after session end.
- [ ] Task: Connect "Enhance Transcription" to `SummaryGenerator.enhanceTranscript()`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Post-Session Features & UI' (Protocol in workflow.md)
