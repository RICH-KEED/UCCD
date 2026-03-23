# Unified Customer Complaint Communication Dashboard
## Architecture Reference — Modules, Layers & SVG Diagrams

---

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

## Layer 1 — Omnichannel Ingestion

All complaint-bearing signals from every channel are ingested here and normalised into a single canonical complaint envelope before any processing begins. Every source gets a connector that handles authentication, rate limiting, deduplication at the edge, and schema mapping.

---

### Module 1.1 — Email (IMAP / SMTP)

Polls or streams inbound email from monitored complaint mailboxes. Parses subject, body, attachments, threading headers, and sender identity. Attachments (PDFs, screenshots) are stored in object storage and linked to the complaint record.


<svg width="100%" viewBox="0 0 440 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="75" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Mailbox</text>
<text x="75" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">IMAP poll / push</text>
<text x="75" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">attachment store</text>
<line x1="130" y1="70" x2="160" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a1)"/>
<rect x="160" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="215" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Parser</text>
<text x="215" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">subject / body /</text>
<text x="215" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">thread ID extract</text>
<line x1="270" y1="70" x2="300" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a1)"/>
<rect x="300" y="30" width="120" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="360" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="360" y="78" font-size="11" fill="#534AB7" text-anchor="middle">canonical schema</text>
<text x="360" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>

---

### Module 1.2 — Social Media (Twitter / Meta API)

Streams mentions, DMs, and tagged posts from connected social accounts via platform webhooks and polling. Captures full post context, media attachments, public vs. private channel flag, follower count (for viral risk scoring), and reply chains.


<svg width="100%" viewBox="0 0 440 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="75" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Social APIs</text>
<text x="75" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">webhook + poll</text>
<text x="75" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">mentions + DMs</text>
<line x1="130" y1="70" x2="160" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a2)"/>
<rect x="160" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="215" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Viral Scorer</text>
<text x="215" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">follower reach</text>
<text x="215" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">public risk flag</text>
<line x1="270" y1="70" x2="300" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a2)"/>
<rect x="300" y="30" width="120" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="360" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="360" y="78" font-size="11" fill="#534AB7" text-anchor="middle">channel = social</text>
<text x="360" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>


---

### Module 1.3 — Voice (STT + Speaker Diarization)

Receives call recordings or live audio streams from the telephony platform. Speech-to-text converts audio to transcript with speaker labels (agent vs. customer). Silence, overtalk, and tone-shift markers are preserved as metadata for the Emotion Engine.


<svg width="100%" viewBox="0 0 540 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="10" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="65" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Telephony</text>
<text x="65" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">recording stream</text>
<text x="65" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">SIP / PSTN</text>
<line x1="120" y1="70" x2="148" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a3)"/>
<rect x="148" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="203" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">STT Engine</text>
<text x="203" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">transcript +</text>
<text x="203" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">speaker labels</text>
<line x1="258" y1="70" x2="286" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a3)"/>
<rect x="286" y="30" width="120" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="346" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Tone Markers</text>
<text x="346" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">silence / overtalk</text>
<text x="346" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">pitch delta</text>
<line x1="406" y1="70" x2="418" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a3)"/>
<rect x="418" y="30" width="110" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="473" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="473" y="78" font-size="11" fill="#534AB7" text-anchor="middle">channel = voice</text>
<text x="473" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>


---

### Module 1.4 — Chat / Bot (Webhook Stream)

Receives live chat messages and chatbot conversation transcripts via webhook. Captures full session context, bot decision path, handoff point, and any structured data collected by the bot (account number, issue type, selected option). This structured pre-fill improves downstream classification accuracy.


<svg width="100%" viewBox="0 0 440 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" marketHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="75" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Chat Platform</text>
<text x="75" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">webhook push</text>
<text x="75" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">session context</text>
<line x1="130" y1="70" x2="160" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a4)"/>
<rect x="160" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="215" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Bot Extractor</text>
<text x="215" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">structured slots</text>
<text x="215" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">handoff trigger</text>
<line x1="270" y1="70" x2="300" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a4)"/>
<rect x="300" y="30" width="120" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="360" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="360" y="78" font-size="11" fill="#534AB7" text-anchor="middle">channel = chat</text>
<text x="360" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>


---

### Module 1.5 — Portal / App (REST / GraphQL)

Receives structured complaint submissions from the web portal and mobile app. Because the customer has already authenticated and selected structured fields (issue type, product, account), this channel produces the highest-quality input data — lowest ambiguity, highest classification confidence.


<svg width="100%" viewBox="0 0 440 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="75" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">Web / App</text>
<text x="75" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">authenticated user</text>
<text x="75" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">structured form</text>
<line x1="130" y1="70" x2="160" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a5)"/>
<rect x="160" y="30" width="110" height="80" rx="8" fill="#F1EFE8" stroke="#B4B2A9" stroke-width="0.8"/>
<text x="215" y="62" font-size="13" font-weight="500" fill="#444441" text-anchor="middle">API Gateway</text>
<text x="215" y="78" font-size="11" fill="#5F5E5A" text-anchor="middle">auth + rate limit</text>
<text x="215" y="94" font-size="11" fill="#5F5E5A" text-anchor="middle">schema validate</text>
<line x1="270" y1="70" x2="300" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a5)"/>
<rect x="300" y="30" width="120" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="360" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="360" y="78" font-size="11" fill="#534AB7" text-anchor="middle">channel = portal</text>
<text x="360" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>


