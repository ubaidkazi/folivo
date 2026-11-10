
import "server-only";

export class LedgerValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "LedgerValidationError";
  }
}

/**
 * Post a balanced journal entry inside an existing
 * Prisma database transaction.
 *
 * This is an internal server-side function.
 * Never accept journal lines directly from an API client.
 */
export async function postJournalEntry(
  tx,
  {
    entityId,
    type,
    description,
    effectiveDate,
    idempotencyKey,
    lines,
  }
) {
  if (!Array.isArray(lines) || lines.length < 2 || lines.length > 50) {
    throw new LedgerValidationError(
      "A journal entry requires 2–50 lines."
    );
  }

  let totalDebits = 0n;
  let totalCredits = 0n;

  const accountIds = new Set();

  for (const line of lines) {
    if (
      typeof line.ledgerAccountId !== "string" ||
      !line.ledgerAccountId
    ) {
      throw new LedgerValidationError(
        "Every journal line requires a ledger account."
      );
    }

    if (
      typeof line.amountCents !== "bigint" ||
      line.amountCents <= 0n
    ) {
      throw new LedgerValidationError(
        "Journal amounts must be positive BigInt cents."
      );
    }

    if (line.direction === "DEBIT") {
      totalDebits += line.amountCents;
    } else if (line.direction === "CREDIT") {
      totalCredits += line.amountCents;
    } else {
      throw new LedgerValidationError(
        "Invalid journal direction."
      );
    }

    accountIds.add(line.ledgerAccountId);
  }

  if (totalDebits !== totalCredits) {
    throw new LedgerValidationError(
      "Journal entry is not balanced."
    );
  }

  // Ensure every referenced ledger account belongs
  // to the workspace being posted to.
  const matchingAccounts = await tx.ledgerAccount.count({
    where: {
      entityId,
      id: {
        in: [...accountIds],
      },
    },
  });

  if (matchingAccounts !== accountIds.size) {
    throw new LedgerValidationError(
      "One or more ledger accounts are invalid for this workspace."
    );
  }

  // Atomic journal header + lines creation.
  return tx.journalEntry.create({
    data: {
      entityId,
      type,
      description,
      effectiveDate,
      idempotencyKey,
      lines: {
        create: lines.map((line) => ({
          ledgerAccountId: line.ledgerAccountId,
          direction: line.direction,
          amountCents: line.amountCents,
        })),
      },
    },
  });
}
