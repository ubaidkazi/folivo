
import "server-only";

import { prisma } from "../prisma";
import { postJournalEntry } from "./ledger";

const MAX_AMOUNT_CENTS = 99999999999n;

export class TransactionValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "TransactionValidationError";
    this.status = status;
  }
}

function parseAmount(value) {
  if (typeof value !== "string") {
    throw new TransactionValidationError(
      "Amount must be a decimal string."
    );
  }

  const amount = value.trim();

  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount)) {
    throw new TransactionValidationError(
      "Enter a valid non-negative USD amount with up to two decimals."
    );
  }

  const [dollars, fraction = ""] = amount.split(".");

  const cents =
    BigInt(dollars) * 100n +
    BigInt(fraction.padEnd(2, "0") || "0");

  if (cents <= 0n || cents > MAX_AMOUNT_CENTS) {
    throw new TransactionValidationError(
      "Transaction amount must be greater than zero and within the allowed limit."
    );
  }

  return cents;
}

function parseDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new TransactionValidationError(
      "Date must use YYYY-MM-DD format."
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new TransactionValidationError(
      "Invalid transaction date."
    );
  }

  return date;
}

function validateInput(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new TransactionValidationError(
      "Invalid transaction request."
    );
  }

  if (!["EXPENSE", "INCOME"].includes(body.type)) {
    throw new TransactionValidationError(
      "Only EXPENSE and INCOME are supported for now."
    );
  }

  if (
    typeof body.accountId !== "string" ||
    !body.accountId.trim()
  ) {
    throw new TransactionValidationError(
      "A financial account is required."
    );
  }

  if (
    typeof body.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(body.idempotencyKey)
  ) {
    throw new TransactionValidationError(
      "A valid idempotency key is required."
    );
  }

  if (
    body.description !== undefined &&
    typeof body.description !== "string"
  ) {
    throw new TransactionValidationError(
      "Description must be text."
    );
  }

  const description = (body.description ?? "").trim();

  if (description.length > 250) {
    throw new TransactionValidationError(
      "Description cannot exceed 250 characters."
    );
  }

  return {
    type: body.type,
    accountId: body.accountId.trim(),
    amountCents: parseAmount(body.amount),
    effectiveDate: parseDate(body.date),
    description: description || null,
    idempotencyKey: body.idempotencyKey,
  };
}

/**
 * Record an expense or income transaction for the
 * authenticated user's personal workspace.
 */
export async function createTransaction(userId, body) {
  const input = validateInput(body);

  return prisma.$transaction(async (tx) => {
    // Find the user's workspace.
    const workspace = await tx.financialEntity.findUnique({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
        onboardingCompletedAt: true,
      },
    });

    if (!workspace?.onboardingCompletedAt) {
      throw new TransactionValidationError(
        "Complete workspace onboarding first.",
        409
      );
    }

    // Reject an already-used idempotency key.
    const existingEntry = await tx.journalEntry.findUnique({
      where: {
        entityId_idempotencyKey: {
          entityId: workspace.id,
          idempotencyKey: input.idempotencyKey,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingEntry) {
      throw new TransactionValidationError(
        "This transaction request has already been processed.",
        409
      );
    }

    // Only allow posting to an active financial account
    // belonging to the authenticated user's workspace.
    const account = await tx.financialAccount.findFirst({
      where: {
        id: input.accountId,
        entityId: workspace.id,
        isArchived: false,
      },
      select: {
        id: true,
        type: true,
        ledgerAccountId: true,
      },
    });

    if (!account) {
      throw new TransactionValidationError(
        "Financial account not found or is archived.",
        404
      );
    }

    // Receiving income into a credit card is not
    // the same as receiving income into an asset.
    if (
      input.type === "INCOME" &&
      account.type === "CREDIT_CARD"
    ) {
      throw new TransactionValidationError(
        "Income must be received into a checking, savings, or cash account."
      );
    }

    const isExpense = input.type === "EXPENSE";

    // Find or create the default income/expense
    // ledger account within the same transaction.
    const systemKey = isExpense
      ? "UNCATEGORIZED_EXPENSE"
      : "UNCATEGORIZED_INCOME";

    const categoryAccount = await tx.ledgerAccount.upsert({
      where: {
        entityId_systemKey: {
          entityId: workspace.id,
          systemKey,
        },
      },
      create: {
        entityId: workspace.id,
        name: isExpense
          ? "Uncategorized Expenses"
          : "Uncategorized Income",
        type: isExpense ? "EXPENSE" : "INCOME",
        systemKey,
        isSystem: true,
      },
      update: {},
    });

    // Expense:
    //   DEBIT  Expense
    //   CREDIT Financial account
    //
    // Income:
    //   DEBIT  Financial account
    //   CREDIT Income
    const lines = isExpense
      ? [
          {
            ledgerAccountId: categoryAccount.id,
            direction: "DEBIT",
            amountCents: input.amountCents,
          },
          {
            ledgerAccountId: account.ledgerAccountId,
            direction: "CREDIT",
            amountCents: input.amountCents,
          },
        ]
      : [
          {
            ledgerAccountId: account.ledgerAccountId,
            direction: "DEBIT",
            amountCents: input.amountCents,
          },
          {
            ledgerAccountId: categoryAccount.id,
            direction: "CREDIT",
            amountCents: input.amountCents,
          },
        ];

    // Post the balanced entry.
    const entry = await postJournalEntry(tx, {
      entityId: workspace.id,
      type: input.type,
      description: input.description,
      effectiveDate: input.effectiveDate,
      idempotencyKey: input.idempotencyKey,
      lines,
    });

    // BigInt values must be converted before JSON.
    return {
      id: entry.id,
      type: entry.type,
      description: entry.description,
      accountId: account.id,
      amountCents: input.amountCents.toString(),
      date: input.effectiveDate.toISOString().slice(0, 10),
      postedAt: entry.postedAt.toISOString(),
    };
  });
}
