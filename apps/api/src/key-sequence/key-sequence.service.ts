import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * تولید کلید نمایشی یکتا مثل BE-142.
 * باید داخل همان تراکنش ساخت Work Item صدا زده شود تا کلید تکراری تولید نشود. (C6)
 */
@Injectable()
export class KeySequenceService {
  async next(tx: Prisma.TransactionClient, organizationId: string, prefix: string): Promise<string> {
    const existing = await tx.keySequence.findUnique({
      where: { organizationId_prefix: { organizationId, prefix } },
    });
    if (!existing) {
      await tx.keySequence.create({
        data: { id: randomUUID(), organizationId, prefix, lastNumber: 1 },
      });
      return `${prefix}-1`;
    }
    const updated = await tx.keySequence.update({
      where: { id: existing.id },
      data: { lastNumber: { increment: 1 } },
    });
    return `${prefix}-${updated.lastNumber}`;
  }
}
