import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan, LoanDocument } from './loan.schema';
import { LoanEntry, LoanEntryDocument } from './loan-entry.schema';

// Normalize a counterparty name for grouping/matching: "  Ravi K " -> "ravi k"
export function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface EnrichedLoan {
  id: string;
  direction: 'lent' | 'borrowed';
  counterpartyName: string;
  counterpartyKey: string;
  counterpartyType: string;
  principal: number;
  repaid: number;
  outstanding: number;
  status: string;
  startDate: Date;
  dueDate?: Date;
  note?: string;
  entries: { type: string; amount: number; date: Date; note?: string }[];
}

@Injectable()
export class LoansService {
  constructor(
    @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
    @InjectModel(LoanEntry.name) private entryModel: Model<LoanEntryDocument>,
  ) {}

  async createLoan(data: {
    telegramUserId: number;
    direction: 'lent' | 'borrowed';
    counterpartyName: string;
    counterpartyType?: 'friend' | 'individual' | 'institution';
    principal: number;
    rawMessage?: string;
  }): Promise<LoanDocument> {
    const loan = new this.loanModel({
      telegramUserId: data.telegramUserId,
      direction: data.direction,
      counterpartyName: data.counterpartyName.trim(),
      counterpartyKey: normalizeKey(data.counterpartyName),
      counterpartyType: data.counterpartyType ?? 'friend',
      principal: data.principal,
      rawMessage: data.rawMessage,
    });
    return loan.save();
  }

  // Active loans for one counterparty + direction, oldest first (for FIFO repayment)
  private async activeLoansFor(
    telegramUserId: number,
    counterpartyKey: string,
    direction: 'lent' | 'borrowed',
  ): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ telegramUserId, counterpartyKey, direction, status: 'active' })
      .sort({ startDate: 1 })
      .exec();
  }

  // How many active loans match — lets the caller detect "none / one / many"
  async countActiveFor(
    telegramUserId: number,
    counterpartyName: string,
    direction: 'lent' | 'borrowed',
  ): Promise<number> {
    return this.loanModel
      .countDocuments({ telegramUserId, counterpartyKey: normalizeKey(counterpartyName), direction, status: 'active' })
      .exec();
  }

  // Apply a repayment across a person's active loans, oldest first (FIFO).
  // 'lent'     → someone is paying the user back.
  // 'borrowed' → the user is paying someone back.
  async applyRepayment(
    telegramUserId: number,
    counterpartyName: string,
    direction: 'lent' | 'borrowed',
    amount: number,
  ): Promise<{ matched: boolean; applied: number; leftover: number; closed: number; counterpartyName?: string }> {
    const key = normalizeKey(counterpartyName);
    const loans = await this.activeLoansFor(telegramUserId, key, direction);
    if (loans.length === 0) return { matched: false, applied: 0, leftover: amount, closed: 0 };

    // Repaid-so-far per loan
    const ids = loans.map((l) => l._id);
    const entries = await this.entryModel.find({ loanId: { $in: ids }, type: 'repayment' }).exec();
    const repaidById: Record<string, number> = {};
    for (const e of entries) {
      const k = e.loanId.toString();
      repaidById[k] = (repaidById[k] || 0) + e.amount;
    }

    let remaining = amount;
    let closed = 0;
    const name = loans[0].counterpartyName;

    for (const loan of loans) {
      if (remaining <= 0) break;
      const outstanding = loan.principal - (repaidById[loan._id.toString()] || 0);
      if (outstanding <= 0) continue;
      const pay = Math.min(remaining, outstanding);
      await this.entryModel.create({
        loanId: loan._id,
        telegramUserId,
        type: 'repayment',
        amount: pay,
      });
      remaining -= pay;
      if (pay >= outstanding) {
        loan.status = 'closed';
        await loan.save();
        closed++;
      }
    }

    return { matched: true, applied: amount - remaining, leftover: remaining, closed, counterpartyName: name };
  }

  // All of a user's loans, enriched with computed balances + their entries
  async listWithBalances(telegramUserId: number): Promise<EnrichedLoan[]> {
    const loans = await this.loanModel.find({ telegramUserId }).sort({ startDate: -1 }).exec();
    if (loans.length === 0) return [];

    const ids = loans.map((l) => l._id);
    const entries = await this.entryModel.find({ loanId: { $in: ids } }).sort({ date: 1 }).exec();
    const byLoan: Record<string, LoanEntryDocument[]> = {};
    for (const e of entries) {
      const k = e.loanId.toString();
      (byLoan[k] ||= []).push(e);
    }

    return loans.map((loan) => {
      const es = byLoan[loan._id.toString()] || [];
      const repaid = es.filter((e) => e.type === 'repayment').reduce((s, e) => s + e.amount, 0);
      const outstanding = Math.max(loan.principal - repaid, 0);
      return {
        id: loan._id.toString(),
        direction: loan.direction,
        counterpartyName: loan.counterpartyName,
        counterpartyKey: loan.counterpartyKey,
        counterpartyType: loan.counterpartyType,
        principal: loan.principal,
        repaid,
        outstanding,
        status: loan.status,
        startDate: loan.startDate,
        dueDate: loan.dueDate,
        note: loan.note,
        entries: es.map((e) => ({ type: e.type, amount: e.amount, date: e.date, note: e.note })),
      };
    });
  }

  // Portfolio summary: totals + per-person grouping (nets receivable vs payable)
  async getSummary(telegramUserId: number) {
    const loans = await this.listWithBalances(telegramUserId);

    let totalReceivable = 0;
    let totalPayable = 0;
    const peopleMap: Record<string, {
      name: string; key: string; type: string;
      lent: number; borrowed: number; loans: EnrichedLoan[];
    }> = {};

    for (const loan of loans) {
      const p = (peopleMap[loan.counterpartyKey] ||= {
        name: loan.counterpartyName, key: loan.counterpartyKey, type: loan.counterpartyType,
        lent: 0, borrowed: 0, loans: [],
      });
      p.loans.push(loan);
      if (loan.status !== 'active') continue;
      if (loan.direction === 'lent') { totalReceivable += loan.outstanding; p.lent += loan.outstanding; }
      else { totalPayable += loan.outstanding; p.borrowed += loan.outstanding; }
    }

    const people = Object.values(peopleMap)
      .map((p) => ({ ...p, netToYou: p.lent - p.borrowed }))
      .sort((a, b) => Math.abs(b.netToYou) - Math.abs(a.netToYou));

    return {
      totalReceivable,
      totalPayable,
      net: totalReceivable - totalPayable,
      people,
    };
  }
}
