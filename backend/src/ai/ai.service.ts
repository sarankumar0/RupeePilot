import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: string;
}

@Injectable()
export class AiService {
  private groq: Groq;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async parseExpense(rawMessage: string): Promise<ParsedExpense> {
    const prompt = `
You are an expense parser for an Indian personal finance app. Extract expense details from the user's message.

Message: "${rawMessage}"

Rules:
- amount: extract the number (ignore ₹, rs, rupee, rupees symbols). If not found, return 0.
- merchant: the shop, app, person, or item name. If no clear merchant, use the item being bought (e.g. "boat earphones" → "Boat Earphones"). If given to a person, use their name.
- category: pick the best fit from [Food, Transport, Shopping, Entertainment, Health, Utilities, EMI, Others]
  - Food → restaurants, food delivery, groceries, snacks, chai, coffee
  - Transport → auto, cab, uber, ola, bus, petrol, fuel, train, metro
  - Shopping → clothes, dress, shoes, electronics, earphones, mobile accessories, gadgets
  - Entertainment → movies, games, OTT subscriptions, events
  - Health → medicines, doctor, hospital, pharmacy
  - Utilities → electricity, water, internet, phone recharge, wifi
  - EMI → loan, emi, credit card payment
  - Others → anything else including money given to friends/family

Examples:
- "Earphone 50" → {"amount": 50, "merchant": "Earphone", "category": "Shopping"}
- "spent 450 at zomato" → {"amount": 450, "merchant": "Zomato", "category": "Food"}
- "gave 200 to friend as debt" → {"amount": 200, "merchant": "Friend", "category": "Others"}
- "paid 1200 electricity bill" → {"amount": 1200, "merchant": "Electricity", "category": "Utilities"}
- "bought dress for 220" → {"amount": 220, "merchant": "Dress", "category": "Shopping"}
- "spent 50 to buy boat earphones" → {"amount": 50, "merchant": "Boat Earphones", "category": "Shopping"}
- "petrol 500" → {"amount": 500, "merchant": "Petrol", "category": "Transport"}

Return ONLY a valid JSON object, nothing else:
{"amount": 0, "merchant": "", "category": ""}
`;

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content ?? '';

    // Extract JSON from response
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('AI did not return valid JSON');
    }

    return JSON.parse(match[0]) as ParsedExpense;
  }

  // Generate a 1-line personalised tip for the weekly report
  // topCategory is the highest-spend category this week
  async generateWeeklyTip(topCategory: string, weekTotal: number): Promise<string> {
    const prompt = `You are a friendly personal finance advisor for young Indian professionals.

A user spent ₹${weekTotal} this week. Their top spending category was "${topCategory}".

Give exactly ONE short, actionable tip (1 sentence, max 15 words) to help them save money.
Be specific to the category. Use Indian context (mention UPI, tiffin, metro, etc. if relevant).
Do NOT start with "I" or "You should". Just give the tip directly.

Examples:
- Food: "Try home tiffin 3 days a week to save ₹500–₹800/month."
- Transport: "Use metro or bus pass to cut daily cab costs significantly."
- Shopping: "Wait 24 hours before buying — reduces impulse purchases by 40%."

Return only the tip sentence, nothing else.`;

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return (response.choices[0].message.content ?? '').trim();
  }
}