---

### Module 1.6 — Regulator (SFTP / Secure API)

Receives formally lodged complaints from regulatory bodies (FCA, RBI, CFPB, etc.) via secure file transfer or encrypted API. Every complaint received through this channel is automatically flagged as regulatory-priority and assigned the most aggressive SLA tier. Tamper-evident audit logging is mandatory from the moment of receipt.


<svg width="100%" viewBox="0 0 440 140" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="a6" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="110" height="80" rx="8" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.8"/>
<text x="75" y="62" font-size="13" font-weight="500" fill="#791F1F" text-anchor="middle">Regulator</text>
<text x="75" y="78" font-size="11" fill="#A32D2D" text-anchor="middle">SFTP / mTLS API</text>
<text x="75" y="94" font-size="11" fill="#A32D2D" text-anchor="middle">encrypted payload</text>
<line x1="130" y1="70" x2="160" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a6)"/>
<rect x="160" y="30" width="110" height="80" rx="8" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.8"/>
<text x="215" y="62" font-size="13" font-weight="500" fill="#791F1F" text-anchor="middle">Priority Flag</text>
<text x="215" y="78" font-size="11" fill="#A32D2D" text-anchor="middle">regulatory tier</text>
<text x="215" y="94" font-size="11" fill="#A32D2D" text-anchor="middle">tamper-log</text>
<line x1="270" y1="70" x2="300" y2="70" stroke="#aaa" stroke-width="1" marker-end="url(#a6)"/>
<rect x="300" y="30" width="120" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="360" y="62" font-size="13" font-weight="500" fill="#3C3489" text-anchor="middle">Envelope out</text>
<text x="360" y="78" font-size="11" fill="#534AB7" text-anchor="middle">priority = REG</text>
<text x="360" y="94" font-size="11" fill="#534AB7" text-anchor="middle">→ Event Bus</text>
</svg>


---

## Normalisation & Event Bus

The central streaming backbone. All six ingestion connectors publish to this bus. Consumers (AI triage agents) subscribe independently and in parallel. Using Kafka or Pulsar ensures complaints are never lost, ordering is preserved per customer, and the system can replay events if a downstream agent crashes or needs reprocessing.


<svg width="100%" viewBox="0 0 560 100" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="520" height="60" rx="10" fill="#EEEDFE" stroke="#534AB7" stroke-width="1"/>
<text x="280" y="46" font-size="14" font-weight="500" fill="#3C3489" text-anchor="middle">Normalisation &amp; Event Bus</text>
<text x="280" y="64" font-size="11" fill="#534AB7" text-anchor="middle">Kafka / Pulsar — canonical complaint envelope — fan-out to all AI agents in parallel</text>
</svg>


---

## Layer 2 — AI Triage Engine (Multi-Agent)

Six specialised AI agents run in parallel on every incoming complaint envelope. Each agent writes its output back to the complaint record. An orchestrator merges all agent outputs before the complaint is committed to the 360° store. Agents are stateless and independently scalable.

---

### Module 2.1 — NLP Classifier

Uses a fine-tuned transformer to classify the complaint across four dimensions simultaneously: complaint type (billing, fraud, service, KYC, etc.), product line, customer intent (refund, explanation, escalation, close), and regulatory obligation flag. Confidence scores are stored alongside predictions so humans can see how certain the model was.


<svg width="100%" viewBox="0 0 500 160" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="40" width="100" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="70" y="74" font-size="12" font-weight="500" fill="#3C3489" text-anchor="middle">Complaint</text>
<text x="70" y="90" font-size="11" fill="#534AB7" text-anchor="middle">envelope text</text>
<line x1="120" y1="80" x2="148" y2="80" stroke="#aaa" stroke-width="1" marker-end="url(#b1)"/>
<rect x="148" y="30" width="200" height="100" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="248" y="60" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">NLP Classifier</text>
<text x="248" y="78" font-size="11" fill="#0F6E56" text-anchor="middle">complaint type</text>
<text x="248" y="94" font-size="11" fill="#0F6E56" text-anchor="middle">product line</text>
<text x="248" y="110" font-size="11" fill="#0F6E56" text-anchor="middle">intent + reg flag</text>
<line x1="348" y1="80" x2="376" y2="80" stroke="#aaa" stroke-width="1" marker-end="url(#b1)"/>
<rect x="376" y="40" width="104" height="80" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="428" y="74" font-size="12" font-weight="500" fill="#085041" text-anchor="middle">Labels +</text>
<text x="428" y="90" font-size="11" fill="#0F6E56" text-anchor="middle">confidence %</text>
</svg>


---

### Module 2.2 — Emotion Engine

Tracks sentiment at each message turn, not just overall. Maps sentiment across time to produce an emotion arc — this is what distinguishes an angry customer who is calming down from a calm customer who is escalating. The arc score directly influences draft response tone and escalation priority.


