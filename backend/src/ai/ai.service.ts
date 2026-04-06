import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface ParsedExpense {
  amount: number;
  merchant: string;
  category: string;
  // For stock/ETF purchases — extracted when user provides quantity and price in the same message
  quantity?: number;
  pricePerUnit?: number;
  // When category is Investment — the specific asset class (Stock, ETF, Mutual Fund, Gold, etc.)
  // "Unknown" means the message doesn't make the type clear — user will be asked
  investmentType?: string;
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
You are an expense and investment parser for an Indian personal finance app.
Extract details from the user's message and return a single JSON object.

Message: "${rawMessage}"

FIELDS TO RETURN:
- amount: rupee amount. For stocks/ETFs with qty × price, compute the total. Return 0 if unclear.
- merchant: shop, app, person, company, or item name.
- category: one of [Food, Transport, Shopping, Entertainment, Health, Utilities, Housing, EMI, Insurance, Investment, Learning, Others]
- quantity: units/shares bought — for Stock or ETF purchases only. Return 0 otherwise.
- pricePerUnit: price per share/unit — for Stock or ETF purchases only. Return 0 otherwise.
- investmentType: ONLY when category is Investment. Pick from:
    Stock | ETF | Mutual Fund | Gold | Fixed Deposit | PPF/NPS | Bond | Crypto | ULIP/Endowment | Unknown
  Return "Unknown" if the message doesn't make the investment type clear.
  Return "" (empty string) when category is NOT Investment.

CATEGORY RULES:
- Food → restaurants, food delivery, groceries, snacks, chai, coffee, tiffin
- Transport → auto, cab, Uber, Ola, bus, petrol, fuel, train, metro, toll
- Shopping → clothes, shoes, electronics, earphones, mobile accessories, gadgets, household items
- Entertainment → movies, games, OTT (Netflix, Prime, Hotstar), music (Spotify, Gaana), events, concerts
- Health → medicines, doctor, hospital, pharmacy, gym, fitness, yoga, health checkup
- Utilities → electricity, water, internet, phone recharge, wifi, gas bill
- Housing → rent, PG, hostel, room rent, maintenance, society fees, flat rent
- EMI → loan EMI, credit card payment, home loan, car loan, bike loan
- Insurance → PURE protection premiums only (zero maturity value):
    * Term life insurance premium
    * Health insurance / mediclaim premium
    * Car insurance, bike insurance, two-wheeler insurance
    * Home insurance, travel insurance
    * Do NOT use for ULIP, LIC endowment, or money-back plans — those go under Investment
- Investment → assets that grow in value or earn returns:
    * Stocks, shares, equity (direct purchase on NSE/BSE)
    * ETFs (Nifty 50 ETF, sector ETFs — NOT Gold ETF, that is Gold)
    * Mutual funds, SIP, ELSS, index funds
    * Gold (physical, digital gold, Sovereign Gold Bond, Gold ETF)
    * Fixed Deposit (FD), Recurring Deposit (RD)
    * PPF, NPS, EPF contributions (voluntary), NSC, post office schemes
    * Bonds (corporate bonds, government bonds — market traded)
    * Crypto (Bitcoin, Ethereum, altcoins)
    * ULIP, LIC endowment, LIC money-back plans (investment-linked insurance)
- Learning → tools, courses, books for work or career growth:
    * Dev/Tech: Claude, ChatGPT, Cursor, GitHub Copilot, Replit, Vercel Pro, AWS, Udemy, Pluralsight
    * Finance: Bloomberg, CFA materials, accounting course, Wall Street Prep
    * Design: Figma Pro, Adobe CC, Canva Pro, design course
    * General: Coursera, edX, Skillshare, LinkedIn Learning, Kindle book, online certification, coaching
- Others → money to friends/family, donations, miscellaneous

INVESTMENT TYPE RULES (only when category = Investment):
- Stock → direct equity: "Tata Motors", "Infosys", "ONGC", "shares", "stocks"
- ETF → exchange traded funds: "Nifty 50 ETF", "Sensex ETF", "sector ETF" (NOT Gold ETF)
- Mutual Fund → all MFs and SIP: "SIP", "mutual fund", "ELSS", "HDFC equity fund", "index fund", "lump sum in fund"
- Gold → all gold forms: "physical gold", "digital gold", "SGB", "Sovereign Gold Bond", "Gold ETF", "gold jewellery investment"
- Fixed Deposit → bank deposits: "FD", "fixed deposit", "RD", "recurring deposit"
- PPF/NPS → govt long-term schemes: "PPF", "NPS", "EPF voluntary", "NSC", "post office FD"
- Bond → market-traded debt: "corporate bond", "govt bond", "RBI bond", "debenture"
- Crypto → digital assets: "Bitcoin", "Ethereum", "BTC", "ETH", "crypto", "altcoin", "USDT"
- ULIP/Endowment → investment-linked insurance: "ULIP", "LIC endowment", "LIC money-back", "LIC policy", "endowment plan"
- Unknown → message mentions investment intent but type is unclear

EXAMPLES:
- "Earphone 50" → {"amount":50,"merchant":"Earphone","category":"Shopping","quantity":0,"pricePerUnit":0,"investmentType":""}
- "spent 450 at zomato" → {"amount":450,"merchant":"Zomato","category":"Food","quantity":0,"pricePerUnit":0,"investmentType":""}
- "paid 1200 electricity bill" → {"amount":1200,"merchant":"Electricity","category":"Utilities","quantity":0,"pricePerUnit":0,"investmentType":""}
- "petrol 500" → {"amount":500,"merchant":"Petrol","category":"Transport","quantity":0,"pricePerUnit":0,"investmentType":""}
- "rent 8000" → {"amount":8000,"merchant":"Rent","category":"Housing","quantity":0,"pricePerUnit":0,"investmentType":""}
- "home loan EMI 15000" → {"amount":15000,"merchant":"Home Loan EMI","category":"EMI","quantity":0,"pricePerUnit":0,"investmentType":""}
- "term insurance 8000" → {"amount":8000,"merchant":"Term Insurance","category":"Insurance","quantity":0,"pricePerUnit":0,"investmentType":""}
- "health insurance premium 4500" → {"amount":4500,"merchant":"Health Insurance","category":"Insurance","quantity":0,"pricePerUnit":0,"investmentType":""}
- "bike insurance 2000" → {"amount":2000,"merchant":"Bike Insurance","category":"Insurance","quantity":0,"pricePerUnit":0,"investmentType":""}
- "car insurance renewal 6000" → {"amount":6000,"merchant":"Car Insurance","category":"Insurance","quantity":0,"pricePerUnit":0,"investmentType":""}
- "claude 2000 subs" → {"amount":2000,"merchant":"Claude","category":"Learning","quantity":0,"pricePerUnit":0,"investmentType":""}
- "udemy course 499" → {"amount":499,"merchant":"Udemy","category":"Learning","quantity":0,"pricePerUnit":0,"investmentType":""}
- "SIP 5000" → {"amount":5000,"merchant":"SIP","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Mutual Fund"}
- "mutual fund 3000" → {"amount":3000,"merchant":"Mutual Fund","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Mutual Fund"}
- "ELSS 2000" → {"amount":2000,"merchant":"ELSS","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Mutual Fund"}
- "bought 10 tata motors 150 per stock" → {"amount":1500,"merchant":"Tata Motors","category":"Investment","quantity":10,"pricePerUnit":150,"investmentType":"Stock"}
- "15 stocks on ongc" → {"amount":0,"merchant":"ONGC","category":"Investment","quantity":15,"pricePerUnit":0,"investmentType":"Stock"}
- "5 shares of infosys at 1800" → {"amount":9000,"merchant":"Infosys","category":"Investment","quantity":5,"pricePerUnit":1800,"investmentType":"Stock"}
- "bought nifty 50 etf 10 units at 230" → {"amount":2300,"merchant":"Nifty 50 ETF","category":"Investment","quantity":10,"pricePerUnit":230,"investmentType":"ETF"}
- "gold 3000" → {"amount":3000,"merchant":"Gold","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Gold"}
- "digital gold 500" → {"amount":500,"merchant":"Digital Gold","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Gold"}
- "SGB 5000" → {"amount":5000,"merchant":"Sovereign Gold Bond","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Gold"}
- "FD 50000 in SBI" → {"amount":50000,"merchant":"SBI FD","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Fixed Deposit"}
- "recurring deposit 3000" → {"amount":3000,"merchant":"RD","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Fixed Deposit"}
- "PPF 1500" → {"amount":1500,"merchant":"PPF","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"PPF/NPS"}
- "NPS 2000" → {"amount":2000,"merchant":"NPS","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"PPF/NPS"}
- "bitcoin 5000" → {"amount":5000,"merchant":"Bitcoin","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Crypto"}
- "bought corporate bond 10000" → {"amount":10000,"merchant":"Corporate Bond","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Bond"}
- "ULIP premium 3000" → {"amount":3000,"merchant":"ULIP","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"ULIP/Endowment"}
- "LIC policy 2500" → {"amount":2500,"merchant":"LIC","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"ULIP/Endowment"}
- "invested in zerodha 10000" → {"amount":10000,"merchant":"Zerodha","category":"Investment","quantity":0,"pricePerUnit":0,"investmentType":"Unknown"}

Return ONLY a valid JSON object, nothing else:
{"amount": 0, "merchant": "", "category": "", "quantity": 0, "pricePerUnit": 0, "investmentType": ""}
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
