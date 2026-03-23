from groq import Groq
from dotenv import load_dotenv
import os
import json

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def classify_complaint(text:str):
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": """You are a PSB bank complaint classifier. Return ONLY valid JSON. No explanation, no markdown.

                    Return exactly this structure:
                    {
                    "complaint_type": "one of: fraud, billing, kyc, loans, cards, service, technical, other",
                    "product_code": "one of: savings, current, credit_card, home_loan, personal_loan, fd, insurance",
                    "intent": "one of: refund, explanation, escalation, closure, legal_threat",
                    "regulatory_obligation": "one of: banking_ombudsman, rbi_consumer, irdai, sebi, none"
                    }"""
            },
            {
                "role": "user",
                "content": text
            }
        ],
        model="llama-3.1-8b-instant",
        max_tokens=300,
    )
    response_text = chat_completion.choices[0].message.content
    if response_text is None:
        return {
            "complaint_type": "other",
            "product_code": None,
            "intent": None,
            "regulatory_obligation": "none"
        }
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "complaint_type": "other",
            "product_code": None,
            "intent": None,
            "regulatory_obligation": "none"
        }
    

if __name__ == "__main__":
    tests = [
        "My KYC documents were rejected without any reason and my account is frozen",
        "Someone made unauthorized transactions from my savings account, this is fraud"
    ]
    for t in tests:
        print(classify_complaint(t))