# Implementation Plan: Integration of Audio Management and Enhanced Transcription

This plan outlines the steps to integrate audio recording, local audio management, and on-demand enhanced transcription into the main application.

## Phase 1: Infrastructure and Initialization
Prepare the `MonologLiveApp` class to handle the new audio and transcription components.

- [x] Task: Initialize `LocalAudioManager` and `WebAudioRecorder` in `MonologLiveApp` constructor. [18cc0de]
- [x] Task: Initialize `WhisperTranscription` with default settings. [18cc0de]
- [x] Task: Ensure `LocalAudioManager` is properly linked to the existing `IndexedDBWrapper` instance. [18cc0de]
- [x] Task: Update `initialize()` method to verify `WebAudioRecorder` support and log capabilities. [18cc0de]
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Infrastructure and Initialization' (Protocol in workflow.md)

## Phase 2: Audio Recording Lifecycle
Synchronize the audio recording process with the session start/stop events.

- [x] Task: Update `startSession()` to trigger `audioRecorder.startRecording()` in parallel with voice manager. [a7a6272]
- [x] Task: Update `stopSession()` to be `async` and await `audioRecorder.stopRecording()`. [a7a6272]
- [x] Task: Implement automatic saving of the stopped recording via `audioManager.saveAudioFile()`. [a7a6272]
- [x] Task: Add error handling for microphone access and storage quota issues. [a7a6272]
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Audio Recording Lifecycle' (Protocol in workflow.md)

## Phase 3: UI for Enhanced Transcription
Add the necessary UI elements to trigger and monitor the Whisper transcription process.

- [x] Task: Add a "Run Enhanced Transcription" button to `index.html` (initially hidden).
- [x] Task: Implement `toggleEnhancedTranscriptionButton(show: boolean)` in `MonologLiveApp`.
- [x] Task: Show the button in `updateStatus()` or `updateUIState()` when a session ends and an audio file is available.
- [x] Task: Add a "Transcription in progress..." status indicator.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: UI for Enhanced Transcription' (Protocol in workflow.md)

## Phase 4: Enhanced Transcription Logic
Implement the logic to run the Whisper model and update the UI with results.

- [x] Task: Implement `runEnhancedTranscription()` method in `MonologLiveApp`.
- [x] Task: Logic: Load Whisper model on first request.
- [x] Task: Logic: Retrieve the last session's audio blob from `audioManager`.
- [x] Task: Logic: Execute `whisper.transcribeAudio()` and handle the `TranscriptionResult`.
- [x] Task: Logic: Clear the current `TranscriptionDisplay` and repopulate it with Whisper's segments.
- [x] Task: Integration Test: Verify the flow from session end to enhanced transcription display.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Enhanced Transcription Logic' (Protocol in workflow.md)
