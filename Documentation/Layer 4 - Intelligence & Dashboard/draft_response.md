# ✍️ Draft Response Module

> **Layer:** 4 — Gen-AI Intelligence & Dashboard  
> **Type:** Gen-AI Agent  
> **Priority:** P0 (Core)

---

## What It Does

Generates **emotionally intelligent, personalised draft responses** for agent review — not generic templates, but responses calibrated to the customer's emotion, history, and the specific issue.

---

## Responsibilities

1. **Tone-Matched Response Generation**
   - Use the Emotion Engine's empathy calibration score to set response tone:
     - **Empathy 2/10:** Professional, factual → "Here's what happened and the fix"
     - **Empathy 5/10:** Warm, understanding → "I understand this is frustrating. Let me help."
     - **Empathy 8/10:** Deeply empathetic → "I sincerely apologise. You've been incredibly patient, and I want to make this right."
     - **Empathy 10/10:** Personal care → "I can hear how upsetting this has been. I want you to know I'm personally handling this."

2. **Contextual Personalisation**
   - Auto-include relevant details:
     - Customer's name and relationship: "As a valued member for 3 years..."
     - Specific issue details: "regarding your order #12345 placed on March 15th..."
     - Resolution specifics: "I've processed a full refund of ₹2,450 to your card ending in 4521"
   - Reference past interactions: "I see you also contacted us about this on March 10th — I apologise for the delay"

3. **Multi-Channel Formatting**
   - Generate responses appropriate for the channel:
     - **Email:** Formal, detailed, with greeting and sign-off
     - **Social Media:** Concise, professional, moves to DM for details
     - **Chat:** Conversational, quick, action-oriented
     - **Regulatory:** Formal, includes all required disclosures and case references

4. **Agent Review Workflow**
   - AI generates draft → Agent reviews in dashboard
   - Agent can:
     - ✅ **Approve & Send** — send as-is
     - ✏️ **Edit & Send** — modify then send (edits become training data)
     - 🔄 **Regenerate** — ask AI to try again with different tone/approach
     - ❌ **Reject** — write from scratch (rare, logged for quality improvement)
   - Track approval rates: target > 70% approve-as-is

5. **Multi-Language Support**
   - Detect customer's language and generate response in same language
   - Support 20+ languages with native-quality output
   - Maintain brand voice consistency across languages

6. **Compliance Check (Pre-Send)**
   - Before presenting draft to agent, validate:
     - No promises that violate company policy
     - Required disclosures included (if regulatory flag)
     - No personally identifiable information of other customers
     - Language is inclusive and non-discriminatory

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| LLM for generation | Gemini 2.5 Pro / GPT-4o | Best quality for empathetic, nuanced writing |
| Personalisation context | RAG: customer history + resolution KB + complaint context | Grounded, specific responses |
| Tone control | System prompt engineering + few-shot examples per tone level | Precise emotional calibration |
| Quality measurement | Agent edit distance + CSAT correlation | Objective quality metrics |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | Enriched complaint (classified, scored, DNA-matched) + customer context + resolution recommendation |
| **Output** | Draft response → Agent review queue in Dashboard |

---

## Metrics

- Agent approve-as-is rate: > 70%
- Average edit distance (when edited): < 15% of text
- CSAT for AI-drafted responses: > 4.2/5
- Response generation latency: < 3 seconds
- Multi-language quality rating (human eval): > 4/5

---

## Dependencies

- LLM inference service
- Emotion Engine (empathy calibration)
- Resolution Graph (NBA + template context)
- 360° Record (conversation history)
- Customer profile service
- Regulatory module (compliance check)
