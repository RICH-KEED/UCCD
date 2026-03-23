# Unified Customer Complaint Communication Dashboard
## Full System Architecture

<svg width="100%" viewBox="0 0 680 980" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>

<!-- Layer 1 container -->
<rect x="20" y="20" width="640" height="100" rx="12" fill="none" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 3"/>
<text x="36" y="38" font-size="11" fill="#888">Layer 1 — Omnichannel ingestion</text>
<rect x="36" y="48" width="88" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="80" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Email</text>
<text x="80" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">IMAP / SMTP</text>
<rect x="136" y="48" width="88" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="180" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Social</text>
<text x="180" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">Twitter/Meta API</text>
<rect x="236" y="48" width="88" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="280" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Voice</text>
<text x="280" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">STT + diarization</text>
<rect x="336" y="48" width="88" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="380" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Chat / Bot</text>
<text x="380" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">Webhook stream</text>
<rect x="436" y="48" width="88" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="480" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Portal / App</text>
<text x="480" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">REST / GraphQL</text>
<rect x="536" y="48" width="108" height="56" rx="6" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.5"/>
<text x="590" y="71" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Regulator</text>
<text x="590" y="88" font-size="11" fill="#5F5E5A" text-anchor="middle">SFTP / Secure API</text>

<line x1="340" y1="120" x2="340" y2="148" stroke="#aaa" stroke-width="1" marker-end="url(#arrow)"/>

<!-- Normalisation Bus -->
<rect x="140" y="148" width="400" height="48" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="340" y="168" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Normalisation &amp; Event Bus</text>
<text x="340" y="185" font-size="11" fill="#534AB7" text-anchor="middle">Kafka / Pulsar — unified complaint envelope schema</text>

<line x1="340" y1="196" x2="340" y2="222" stroke="#aaa" stroke-width="1" marker-end="url(#arrow)"/>

<!-- Layer 2 container -->
<rect x="20" y="222" width="640" height="180" rx="12" fill="none" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 3"/>
<text x="36" y="240" font-size="11" fill="#888">Layer 2 — AI triage engine (multi-agent)</text>
<rect x="36" y="250" width="130" height="62" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="101" y="273" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">NLP Classifier</text>
<text x="101" y="290" font-size="11" fill="#0F6E56" text-anchor="middle">Type, product, intent</text>
<rect x="178" y="250" width="130" height="62" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="243" y="273" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Emotion Engine</text>
<text x="243" y="290" font-size="11" fill="#0F6E56" text-anchor="middle">Sentiment + tone arc</text>
<rect x="320" y="250" width="130" height="62" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="385" y="273" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Complaint DNA</text>
<text x="385" y="290" font-size="11" fill="#0F6E56" text-anchor="middle">Dedup + cluster</text>
<rect x="462" y="250" width="178" height="62" rx="6" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.5"/>
<text x="551" y="273" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Severity Scorer</text>
<text x="551" y="290" font-size="11" fill="#0F6E56" text-anchor="middle">Risk + regulatory flag</text>
<rect x="36" y="326" width="200" height="62" rx="6" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="136" y="349" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Predictive Escalation</text>
<text x="136" y="366" font-size="11" fill="#993C1D" text-anchor="middle">Escalates BEFORE breach</text>
<rect x="248" y="326" width="190" height="62" rx="6" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="343" y="349" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Root Cause Agent</text>
<text x="343" y="366" font-size="11" fill="#993C1D" text-anchor="middle">Graph + anomaly detect</text>
<rect x="450" y="326" width="190" height="62" rx="6" fill="#FAECE7" stroke="#993C1D" stroke-width="0.5"/>
<text x="545" y="349" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Resolution Graph</text>
<text x="545" y="366" font-size="11" fill="#993C1D" text-anchor="middle">NBA + template engine</text>

<line x1="340" y1="402" x2="340" y2="430" stroke="#aaa" stroke-width="1" marker-end="url(#arrow)"/>