<svg width="100%" viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="50" width="100" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="70" y="84" font-size="12" font-weight="500" fill="#3C3489" text-anchor="middle">Message</text>
<text x="70" y="100" font-size="11" fill="#534AB7" text-anchor="middle">turns + voice</text>
<line x1="120" y1="90" x2="148" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b2)"/>
<rect x="148" y="30" width="200" height="120" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="248" y="58" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Emotion Engine</text>
<text x="248" y="76" font-size="11" fill="#0F6E56" text-anchor="middle">per-turn sentiment</text>
<text x="248" y="93" font-size="11" fill="#0F6E56" text-anchor="middle">emotion arc slope</text>
<text x="248" y="110" font-size="11" fill="#0F6E56" text-anchor="middle">escalating / calming</text>
<text x="248" y="127" font-size="11" fill="#0F6E56" text-anchor="middle">frustration intensity</text>
<line x1="348" y1="90" x2="376" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b2)"/>
<rect x="376" y="50" width="104" height="80" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="428" y="84" font-size="12" font-weight="500" fill="#085041" text-anchor="middle">Emotion arc</text>
<text x="428" y="100" font-size="11" fill="#0F6E56" text-anchor="middle">→ tone input</text>
</svg>


---

### Module 2.3 — Complaint DNA (Dedup + Cluster)

Generates a semantic vector embedding for every complaint. Compares against the existing complaint corpus to identify duplicates (same customer, same issue) and near-duplicates (different customers, same root cause). Clusters are tracked in the knowledge graph. Resolving the root cause of a cluster closes all member complaints simultaneously.


<svg width="100%" viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="50" width="100" height="80" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="70" y="84" font-size="12" font-weight="500" fill="#3C3489" text-anchor="middle">Complaint</text>
<text x="70" y="100" font-size="11" fill="#534AB7" text-anchor="middle">envelope text</text>
<line x1="120" y1="90" x2="148" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b3)"/>
<rect x="148" y="20" width="210" height="140" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="253" y="50" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Complaint DNA</text>
<text x="253" y="68" font-size="11" fill="#0F6E56" text-anchor="middle">embed → vector store</text>
<text x="253" y="85" font-size="11" fill="#0F6E56" text-anchor="middle">cosine similarity search</text>
<text x="253" y="102" font-size="11" fill="#0F6E56" text-anchor="middle">dedup detection</text>
<text x="253" y="119" font-size="11" fill="#0F6E56" text-anchor="middle">cluster membership</text>
<text x="253" y="136" font-size="11" fill="#0F6E56" text-anchor="middle">cluster size + root link</text>
<line x1="358" y1="90" x2="386" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b3)"/>
<rect x="386" y="50" width="114" height="80" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="443" y="80" font-size="12" font-weight="500" fill="#085041" text-anchor="middle">DNA fingerprint</text>
<text x="443" y="97" font-size="11" fill="#0F6E56" text-anchor="middle">cluster ID</text>
<text x="443" y="113" font-size="11" fill="#0F6E56" text-anchor="middle">→ knowledge graph</text>
</svg>


---

### Module 2.4 — Severity Scorer

Assigns a composite severity score using weighted signals: complaint type, customer tier (VIP / standard), regulatory obligation, reopen count, emotion arc, channel (regulatory channel = max severity), and complaint history. The score determines SLA tier, queue priority, and whether the complaint bypasses the standard agent queue for immediate supervisor attention.


<svg width="100%" viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="130" height="140" rx="8" fill="#EEEDFE" stroke="#534AB7" stroke-width="0.8"/>
<text x="85" y="55" font-size="12" font-weight="500" fill="#3C3489" text-anchor="middle">Input signals</text>
<text x="85" y="73" font-size="11" fill="#534AB7" text-anchor="middle">complaint type</text>
<text x="85" y="89" font-size="11" fill="#534AB7" text-anchor="middle">customer tier</text>
<text x="85" y="105" font-size="11" fill="#534AB7" text-anchor="middle">reg obligation</text>
<text x="85" y="121" font-size="11" fill="#534AB7" text-anchor="middle">reopen count</text>
<text x="85" y="137" font-size="11" fill="#534AB7" text-anchor="middle">emotion arc</text>
<line x1="150" y1="100" x2="178" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#b4)"/>
<rect x="178" y="40" width="160" height="120" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="258" y="66" font-size="13" font-weight="500" fill="#085041" text-anchor="middle">Severity Scorer</text>
<text x="258" y="84" font-size="11" fill="#0F6E56" text-anchor="middle">weighted model</text>
<text x="258" y="100" font-size="11" fill="#0F6E56" text-anchor="middle">composite score 0–100</text>
<text x="258" y="116" font-size="11" fill="#0F6E56" text-anchor="middle">SLA tier assignment</text>
<text x="258" y="132" font-size="11" fill="#0F6E56" text-anchor="middle">regulatory flag</text>
<line x1="338" y1="100" x2="366" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#b4)"/>
<rect x="366" y="60" width="114" height="80" rx="8" fill="#E1F5EE" stroke="#0F6E56" stroke-width="0.8"/>
<text x="423" y="90" font-size="12" font-weight="500" fill="#085041" text-anchor="middle">Score + SLA tier</text>
<text x="423" y="107" font-size="11" fill="#0F6E56" text-anchor="middle">→ 360° record</text>
</svg>


