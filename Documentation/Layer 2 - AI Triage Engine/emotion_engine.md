# 💔 Emotion Engine Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent  
> **Priority:** P0 (Core)

---

## What It Does

Goes beyond simple positive/negative sentiment. Analyses the **emotional arc** of the customer — how their feelings evolved across the conversation — and predicts emotional trajectory.

---

## Responsibilities

1. **Granular Sentiment Analysis**
   - Not just positive/negative/neutral. Classify into specific emotions:
     - 😡 **Angry** — hostile, aggressive language
     - 😤 **Frustrated** — "I've tried everything", "nobody is helping"
     - 😢 **Disappointed** — "I expected better", "as a loyal customer"
     - 😰 **Anxious** — "what happens to my money?", "is my data safe?"
     - 😐 **Neutral/Factual** — reporting an issue without emotion
     - ⚖️ **Threatening-Legal** — "my lawyer", "I'll sue", "report to authorities"
     - 📢 **Threatening-Public** — "going to post this everywhere", "will tell everyone"

2. **Tone Arc Analysis**
   - For multi-message conversations (chat, email threads), track how emotions evolve:
     - Message 1: Frustrated → Message 2: Angry → Message 3: Threatening
   - Visualise as an **emotion timeline** — feeds into the 360° dashboard
   - Detect **escalation patterns** — customer getting angrier = needs priority attention

3. **Empathy Calibration Score**
   - Output a 1–10 scale indicating how much empathy the response needs:
     - 2/10: Neutral factual complaint → factual response is fine
     - 8/10: Deeply frustrated long-term customer → response needs sincere empathy
     - 10/10: Distressed/crying (voice) → response needs care, possible callback offer
   - This score drives the Draft Response module's tone

4. **Cultural & Language Context**
   - Understand that expression of frustration varies by culture
   - British understatement: "I'm not entirely satisfied" = actually very angry
   - Direct cultures: "This is terrible" = frustrated but not necessarily hostile
   - Adjust sentiment scoring for cultural context based on detected language/region

5. **Voice Emotion Integration**
   - If the complaint came via Voice Connector, integrate audio-level emotion data:
     - Combine text sentiment with speech rate, volume, tone pitch analysis
     - Audio emotion is often more reliable than text for genuine distress detection

6. **Output Publishing**
   - Enrich the UCE with emotion data:
     - `primary_emotion`, `emotion_scores` (all dimensions), `empathy_calibration`, `tone_arc`, `risk_flags`
   - Publish to `complaints.classified` topic

---

## Model Architecture

```
Input: complaint text + conversation history + optional audio features
    ↓
[Emotion Classifier] → Fine-tuned LLM for emotion detection  
    ↓
[Tone Arc Tracker] → Sequence model tracking emotion across messages
    ↓
[Cultural Adjuster] → Language/region-aware calibration layer
    ↓
[Empathy Scorer] → Business rules + emotion → empathy calibration score
    ↓
Output: emotion profile + tone arc + empathy score + risk flags
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Emotion model | Fine-tuned Gemini Flash + GoEmotions dataset | 27 emotion categories, adaptable |
| Tone arc tracking | Sliding window over conversation history | Captures evolution, not just point-in-time |
| Cultural calibration | Region-specific few-shot examples | Hard to model culturally; few-shot is most flexible |
| Voice integration | Feature fusion (audio + text) | Multi-modal gives best accuracy |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | UCE (text + optional audio features) from Kafka |
| **Output** | Emotion-enriched UCE → Kafka topic `complaints.classified` |

---

## Metrics

- Emotion classification accuracy: > 85% (against human raters)
- Empathy calibration correlation with CSAT: > 0.7
- Tone arc prediction accuracy (will customer escalate?): > 78%
- Latency P95: < 300ms

---

## Dependencies

- LLM inference service
- Voice Connector (for audio features, optional)
- Customer profile service (for region/language context)
- Kafka consumer/producer
