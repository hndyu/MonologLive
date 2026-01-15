# Specification: Security Vulnerability Remediation

## Overview
This track focuses on fixing five security and privacy vulnerabilities identified during the manual security audit. The goal is to eliminate Cross-Site Scripting (XSS) risks, prevent sensitive data leaks in logs, and mitigate prompt injection risks in AI interactions.

## Vulnerabilities to Address
1. **Stored XSS in Session Titles** (`src/ui/session-detail.ts`)
2. **Stored XSS in Transcript segments** (`src/ui/session-detail.ts`)
3. **XSS in API Key display** (`src/ui/preference-management.ts`)
4. **PII Leak in Logs** (`src/error-handling/error-handler.ts`)
5. **Prompt Injection Risk** (`src/summary/gemini-client.ts`)

## Functional Requirements
### XSS Remediation
- Replace `innerHTML` usage with `textContent` or `innerText` for displaying user-controlled data (Session titles, Transcript text, API keys).
- In `src/ui/session-detail.ts`, update the title rendering and transcript segment rendering to use safe DOM APIs.
- In `src/ui/preference-management.ts`, update the API key input and display logic to avoid template literal injection into `innerHTML`.

### Privacy & Logging
- In `src/error-handling/error-handler.ts`, implement a masking mechanism or a "safe-fields-only" logging approach to ensure `originalError` and `context` do not leak transcripts or API keys to the console.

### LLM Safety
- In `src/summary/gemini-client.ts`, update the prompt construction to use clear delimiters (e.g., `"""`) to isolate the `${transcript}` section, helping the model distinguish between instructions and data.

## Acceptance Criteria
- [ ] No more `innerHTML` calls that inject unvalidated user data in the target files.
- [ ] Session titles and transcript segments containing HTML tags (e.g., `<script>`) are rendered as plain text.
- [ ] Error logs in the console do not contain raw transcripts or API keys.
- [ ] AI summaries are still generated correctly with the new prompt structure.
- [ ] All existing tests pass.

## Out of Scope
- Full migration of the entire codebase away from `innerHTML` (only targeting identified vulnerable files).
- Implementation of a full-scale PII detection library.