---

### Module 2.5 — Predictive Escalation (Novel)

The most differentiated module in the system. Uses a trained trajectory model to estimate the probability of SLA breach at the moment of complaint creation — not after time has passed. Input features include complaint type, current queue depth, agent availability, time of day, historical handle time for similar complaints, and severity score. Any complaint with breach probability > 70% is pre-escalated to the supervisor queue immediately.


<svg width="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="130" height="140" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="85" y="55" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Trajectory inputs</text>
<text x="85" y="73" font-size="11" fill="#993C1D" text-anchor="middle">queue depth now</text>
<text x="85" y="89" font-size="11" fill="#993C1D" text-anchor="middle">agent availability</text>
<text x="85" y="105" font-size="11" fill="#993C1D" text-anchor="middle">time of day</text>
<text x="85" y="121" font-size="11" fill="#993C1D" text-anchor="middle">similar handle time</text>
<text x="85" y="137" font-size="11" fill="#993C1D" text-anchor="middle">severity score</text>
<line x1="150" y1="100" x2="178" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#b5)"/>
<rect x="178" y="30" width="180" height="140" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="268" y="58" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Breach Predictor</text>
<text x="268" y="76" font-size="11" fill="#993C1D" text-anchor="middle">breach probability %</text>
<text x="268" y="93" font-size="11" fill="#993C1D" text-anchor="middle">expected handle time</text>
<text x="268" y="110" font-size="11" fill="#993C1D" text-anchor="middle">urgency window</text>
<text x="268" y="127" font-size="11" fill="#993C1D" text-anchor="middle">&gt;70% → pre-escalate</text>
<text x="268" y="144" font-size="11" fill="#993C1D" text-anchor="middle">before breach occurs</text>
<line x1="358" y1="100" x2="386" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#b5)"/>
<rect x="386" y="50" width="114" height="100" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="443" y="80" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Pre-escalation</text>
<text x="443" y="97" font-size="11" fill="#993C1D" text-anchor="middle">supervisor alert</text>
<text x="443" y="113" font-size="11" fill="#993C1D" text-anchor="middle">→ Escalation HQ</text>
</svg>


---

### Module 2.6 — Root Cause Agent

Traverses the complaint knowledge graph to identify whether the current complaint shares a root cause with any existing cluster. Uses graph pattern matching and anomaly detection to surface system-level failure signals (e.g. API gateway degradation causing 40 payment failures). When a new root cause is detected, it creates a root cause node in the graph and links all related complaints to it.


<svg width="100%" viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b6" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="40" width="120" height="100" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="80" y="70" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Complaint DNA</text>
<text x="80" y="87" font-size="11" fill="#993C1D" text-anchor="middle">cluster ID</text>
<text x="80" y="103" font-size="11" fill="#993C1D" text-anchor="middle">knowledge graph</text>
<line x1="140" y1="90" x2="168" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b6)"/>
<rect x="168" y="20" width="210" height="140" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="273" y="48" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Root Cause Agent</text>
<text x="273" y="66" font-size="11" fill="#993C1D" text-anchor="middle">graph traversal</text>
<text x="273" y="83" font-size="11" fill="#993C1D" text-anchor="middle">pattern match across clusters</text>
<text x="273" y="100" font-size="11" fill="#993C1D" text-anchor="middle">anomaly detection</text>
<text x="273" y="117" font-size="11" fill="#993C1D" text-anchor="middle">root cause node creation</text>
<text x="273" y="134" font-size="11" fill="#993C1D" text-anchor="middle">supervisor alert on spike</text>
<line x1="378" y1="90" x2="406" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b6)"/>
<rect x="406" y="50" width="100" height="80" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="456" y="80" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Root cause</text>
<text x="456" y="97" font-size="11" fill="#993C1D" text-anchor="middle">node + alert</text>
</svg>


---

### Module 2.7 — Resolution Intelligence Graph

Maintains a live knowledge graph of: complaint type → resolution action → outcome → reopen rate → CSAT. When a new complaint is classified, this module queries the graph for the top-3 resolution paths ranked by first-contact resolution rate. The highest-confidence path becomes the "next-best action" shown to the agent, pre-loaded in their workspace.


