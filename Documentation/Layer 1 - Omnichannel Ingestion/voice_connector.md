# 🎙️ Voice Connector Module

> **Layer:** 1 — Omnichannel Ingestion  
> **Protocol:** STT (Speech-to-Text) + Speaker Diarization  
> **Priority:** P1 (Phase 2)

---

## What It Does

Processes phone-based complaints by transcribing calls in real-time, identifying speakers, and extracting the complaint content from voice conversations.

---

## Responsibilities

1. **Call Integration**
   - Integrate with telephony systems (Twilio, Genesys, Amazon Connect, Cisco)
   - Receive call audio streams via WebSocket or post-call recordings via webhook
   - Support both real-time streaming transcription and batch processing of recordings

2. **Speech-to-Text (STT)**
   - Use Whisper (self-hosted) or Deepgram/Google Speech API for transcription
   - Support 20+ languages with automatic language detection
   - Handle accents, background noise, low-quality phone audio
   - Maintain word-level timestamps for alignment

3. **Speaker Diarization**
   - Separate customer voice from agent voice
   - Label transcript segments: `[CUSTOMER]`, `[AGENT]`, `[IVR_SYSTEM]`
   - Handle multi-party calls (customer + agent + supervisor)

4. **Complaint Extraction from Transcript**
   - Don't dump the whole transcript as the complaint — use NLP to extract:
     - The core complaint/issue
     - Customer requests and demands
     - Promises made by the agent
     - Emotional peaks (raised voice detection via audio features)
   - Generate a structured **call summary** alongside the raw transcript

5. **Tone & Emotion Analysis (Audio-Level)**
   - Beyond text sentiment — analyse audio features:
     - Speech rate (speaking faster = agitated)
     - Volume spikes (shouting)
     - Silence gaps (frustration pauses)
     - Crying / distress detection
   - Output an **emotion timeline** alongside the transcript

6. **Normalisation & Publishing**
   - Transform into Unified Complaint Envelope (UCE)
   - Include: channel=voice, transcript, call_summary, emotion_timeline, call_duration, call_recording_url
   - Publish to Kafka topic `complaints.ingested`

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| STT Engine | Whisper (primary) + Deepgram (streaming fallback) | Best accuracy; Deepgram for low-latency |
| Diarization | pyannote.audio | State-of-the-art open-source diarization |
| Emotion from audio | Custom model on LibriSpeech + proprietary data | Text sentiment misses tone cues |
| Telephony | Twilio Media Streams | Wide carrier support, WebSocket streaming |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Audio stream or recording from telephony system |
| **Output** | UCE with transcript + call summary + emotion timeline → Kafka |

---

## SLA & Performance

- Real-time transcription: < 2 second lag behind live audio
- Post-call batch processing: < 5 minutes per call
- Transcription accuracy target: > 92% WER (word error rate)
- Support concurrent streaming for 500+ simultaneous calls

---

## Dependencies

- Telephony platform (Twilio/Genesys/Amazon Connect)
- GPU infrastructure for Whisper inference
- Object storage for call recordings
- Kafka / Pulsar (Event Bus)