<!-- Layer 3 container -->
<rect x="20" y="430" width="640" height="160" rx="12" fill="none" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 3"/>
<text x="36" y="448" font-size="11" fill="#888">Layer 3 — 360° complaint core</text>
<rect x="36" y="456" width="172" height="118" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="122" y="480" font-size="13" font-weight="500" fill="#0C447C" text-anchor="middle">360° Record</text>
<text x="122" y="499" font-size="11" fill="#185FA5" text-anchor="middle">Full comms history</text>
<text x="122" y="516" font-size="11" fill="#185FA5" text-anchor="middle">Customer profile link</text>
<text x="122" y="533" font-size="11" fill="#185FA5" text-anchor="middle">Cross-complaint graph</text>
<text x="122" y="550" font-size="11" fill="#185FA5" text-anchor="middle">Audit trail</text>
<rect x="222" y="456" width="148" height="118" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="296" y="480" font-size="13" font-weight="500" fill="#0C447C" text-anchor="middle">SLA Engine</text>
<text x="296" y="499" font-size="11" fill="#185FA5" text-anchor="middle">Real-time timers</text>
<text x="296" y="516" font-size="11" fill="#185FA5" text-anchor="middle">Breach prediction</text>
<text x="296" y="533" font-size="11" fill="#185FA5" text-anchor="middle">Proactive alerts</text>
<rect x="384" y="456" width="140" height="118" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="454" y="480" font-size="13" font-weight="500" fill="#0C447C" text-anchor="middle">Regulatory</text>
<text x="454" y="499" font-size="11" fill="#185FA5" text-anchor="middle">Auto-mapping</text>
<text x="454" y="516" font-size="11" fill="#185FA5" text-anchor="middle">Deadline tracking</text>
<text x="454" y="533" font-size="11" fill="#185FA5" text-anchor="middle">Report generation</text>
<rect x="538" y="456" width="122" height="118" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="599" y="480" font-size="13" font-weight="500" fill="#0C447C" text-anchor="middle">Knowledge</text>
<text x="599" y="499" font-size="11" fill="#185FA5" text-anchor="middle">Graph DB</text>
<text x="599" y="516" font-size="11" fill="#185FA5" text-anchor="middle">Complaint DNA</text>
<text x="599" y="533" font-size="11" fill="#185FA5" text-anchor="middle">linkage store</text>

<line x1="340" y1="590" x2="340" y2="616" stroke="#aaa" stroke-width="1" marker-end="url(#arrow)"/>

<!-- Layer 4 container -->
<rect x="20" y="616" width="640" height="140" rx="12" fill="none" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 3"/>
<text x="36" y="634" font-size="11" fill="#888">Layer 4 — Gen-AI response &amp; intelligence layer</text>
<rect x="36" y="642" width="168" height="100" rx="6" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
<text x="120" y="664" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Draft Response</text>
<text x="120" y="681" font-size="11" fill="#854F0B" text-anchor="middle">Tone-matched to</text>
<text x="120" y="698" font-size="11" fill="#854F0B" text-anchor="middle">customer emotion</text>
<text x="120" y="715" font-size="11" fill="#854F0B" text-anchor="middle">Agent review + send</text>
<rect x="216" y="642" width="140" height="100" rx="6" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
<text x="286" y="664" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Trend Analyst</text>
<text x="286" y="681" font-size="11" fill="#854F0B" text-anchor="middle">Complaint spikes</text>
<text x="286" y="698" font-size="11" fill="#854F0B" text-anchor="middle">Product signals</text>
<text x="286" y="715" font-size="11" fill="#854F0B" text-anchor="middle">Auto-reports</text>
<rect x="368" y="642" width="152" height="100" rx="6" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
<text x="444" y="664" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Cognitive Load</text>
<text x="444" y="681" font-size="11" fill="#854F0B" text-anchor="middle">Smart queue routing</text>
<text x="444" y="698" font-size="11" fill="#854F0B" text-anchor="middle">Agent skill match</text>
<text x="444" y="715" font-size="11" fill="#854F0B" text-anchor="middle">Burnout signals</text>
<rect x="532" y="642" width="128" height="100" rx="6" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.5"/>
<text x="596" y="664" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Simulation</text>
<text x="596" y="681" font-size="11" fill="#854F0B" text-anchor="middle">What-if sandbox</text>
<text x="596" y="698" font-size="11" fill="#854F0B" text-anchor="middle">Policy testing</text>
<text x="596" y="715" font-size="11" fill="#854F0B" text-anchor="middle">Outcome predict</text>

<line x1="340" y1="756" x2="340" y2="782" stroke="#aaa" stroke-width="1" marker-end="url(#arrow)"/>