<svg width="100%" viewBox="0 0 540 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="b7" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="40" width="120" height="100" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="80" y="70" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Classification</text>
<text x="80" y="87" font-size="11" fill="#993C1D" text-anchor="middle">type + product</text>
<text x="80" y="103" font-size="11" fill="#993C1D" text-anchor="middle">emotion arc</text>
<line x1="140" y1="90" x2="168" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b7)"/>
<rect x="168" y="20" width="220" height="140" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="278" y="48" font-size="13" font-weight="500" fill="#712B13" text-anchor="middle">Resolution Graph</text>
<text x="278" y="66" font-size="11" fill="#993C1D" text-anchor="middle">query: type → best action</text>
<text x="278" y="83" font-size="11" fill="#993C1D" text-anchor="middle">FCR rate per path</text>
<text x="278" y="100" font-size="11" fill="#993C1D" text-anchor="middle">reopen rate signal</text>
<text x="278" y="117" font-size="11" fill="#993C1D" text-anchor="middle">CSAT weighted rank</text>
<text x="278" y="134" font-size="11" fill="#993C1D" text-anchor="middle">top-3 NBA output</text>
<line x1="388" y1="90" x2="416" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#b7)"/>
<rect x="416" y="50" width="104" height="80" rx="8" fill="#FAECE7" stroke="#993C1D" stroke-width="0.8"/>
<text x="468" y="80" font-size="12" font-weight="500" fill="#712B13" text-anchor="middle">Next best</text>
<text x="468" y="97" font-size="11" fill="#993C1D" text-anchor="middle">action + template</text>
</svg>


---

## Layer 3 — 360° Complaint Core

The persistent store. Every piece of information produced by ingestion, triage, agent interaction, and resolution is written here. This layer is the "source of truth" — it never loses data, every state change is versioned, and the full history is always accessible.

---

### Module 3.1 — 360° Complaint Record

The central complaint object. Stores every message, every classification, every agent action, every AI suggestion, every status change, and every linked complaint — all timestamped and versioned. Provides the complete communication history view in the agent workspace.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#0C447C" text-anchor="middle">360° Complaint Record</text>
<text x="240" y="68" font-size="11" fill="#185FA5" text-anchor="middle">customer identity + profile + CRM link</text>
<text x="240" y="85" font-size="11" fill="#185FA5" text-anchor="middle">full communication history (all channels, chronological)</text>
<text x="240" y="102" font-size="11" fill="#185FA5" text-anchor="middle">all AI classifications + confidence scores</text>
<text x="240" y="119" font-size="11" fill="#185FA5" text-anchor="middle">every agent action + draft + final response</text>
<text x="240" y="136" font-size="11" fill="#185FA5" text-anchor="middle">linked complaint IDs (cluster membership)</text>
<text x="240" y="153" font-size="11" fill="#185FA5" text-anchor="middle">tamper-evident audit trail (every write versioned)</text>
</svg>


---

### Module 3.2 — SLA Engine

Maintains real-time countdown timers for every open complaint. SLA tier is set by the Severity Scorer at complaint creation. The engine fires proactive alerts at configurable thresholds (e.g. 50%, 75%, 90% of time elapsed) and writes a breach event to the audit log if the deadline is missed. Feeds the Predictive Escalation model with live queue state.


<svg width="100%" viewBox="0 0 520 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="c2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="40" width="130" height="100" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="85" y="68" font-size="12" font-weight="500" fill="#0C447C" text-anchor="middle">SLA tier</text>
<text x="85" y="85" font-size="11" fill="#185FA5" text-anchor="middle">from severity scorer</text>
<text x="85" y="101" font-size="11" fill="#185FA5" text-anchor="middle">deadline = now +</text>
<text x="85" y="117" font-size="11" fill="#185FA5" text-anchor="middle">tier hours</text>
<line x1="150" y1="90" x2="178" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#c2)"/>
<rect x="178" y="20" width="200" height="140" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="278" y="48" font-size="13" font-weight="500" fill="#0C447C" text-anchor="middle">SLA Engine</text>
<text x="278" y="66" font-size="11" fill="#185FA5" text-anchor="middle">real-time countdown</text>
<text x="278" y="83" font-size="11" fill="#185FA5" text-anchor="middle">50% / 75% / 90% alerts</text>
<text x="278" y="100" font-size="11" fill="#185FA5" text-anchor="middle">breach event write</text>
<text x="278" y="117" font-size="11" fill="#185FA5" text-anchor="middle">feeds predictive model</text>
<text x="278" y="134" font-size="11" fill="#185FA5" text-anchor="middle">queue state export</text>
<line x1="378" y1="90" x2="406" y2="90" stroke="#aaa" stroke-width="1" marker-end="url(#c2)"/>
<rect x="406" y="50" width="100" height="80" rx="8" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="456" y="80" font-size="12" font-weight="500" fill="#0C447C" text-anchor="middle">Timer state</text>
<text x="456" y="97" font-size="11" fill="#185FA5" text-anchor="middle">→ dashboard</text>
</svg>


---

### Module 3.3 — Regulatory Module

Auto-maps each complaint to the applicable regulatory framework based on complaint type, product, and jurisdiction. Tracks the regulatory response deadline independently of the internal SLA. Generates submission-ready reports in the required format (FCA Gabriel, RBI return, CFPB format, etc.) and maintains a log of every regulatory interaction for external audit.


