# Requirements Document

## Introduction

MONOLOG LIVE is a web service that enables users to engage in casual voice conversations with an AI system that simulates a "live stream comment section." Users speak naturally about their thoughts, daily life, or any topic, while the AI responds with various comment roles to create a lively, engaging atmosphere. The system prioritizes natural conversation flow over structured dialogue, with AI-generated summaries provided only at session end.

## Glossary

- **System**: The MONOLOG LIVE web application
- **User**: The person speaking and interacting with the service
- **Comment_Section**: The AI-generated comments that simulate viewer responses
- **Session**: A single conversation period from start to end
- **Comment_Role**: Different personality types the AI uses to generate varied comments
- **Topic_Field**: User input area for session topics
- **Voice_Input**: Real-time speech recognition and processing
- **Summary_Generator**: AI component that creates session summaries

## Requirements

### Requirement 1: Real-time Voice Input

**User Story:** As a user, I want to speak naturally and have my voice converted to text in real-time, so that I can engage in fluid conversation without typing.

#### Acceptance Criteria

1. WHEN a user starts speaking, THE Voice_Input SHALL capture audio continuously using Web Speech API
2. WHEN audio is captured, THE System SHALL display real-time transcription without external STT services
3. WHEN transcription accuracy is imperfect, THE System SHALL still maintain conversation flow
4. WHEN users prefer external voice input, THE System SHALL accept input from OS-standard voice recognition
5. THE Voice_Input SHALL remain active throughout the entire session

### Requirement 2: Comment Section Simulation

**User Story:** As a user, I want to receive varied, natural-feeling comments during my speech, so that I feel like I'm having a conversation with an engaged audience.

#### Acceptance Criteria

1. THE Comment_Section SHALL generate comments using multiple distinct Comment_Role personalities
2. WHEN generating comments, THE System SHALL avoid maintaining a single consistent AI personality
3. THE Comment_Section SHALL produce comments that simulate a lively viewer community
4. WHEN comment generation occurs, THE System SHALL use a combination of rule-based methods and local LLM processing during sessions
5. THE System SHALL avoid cloud-based LLM API calls during active sessions for cost efficiency
6. THE System SHALL prioritize natural conversation flow while maintaining comment quality through local AI processing

### Requirement 3: Comment Role Implementation

**User Story:** As a user, I want to receive diverse types of comments that feel authentic, so that the conversation remains engaging and natural.

#### Acceptance Criteria

1. THE System SHALL implement greeting/entry comments including "こんばんは！", "おはよう～", "初見です"
2. THE System SHALL implement departure comments including "そろそろ寝ます", "おやすみ〜", "お疲れ様"
3. THE System SHALL implement reaction comments including "かわいい", "草", "ｗｗｗ", "天才"
4. THE System SHALL implement agreement comments including "たしかに", "それな", "わかる"
5. THE System SHALL implement question comments including "今日何してた？", "最近ハマってるものある？"
6. THE System SHALL implement insider/regular viewer comments including "いつもの", "出たｗ", "安定だな"
7. THE System SHALL implement supportive comments including "無理しないでね", "応援してます"
8. THE System SHALL implement playful/teasing comments including "今の伏線？", "台本ですか？"

### Requirement 4: Comment Volume Control

**User Story:** As a user, I want comment frequency to match my energy and engagement level, so that the conversation feels natural and responsive.

#### Acceptance Criteria

1. WHEN user speech volume increases, THE System SHALL increase comment frequency
2. WHEN user speech rate increases, THE System SHALL generate more reactive comments
3. WHEN silence periods occur, THE System SHALL reduce comment generation appropriately
4. WHEN user shows emotional engagement, THE System SHALL increase supportive comment frequency
5. THE System SHALL maintain a baseline level of activity to prevent perceived emptiness

### Requirement 5: Session Topic Management

**User Story:** As a user, I want to optionally set conversation topics and receive initial prompts, so that I can easily start conversations.

#### Acceptance Criteria

1. WHEN a session begins, THE System SHALL provide a Topic_Field for optional user input
2. WHEN a session starts, THE Comment_Section SHALL generate conversation starter comments
3. THE System SHALL include starter examples like "もうご飯食べた？", "最近ハマってるものある？", "今期どのアニメ見てる？"
4. WHEN no topic is specified, THE System SHALL still generate appropriate conversation starters
5. THE Topic_Field SHALL accept user input without requiring completion

