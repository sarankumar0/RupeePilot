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
Extract expense details from this message and return ONLY a valid JSON object.

Message: "${rawMessage}"

Rules:
- amount: number only (no currency symbols)
- merchant: the shop/app/place name
- category: one of [Food, Transport, Shopping, Entertainment, Health, Utilities, Other]

Return format:
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
}