<svg width="100%" viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="140" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#791F1F" text-anchor="middle">Regulatory Module</text>
<text x="240" y="68" font-size="11" fill="#A32D2D" text-anchor="middle">auto-map: complaint type + jurisdiction → regulation</text>
<text x="240" y="85" font-size="11" fill="#A32D2D" text-anchor="middle">independent regulatory deadline timer</text>
<text x="240" y="102" font-size="11" fill="#A32D2D" text-anchor="middle">report generator: FCA / RBI / CFPB / MAS formats</text>
<text x="240" y="119" font-size="11" fill="#A32D2D" text-anchor="middle">full regulatory interaction log (external audit ready)</text>
<text x="240" y="136" font-size="11" fill="#A32D2D" text-anchor="middle">escalation: breach of reg deadline → legal team alert</text>
</svg>


---

### Module 3.4 — Knowledge Graph Store

A graph database (Neo4j / Neptune) that stores the relationships between complaints, clusters, root causes, customers, products, and resolution outcomes. Powers the Complaint DNA module's dedup queries, the Root Cause Agent's traversal, and the Resolution Intelligence Graph's outcome lookups. This is the institutional memory of the entire system.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#E6F1FB" stroke="#185FA5" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#0C447C" text-anchor="middle">Knowledge Graph Store</text>
<text x="240" y="68" font-size="11" fill="#185FA5" text-anchor="middle">nodes: complaint, cluster, root cause, customer, product</text>
<text x="240" y="85" font-size="11" fill="#185FA5" text-anchor="middle">edges: member-of, caused-by, resolved-by, linked-to</text>
<text x="240" y="102" font-size="11" fill="#185FA5" text-anchor="middle">vector embeddings: pgvector / Pinecone sidecar</text>
<text x="240" y="119" font-size="11" fill="#185FA5" text-anchor="middle">powers: dedup queries, root cause traversal, NBA lookup</text>
<text x="240" y="136" font-size="11" fill="#185FA5" text-anchor="middle">graph DB: Neo4j or Amazon Neptune</text>
<text x="240" y="153" font-size="11" fill="#185FA5" text-anchor="middle">institutional memory — never purged, only archived</text>
</svg>


---

## Layer 4 — Gen-AI Response & Intelligence

Four Gen-AI powered modules that transform raw complaint data into actionable intelligence. All LLM calls use a fine-tuned model trained on historical complaint/resolution pairs — not a raw generic model — so outputs match the organisation's tone, policies, and vocabulary.

---

### Module 4.1 — Draft Response Generator

Generates a complete, ready-to-send draft response for every complaint. Tone is matched to the customer's emotion arc — empathetic for distressed customers, factual for regulatory complaints, solution-focused for billing disputes. The agent sees the draft pre-loaded in their workspace and can edit or send with one click. All edits are logged to measure AI accuracy over time and improve the model.


<svg width="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="d1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="120" height="140" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="80" y="58" font-size="12" font-weight="500" fill="#633806" text-anchor="middle">Context inputs</text>
<text x="80" y="76" font-size="11" fill="#854F0B" text-anchor="middle">360° record</text>
<text x="80" y="93" font-size="11" fill="#854F0B" text-anchor="middle">emotion arc</text>
<text x="80" y="110" font-size="11" fill="#854F0B" text-anchor="middle">NBA action</text>
<text x="80" y="127" font-size="11" fill="#854F0B" text-anchor="middle">policy docs</text>
<text x="80" y="144" font-size="11" fill="#854F0B" text-anchor="middle">brand voice</text>
<line x1="140" y1="100" x2="168" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#d1)"/>
<rect x="168" y="20" width="200" height="160" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="268" y="48" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Draft Generator</text>
<text x="268" y="66" font-size="11" fill="#854F0B" text-anchor="middle">fine-tuned LLM</text>
<text x="268" y="83" font-size="11" fill="#854F0B" text-anchor="middle">tone = f(emotion arc)</text>
<text x="268" y="100" font-size="11" fill="#854F0B" text-anchor="middle">policy-grounded</text>
<text x="268" y="117" font-size="11" fill="#854F0B" text-anchor="middle">resolution embedded</text>
<text x="268" y="134" font-size="11" fill="#854F0B" text-anchor="middle">edit delta logged</text>
<text x="268" y="151" font-size="11" fill="#854F0B" text-anchor="middle">model self-improves</text>
<line x1="368" y1="100" x2="396" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#d1)"/>
<rect x="396" y="50" width="104" height="100" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="448" y="80" font-size="12" font-weight="500" fill="#633806" text-anchor="middle">Draft response</text>
<text x="448" y="97" font-size="11" fill="#854F0B" text-anchor="middle">→ agent review</text>
<text x="448" y="113" font-size="11" fill="#854F0B" text-anchor="middle">→ send / edit</text>
</svg>


---

### Module 4.2 — Trend Analyst

Runs continuous analysis across the full complaint corpus to detect volume spikes, emerging complaint types, and product-level failure signals. Outputs a proactive intelligence feed to the supervisor view and a weekly auto-generated trend report for management. Can distinguish a genuine product issue spike from a seasonal volume increase.