### Requirement 6: Comment Interaction Tracking

**User Story:** As a user, I want my responses to comments to be recognized, so that the system can learn my preferences and improve over time.

#### Acceptance Criteria

1. WHEN a comment appears and user speaks immediately after, THE System SHALL detect potential comment pickup
2. WHEN comment content matches subsequent user speech vocabulary, THE System SHALL increase pickup probability
3. WHEN users click on comments, THE System SHALL mark them as definitively picked up
4. THE System SHALL provide thumbs up/down UI elements for explicit comment feedback
5. WHEN positive feedback is given, THE System SHALL increase similar comment frequency
6. WHEN negative feedback is given, THE System SHALL decrease similar comment frequency

### Requirement 7: Learning and Personalization

**User Story:** As a user, I want the comment system to adapt to my preferences over time, so that conversations become more personally engaging.

#### Acceptance Criteria

1. THE System SHALL track which Comment_Role types receive positive user responses
2. WHEN Comment_Role types are frequently picked up, THE System SHALL increase their appearance rate
3. WHEN Comment_Role types are consistently ignored, THE System SHALL decrease their appearance rate
4. THE System SHALL implement learning through role frequency weighting rather than LLM retraining
5. THE System SHALL maintain user preference data across sessions
6. THE System SHALL detects topic changes and suggests changes to the Topic_Field.

### Requirement 8: Session Summary Generation

**User Story:** As a user, I want automatic summaries of my conversations after sessions end, so that I can reflect on my thoughts and gain insights.

#### Acceptance Criteria

1. WHEN a session ends, THE Summary_Generator SHALL create an overall conversation summary
2. WHEN generating summaries, THE System SHALL organize content by topics discussed
3. THE Summary_Generator SHALL use high-quality processing for session-end analysis
4. WHEN available as optional feature, THE System SHALL use local Whisper-based transcription for enhanced summary accuracy
5. THE System SHALL generate summaries automatically without user input requirements

### Requirement 9: Cost-Effective Architecture

**User Story:** As a service provider, I want to minimize operational costs while maintaining quality, so that the service can remain free for basic usage.

#### Acceptance Criteria

1. THE System SHALL avoid continuous cloud-based API calls during active sessions
2. WHEN generating real-time comments, THE System SHALL use rule-based processing combined with local LLM processing
3. THE System SHALL limit cloud-based LLM usage to avoid operational costs during sessions
4. THE System SHALL use Web Speech API instead of external STT services
5. THE System SHALL implement efficient resource usage patterns throughout

### Requirement 10: User Interface Design

**User Story:** As a user, I want a clean, focused interface that supports natural conversation, so that I can speak comfortably without distractions.

#### Acceptance Criteria

1. THE System SHALL display real-time speech transcription prominently
2. THE System SHALL present comments in a streaming chat-like interface
3. THE System SHALL maintain voice input availability at all times during sessions
4. THE System SHALL avoid avatar or VTuber-style visual representations
5. WHEN displaying the interface, THE System SHALL prioritize conversation elements over decorative features

### Requirement 11: Audio Recording and Storage

**User Story:** As a user, I want my voice conversations to be saved locally, so that I can review them later or use them for personal reference.

#### Acceptance Criteria

1. THE System SHALL record user audio during active sessions
2. WHEN recording audio, THE System SHALL store files locally on the user's device
3. THE System SHALL provide options for audio file format and quality settings
4. WHEN sessions end, THE System SHALL maintain audio files for user access
5. THE System SHALL allow users to manage and delete their stored audio files

### Requirement 12: Enhanced Transcription (Optional Feature)

**User Story:** As a user, I want higher quality transcription for my session summaries, so that I can get more accurate reflections of my conversations.

#### Acceptance Criteria

1. WHEN available, THE System SHALL offer local Whisper-based transcription as an optional feature
2. THE Enhanced_Transcription SHALL process recorded audio files locally without cloud services
3. WHEN enhanced transcription is enabled, THE System SHALL use it for session summary generation
4. THE System SHALL clearly indicate when enhanced transcription is available and active
5. THE Enhanced_Transcription SHALL not be required for basic system functionality