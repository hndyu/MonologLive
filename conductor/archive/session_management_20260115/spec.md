# Track Specification: Session Management & History UI

## Overview
Implement a comprehensive session management system and user interface that allows users to browse, manage, and playback past voice interaction sessions. This includes a modal-based history view, synchronized audio-transcript playback, and various session organization tools.

## User Persona
- **Users** who want to review their past thoughts and conversations to better understand their own values or practice their speaking skills.
- **Content Creators** who need to manage and export their recorded sessions for further use as a "Second Brain."

## Functional Requirements

### 1. Session History Interface (Modal)
- Provide a modal/overlay accessible from the main dashboard to view all past sessions.
- List sessions with clear identifiers: Title (Editable), Date, and Duration.
- Implement **Filter/Search** functionality to find sessions by date or keywords within the transcript/notes.
- Allow users to **Favorite/Star** sessions for quick access.

### 2. Session Management Actions
- **Delete:** Permanently remove a session and its associated IndexedDB data (audio/transcript).
- **Rename:** Allow users to edit the session title.
- **Favorite:** Toggle a "star" status for sessions.
- **Export:**
    - Export as **Markdown (.md)**: Including transcript, summary, and topics.
    - Export **Audio File**: Direct download of the recorded audio (.webm).

### 3. Session Detail View & Playback
- Display the full **Transcript** of the selected session.
- Integrate a **Synchronized Audio Player**:
    - Highlight the corresponding transcript text during playback.
    - Clicking a transcript segment seeks the audio to that timestamp.
- Display the **Session Summary** (AI-generated) and **Topic/Keywords** identified during the session.

## Non-Functional Requirements
- **Performance:** Ensure smooth scrolling and fast filtering, even with a large number of sessions.
- **Responsive Design:** The modal and playback interface must work well on mobile devices (touch targets, readable text).
- **Data Integrity:** Ensure that deleting a session correctly cleans up all related entries in IndexedDB to prevent storage leaks.

## Acceptance Criteria
- Users can open the History modal and see a list of their past sessions.
- Clicking a session opens a detail view with the transcript and summary.
- Audio playback correctly highlights transcript segments and allows seeking by clicking text.
- Searching and filtering correctly update the session list.
- Deleting, renaming, and favoriting functions update the UI and persistent storage immediately.
- Exporting produces the correct file formats (MD and Audio).

## Out of Scope
- Direct editing of the transcript text within the history view.
- Multi-session comparison tools.
- Social sharing of sessions directly from the app.