<!-- Layer 5 container -->
<rect x="20" y="782" width="640" height="130" rx="12" fill="none" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 3"/>
<text x="36" y="800" font-size="11" fill="#888">Layer 5 — Dashboard surfaces</text>
<rect x="36" y="808" width="148" height="88" rx="6" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.5"/>
<text x="110" y="832" font-size="13" font-weight="500" fill="#27500A" text-anchor="middle">Agent Workspace</text>
<text x="110" y="850" font-size="11" fill="#3B6D11" text-anchor="middle">360° view + AI assist</text>
<text x="110" y="868" font-size="11" fill="#3B6D11" text-anchor="middle">Draft + send flow</text>
<rect x="196" y="808" width="148" height="88" rx="6" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.5"/>
<text x="270" y="832" font-size="13" font-weight="500" fill="#27500A" text-anchor="middle">Supervisor HQ</text>
<text x="270" y="850" font-size="11" fill="#3B6D11" text-anchor="middle">SLA heatmap</text>
<text x="270" y="868" font-size="11" fill="#3B6D11" text-anchor="middle">Escalation queue</text>
<rect x="356" y="808" width="148" height="88" rx="6" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.5"/>
<text x="430" y="832" font-size="13" font-weight="500" fill="#27500A" text-anchor="middle">Insights Board</text>
<text x="430" y="850" font-size="11" fill="#3B6D11" text-anchor="middle">Trend topology</text>
<text x="430" y="868" font-size="11" fill="#3B6D11" text-anchor="middle">Root cause drill</text>
<rect x="516" y="808" width="144" height="88" rx="6" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.5"/>
<text x="588" y="832" font-size="13" font-weight="500" fill="#27500A" text-anchor="middle">Regulatory View</text>
<text x="588" y="850" font-size="11" fill="#3B6D11" text-anchor="middle">Report builder</text>
<text x="588" y="868" font-size="11" fill="#3B6D11" text-anchor="middle">Deadline tracker</text>
</svg>

---

## Module Summary Table

| Layer | Module | Type | Key Innovation |
|---|---|---|---|
| 1 | Email | Ingestion | Thread-aware, attachment store |
| 1 | Social | Ingestion | Viral risk scoring |
| 1 | Voice | Ingestion | STT + tone markers |
| 1 | Chat/Bot | Ingestion | Structured slot pre-fill |
| 1 | Portal/App | Ingestion | Highest fidelity input |
| 1 | Regulator | Ingestion | Auto priority + tamper log |
| — | Event Bus | Infrastructure | Fan-out, replay, ordering |
| 2 | NLP Classifier | AI Agent | 4-dimension simultaneous classification |
| 2 | Emotion Engine | AI Agent | Arc tracking, not static sentiment |
| 2 | Complaint DNA | AI Agent | Semantic dedup + cluster linkage |
| 2 | Severity Scorer | AI Agent | Composite weighted model |
| 2 | Predictive Escalation | **Novel** | Pre-breach escalation via trajectory model |
| 2 | Root Cause Agent | **Novel** | Graph-based cross-cluster analysis |
| 2 | Resolution Graph | **Novel** | FCR-ranked NBA from outcome history |
| 3 | 360° Record | Core Store | Full history, versioned, all channels |
| 3 | SLA Engine | Core Store | Real-time timers + feeds predictor |
| 3 | Regulatory | Core Store | Auto-mapped, deadline-tracked |
| 3 | Knowledge Graph | Core Store | Graph DB — institutional memory |
| 4 | Draft Response | Gen-AI | Tone-matched, fine-tuned, self-improving |
| 4 | Trend Analyst | Gen-AI | Continuous corpus scan + auto-reports |
| 4 | Cognitive Load Manager | **Novel** | Agent wellbeing + smart routing |
| 4 | Simulation Sandbox | **Novel** | Policy what-if → product roadmap input |
| 5 | Agent Workspace | Dashboard | 360° + AI draft + NBA |
| 5 | Supervisor HQ | Dashboard | Predictive escalation + load monitor |
| 5 | Insights Board | Dashboard | Root cause drill + simulation launcher |
| 5 | Regulatory View | Dashboard | Deadline tracker + report builder |

*Architecture designed for the Unified Customer Complaint Communication Dashboard — Gen-AI powered, multi-agent, predictive.*
