# 🏷️ NLP Classifier Module

> **Layer:** 2 — AI Triage Engine (Multi-Agent)  
> **Type:** AI Agent  
> **Priority:** P0 (Core)

---

## What It Does

The first AI agent to touch every complaint. Performs **multi-dimensional classification** in a single inference pass — categorising by type, product, intent, and urgency.

---

## Responsibilities

1. **Multi-Label Classification (Single Pass)**
   - For every incoming UCE from the event bus, classify across all dimensions simultaneously:
   
   | Dimension | Categories (Examples) |
   |-----------|----------------------|
   | **Complaint Type** | Billing, Service Quality, Product Defect, Delivery, Privacy/Data, Fraud, Account Access, Policy Dispute |
   | **Product/Service** | Mapped to internal product taxonomy (auto-updated from product catalog) |
   | **Intent** | Wants Refund, Wants Replacement, Wants Apology, Wants Escalation, Informational, Legal Threat |
   | **Urgency** | Immediate, High, Medium, Low |
   | **Language** | Auto-detect + confirm from content |

2. **Confidence Scoring & Human-In-The-Loop**
   - Every classification gets a confidence score (0–1)
   - If confidence < 0.75 → flag for human review (active learning queue)
   - Agent corrections feed back as fine-tuning data

3. **Hierarchical Classification**
   - Support nested categories: `Product Defect → Electronics → Mobile Phone → Battery Issue`
   - Coarse classification first, then drill-down — enables both high-level reporting and precise routing

4. **Few-Shot Adaptation**
   - When new product lines launch or new complaint types emerge, adapt via few-shot prompting — no retraining needed
   - Maintain a **dynamic example bank** curated by operations team

5. **Entity Extraction (Inline)**
   - Extract key entities alongside classification:
     - Order IDs, account numbers, product names, dates, amounts
     - Agent names mentioned by customer
     - Specific feature/service referenced

6. **Output Publishing**
   - Enrich the UCE with classification results and publish to `complaints.classified` topic
   - Include: classifications, confidence_scores, extracted_entities, model_version

---

## Model Architecture

```
Input: complaint text (+ metadata context)
    ↓
[Pre-processing] → Clean, normalize, truncate to context window
    ↓
[LLM Inference] → Gemini 2.5 / GPT-4o with structured output (JSON mode)
    ↓
[Post-processing] → Validate against taxonomy, apply business rules
    ↓
Output: multi-dimensional classification + entities + confidence
```

- **Primary Model:** Fine-tuned Gemini 2.5 Flash (cost-effective, fast)
- **Fallback Model:** GPT-4o (for low-confidence cases needing deeper reasoning)
- **Latency budget:** < 500ms per classification

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Classification approach | LLM with structured output | Handles ambiguity, multi-label, and new categories better than traditional ML |
| Primary model | Gemini 2.5 Flash (fine-tuned) | Best cost/accuracy/speed tradeoff |
| Taxonomy management | Dynamic config (not hardcoded) | Products and categories change frequently |
| Active learning | Low-confidence → human queue → retrain | Continuous improvement loop |

---

## Inputs / Outputs

| Direction | Data |
|-----------|------|
| **Input** | UCE from Kafka topic `complaints.ingested` |
| **Output** | Enriched UCE → Kafka topic `complaints.classified` |

---

## Metrics & Monitoring

- Classification accuracy: > 92% (measured against human labels)
- Latency P95: < 500ms
- Human review rate: < 15% of complaints (target: < 8% after 3 months)
- Model drift monitoring: weekly accuracy checks against fresh human-labelled samples

---

## Dependencies

- LLM inference service (Gemini API / self-hosted)
- Product taxonomy service
- Active learning queue & labelling UI
- Kafka consumer/producer