<svg width="100%" viewBox="0 0 480 180" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="140" rx="10" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#633806" text-anchor="middle">Trend Analyst</text>
<text x="240" y="68" font-size="11" fill="#854F0B" text-anchor="middle">continuous corpus scan — rolling 24h / 7d / 30d windows</text>
<text x="240" y="85" font-size="11" fill="#854F0B" text-anchor="middle">volume spike detection per complaint type + product</text>
<text x="240" y="102" font-size="11" fill="#854F0B" text-anchor="middle">seasonal baseline subtraction (genuine vs expected spikes)</text>
<text x="240" y="119" font-size="11" fill="#854F0B" text-anchor="middle">proactive intelligence feed → supervisor AI panel</text>
<text x="240" y="136" font-size="11" fill="#854F0B" text-anchor="middle">auto-generated weekly trend report → management</text>
</svg>


---

### Module 4.3 — Agent Cognitive Load Manager (Novel)

Monitors each agent's real-time cognitive load using a composite signal: number of active complaints, average complaint complexity, emotional intensity of current queue, time on shift, and recent CSAT trend. Routes new complaints to the lowest-load agent with the right skill set. Fires a supervisor alert when an agent crosses 80% load threshold — before quality degrades.


<svg width="100%" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<defs>
  <marker id="d3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
</defs>
<rect x="20" y="30" width="120" height="140" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="80" y="58" font-size="12" font-weight="500" fill="#633806" text-anchor="middle">Agent signals</text>
<text x="80" y="76" font-size="11" fill="#854F0B" text-anchor="middle">queue depth</text>
<text x="80" y="93" font-size="11" fill="#854F0B" text-anchor="middle">complexity avg</text>
<text x="80" y="110" font-size="11" fill="#854F0B" text-anchor="middle">emotion intensity</text>
<text x="80" y="127" font-size="11" fill="#854F0B" text-anchor="middle">shift duration</text>
<text x="80" y="144" font-size="11" fill="#854F0B" text-anchor="middle">CSAT trend</text>
<line x1="140" y1="100" x2="168" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#d3)"/>
<rect x="168" y="20" width="200" height="160" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="268" y="48" font-size="13" font-weight="500" fill="#633806" text-anchor="middle">Load Manager</text>
<text x="268" y="66" font-size="11" fill="#854F0B" text-anchor="middle">composite load score</text>
<text x="268" y="83" font-size="11" fill="#854F0B" text-anchor="middle">skill-match routing</text>
<text x="268" y="100" font-size="11" fill="#854F0B" text-anchor="middle">&gt;80% → burnout alert</text>
<text x="268" y="117" font-size="11" fill="#854F0B" text-anchor="middle">smart queue rebalance</text>
<text x="268" y="134" font-size="11" fill="#854F0B" text-anchor="middle">handoff recommendation</text>
<text x="268" y="151" font-size="11" fill="#854F0B" text-anchor="middle">quality protection</text>
<line x1="368" y1="100" x2="396" y2="100" stroke="#aaa" stroke-width="1" marker-end="url(#d3)"/>
<rect x="396" y="50" width="104" height="100" rx="8" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="448" y="80" font-size="12" font-weight="500" fill="#633806" text-anchor="middle">Routing + alert</text>
<text x="448" y="97" font-size="11" fill="#854F0B" text-anchor="middle">→ supervisor</text>
<text x="448" y="113" font-size="11" fill="#854F0B" text-anchor="middle">→ queue assign</text>
</svg>


---

### Module 4.4 — Simulation Sandbox (Novel)

A what-if modelling environment for product and policy teams. Users define a hypothetical policy change (e.g. "extend refund window from 7 to 14 days for product X") and the system estimates the impact across the current open complaint corpus: how many cases would auto-resolve, what the projected CSAT improvement would be, and what the cost implication is. Turns the complaint system into a direct input to product decisions.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#FAEEDA" stroke="#854F0B" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#633806" text-anchor="middle">Simulation Sandbox</text>
<text x="240" y="68" font-size="11" fill="#854F0B" text-anchor="middle">input: proposed policy / product change</text>
<text x="240" y="85" font-size="11" fill="#854F0B" text-anchor="middle">scan: which open complaints match the change criteria</text>
<text x="240" y="102" font-size="11" fill="#854F0B" text-anchor="middle">estimate: % auto-resolve, CSAT delta, cost impact</text>
<text x="240" y="119" font-size="11" fill="#854F0B" text-anchor="middle">output: what-if report for product / policy teams</text>
<text x="240" y="136" font-size="11" fill="#854F0B" text-anchor="middle">no production data modified — read-only simulation</text>
<text x="240" y="153" font-size="11" fill="#854F0B" text-anchor="middle">connects complaint ops directly to product roadmap</text>
</svg>


---

## Layer 5 — Dashboard Surfaces

Four role-optimised views built on top of the same underlying data. Each surface shows only what its user needs, in the format that supports their specific decisions.

---

### Module 5.1 — Agent Workspace

