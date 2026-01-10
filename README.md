# MONOLOG LIVE

A web service for casual voice conversations with AI-generated comment sections that simulate a live streaming experience.

## Project Structure

```
├── src/
│   ├── types/
│   │   └── core.ts                    # Core TypeScript type definitions
│   ├── interfaces/
│   │   ├── voice-input.ts             # Voice input interfaces
│   │   ├── audio-recording.ts         # Audio recording interfaces
│   │   ├── comment-generation.ts      # Comment generation interfaces
│   │   ├── learning.ts                # Learning and personalization interfaces
│   │   ├── session-management.ts      # Session management interfaces
│   │   ├── enhanced-transcription.ts  # Enhanced transcription interfaces
│   │   └── summary-generation.ts      # Summary generation interfaces
│   ├── storage/
│   │   └── indexeddb-wrapper.ts       # IndexedDB wrapper for client-side storage
│   └── main.ts                        # Main application entry point
├── tests/
│   ├── setup.ts                       # Test setup and mocks
│   ├── core-interfaces.test.ts        # Core interfaces tests
│   └── indexeddb-wrapper.test.ts      # IndexedDB wrapper tests
├── index.html                         # Main HTML file
├── package.json                       # Project dependencies and scripts
├── tsconfig.json                      # TypeScript configuration
├── vite.config.ts                     # Vite build configuration
└── jest.config.js                     # Jest testing configuration
```

## Features

- **Real-time Voice Input**: Continuous speech recognition using Web Speech API
- **Comment Section Simulation**: AI-generated comments with 8 distinct personality roles
- **Learning and Personalization**: Adaptive comment generation based on user preferences
- **Local Storage**: Client-side data persistence using IndexedDB
- **Audio Recording**: Local audio file storage for session playback
- **Enhanced Transcription**: Optional Whisper integration for improved accuracy
- **Session Summaries**: Automatic conversation analysis and insights

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

The project uses Jest with fast-check for property-based testing:

- **Unit Tests**: Specific examples and edge cases
- **Property Tests**: Universal properties across all inputs
- **Mocked APIs**: Web Speech API, MediaRecorder, IndexedDB

## Architecture

### Core Components

1. **Voice Input Manager**: Handles continuous speech recognition
2. **Comment Generator**: Hybrid rule-based and local LLM processing
3. **Learning Module**: Tracks user preferences and adapts behavior
4. **Session Manager**: Manages conversation lifecycle and data
5. **Audio Manager**: Records and stores audio files locally
6. **Storage Wrapper**: IndexedDB abstraction for client-side persistence

### Technology Stack

- **Frontend**: TypeScript, Vite
- **Storage**: IndexedDB (via idb library)
- **Testing**: Jest, fast-check
- **APIs**: Web Speech API, MediaRecorder API
- **AI Processing**: Local LLM integration (WebLLM)
- **Enhanced Features**: Local Whisper transcription (optional)

## Next Steps

This setup provides the foundation for implementing the MONOLOG LIVE features. The next tasks involve:

1. Implementing voice input and transcription
2. Building the comment generation system
3. Creating the learning and personalization module
4. Adding audio recording capabilities
5. Integrating local LLM processing
6. Building the user interface

See `tasks.md` in the `.kiro/specs/monolog-live/` directory for the complete implementation plan.