The primary daily-use interface for frontline agents. Opens to a 360° view of the assigned complaint with full communication history, AI-generated classification summary, emotion arc visualisation, and a pre-loaded draft response. The agent reviews the draft, edits if needed, and sends — or selects a different resolution action from the NBA list.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#27500A" text-anchor="middle">Agent Workspace</text>
<text x="240" y="68" font-size="11" fill="#3B6D11" text-anchor="middle">complaint summary: classification + severity + SLA timer</text>
<text x="240" y="85" font-size="11" fill="#3B6D11" text-anchor="middle">full 360° communication history (all channels, all turns)</text>
<text x="240" y="102" font-size="11" fill="#3B6D11" text-anchor="middle">emotion arc chart: customer sentiment over time</text>
<text x="240" y="119" font-size="11" fill="#3B6D11" text-anchor="middle">AI draft response: pre-loaded, editable, one-click send</text>
<text x="240" y="136" font-size="11" fill="#3B6D11" text-anchor="middle">next best action list: top-3 resolution paths + FCR rates</text>
<text x="240" y="153" font-size="11" fill="#3B6D11" text-anchor="middle">linked complaints panel: cluster members + root cause</text>
</svg>


---

### Module 5.2 — Supervisor Command Centre (HQ)

The real-time operations command view for team leads and managers. Shows live SLA breach and prediction status, agent cognitive load scores, escalation queue, AI intelligence feed (spike alerts, burnout signals, template opportunities), and the complaint volume chart with 12-hour history. Every element is actionable — one click to reassign, escalate, or investigate.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#27500A" text-anchor="middle">Supervisor HQ</text>
<text x="240" y="68" font-size="11" fill="#3B6D11" text-anchor="middle">live KPIs: open count, breaches, predicted breaches, FCR</text>
<text x="240" y="85" font-size="11" fill="#3B6D11" text-anchor="middle">SLA heatmap: category × time-bucket, colour = severity</text>
<text x="240" y="102" font-size="11" fill="#3B6D11" text-anchor="middle">escalation queue: breach + predicted, time-remaining</text>
<text x="240" y="119" font-size="11" fill="#3B6D11" text-anchor="middle">agent load bars: cognitive load % per agent, burnout alerts</text>
<text x="240" y="136" font-size="11" fill="#3B6D11" text-anchor="middle">AI intelligence feed: spikes, template ops, burnout signals</text>
<text x="240" y="153" font-size="11" fill="#3B6D11" text-anchor="middle">complaint volume chart: 12h bar chart, breach overlay</text>
</svg>


---

### Module 5.3 — Insights Board

The analytics and trend view for operations managers and product teams. Shows complaint topology (which types are growing, which are shrinking), root cause drill-down (what system failures are generating the most complaints), and resolution effectiveness analysis (which actions achieve highest FCR and CSAT). Feeds directly into the Simulation Sandbox for what-if analysis.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#EAF3DE" stroke="#3B6D11" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#27500A" text-anchor="middle">Insights Board</text>
<text x="240" y="68" font-size="11" fill="#3B6D11" text-anchor="middle">complaint topology: type / product trend lines (30 / 90d)</text>
<text x="240" y="85" font-size="11" fill="#3B6D11" text-anchor="middle">root cause drill: system failures → complaint cluster map</text>
<text x="240" y="102" font-size="11" fill="#3B6D11" text-anchor="middle">resolution effectiveness: FCR + CSAT per action type</text>
<text x="240" y="119" font-size="11" fill="#3B6D11" text-anchor="middle">channel breakdown: volume + handle time per channel</text>
<text x="240" y="136" font-size="11" fill="#3B6D11" text-anchor="middle">anomaly alerts: sudden type or product spike history</text>
<text x="240" y="153" font-size="11" fill="#3B6D11" text-anchor="middle">simulation launcher: → what-if sandbox with context</text>
</svg>


---

### Module 5.4 — Regulatory View

The compliance officer's interface. Shows all open complaints with a regulatory obligation, their deadline status, submission history, and report generation tools. Auto-populates report templates with complaint data. Provides a one-click submission flow to the relevant regulator portal and a full regulatory interaction log for external audit.


<svg width="100%" viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
<rect x="20" y="20" width="440" height="160" rx="10" fill="#FCEBEB" stroke="#A32D2D" stroke-width="0.8"/>
<text x="240" y="48" font-size="14" font-weight="500" fill="#791F1F" text-anchor="middle">Regulatory View</text>
<text x="240" y="68" font-size="11" fill="#A32D2D" text-anchor="middle">open regulatory complaints: deadline countdown per item</text>
<text x="240" y="85" font-size="11" fill="#A32D2D" text-anchor="middle">report builder: auto-populated FCA / RBI / CFPB templates</text>
<text x="240" y="102" font-size="11" fill="#A32D2D" text-anchor="middle">submission tracker: sent / acknowledged / outstanding</text>
<text x="240" y="119" font-size="11" fill="#A32D2D" text-anchor="middle">full regulatory interaction log: immutable audit trail</text>
<text x="240" y="136" font-size="11" fill="#A32D2D" text-anchor="middle">breach alert: reg deadline at risk → legal team escalation</text>
<text x="240" y="153" font-size="11" fill="#A32D2D" text-anchor="middle">one-click submission → regulator portal integration</text>
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

---

*Architecture designed for the Unified Customer Complaint Communication Dashboard — Gen-AI powered, multi-agent, predictive.*