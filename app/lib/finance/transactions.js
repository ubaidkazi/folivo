
import "server-only";

import { prisma } from "../prisma";
import { postJournalEntry } from "./ledger";

const MAX_AMOUNT_CENTS = 99999999999n;

const SUPPORTED_TYPES = new Set([
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "CREDIT_CARD_PAYMENT",
]);

const ASSET_ACCOUNT_TYPES = new Set([
  "CHECKING",
  "SAVINGS",
  "CASH",
]);

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
      "Enter a valid USD amount with up to two decimals."
    );
  }

  const [dollars, fraction = ""] = amount.split(".");

  const cents =
    BigInt(dollars) * 100n +
    BigInt(fraction.padEnd(2, "0") || "0");

  if (cents <= 0n || cents > MAX_AMOUNT_CENTS) {
    throw new TransactionValidationError(
      "Amount must be greater than zero and within the allowed limit."
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

  if (!SUPPORTED_TYPES.has(body.type)) {
    throw new TransactionValidationError(
      "Unsupported transaction type."
    );
  }

  if (
    typeof body.accountId !== "string" ||
    !body.accountId.trim()
  ) {
    throw new TransactionValidationError(
      "A source financial account is required."
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

  const needsDestination =
    body.type === "TRANSFER" ||
    body.type === "CREDIT_CARD_PAYMENT";

  let destinationAccountId = null;

  if (needsDestination) {
    if (
      typeof body.destinationAccountId !== "string" ||
      !body.destinationAccountId.trim()
    ) {
      throw new TransactionValidationError(
        "A destination account is required."
      );
    }

    destinationAccountId = body.destinationAccountId.trim();

    if (destinationAccountId === body.accountId.trim()) {
      throw new TransactionValidationError(
        "Source and destination accounts must be different."
      );
    }
  } else if (body.destinationAccountId != null) {
    throw new TransactionValidationError(
      "This transaction type does not accept a destination account."
    );
  }

  return {
    type: body.type,
    accountId: body.accountId.trim(),
    destinationAccountId,
    amountCents: parseAmount(body.amount),
    effectiveDate: parseDate(body.date),
    description: description || null,
    idempotencyKey: body.idempotencyKey,
  };
}

/**
 * Look up an active account within the user's workspace.
 */
async function getActiveAccount(tx, entityId, accountId) {
  const account = await tx.financialAccount.findFirst({
    where: {
      id: accountId,
      entityId,
      isArchived: false,
    },
    select: {
      id: true,
      name: true,
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

  return account;
}

/**
 * Find or create the internal income/expense ledger account.
 */
async function getCategoryLedgerAccount(tx, entityId, type) {
  const isExpense = type === "EXPENSE";

  const systemKey = isExpense
    ? "UNCATEGORIZED_EXPENSE"
    : "UNCATEGORIZED_INCOME";

  return tx.ledgerAccount.upsert({
    where: {
      entityId_systemKey: {
        entityId,
        systemKey,
      },
    },
    create: {
      entityId,
      name: isExpense
        ? "Uncategorized Expenses"
        : "Uncategorized Income",
      type: isExpense ? "EXPENSE" : "INCOME",
      systemKey,
      isSystem: true,
    },
    update: {},
  });
}

/**
 * Create the debit/credit lines for a transaction.
 * Clients never choose ledger directions themselves.
 */
async function buildJournalLines(
  tx,
  entityId,
  input,
  sourceAccount,
  destinationAccount
) {
  const amountCents = input.amountCents;

  switch (input.type) {
    case "EXPENSE": {
      const expenseAccount = await getCategoryLedgerAccount(
        tx,
        entityId,
        "EXPENSE"
      );

      // DR Expense
      // CR Asset or Credit Card Liability
      return [
        {
          ledgerAccountId: expenseAccount.id,
          direction: "DEBIT",
          amountCents,
        },
        {
          ledgerAccountId: sourceAccount.ledgerAccountId,
          direction: "CREDIT",
          amountCents,
        },
      ];
    }

    case "INCOME": {
      if (!ASSET_ACCOUNT_TYPES.has(sourceAccount.type)) {
        throw new TransactionValidationError(
          "Income must be received into checking, savings, or cash."
        );
      }

      const incomeAccount = await getCategoryLedgerAccount(
        tx,
        entityId,
        "INCOME"
      );

      // DR Asset
      // CR Income
      return [
        {
          ledgerAccountId: sourceAccount.ledgerAccountId,
          direction: "DEBIT",
          amountCents,
        },
        {
          ledgerAccountId: incomeAccount.id,
          direction: "CREDIT",
          amountCents,
        },
      ];
    }

    case "TRANSFER": {
      if (
        !ASSET_ACCOUNT_TYPES.has(sourceAccount.type) ||
        !ASSET_ACCOUNT_TYPES.has(destinationAccount.type)
      ) {
        throw new TransactionValidationError(
          "Transfers must be between checking, savings, or cash accounts."
        );
      }

      // DR Destination Asset
      // CR Source Asset
      return [
        {
          ledgerAccountId: destinationAccount.ledgerAccountId,
          direction: "DEBIT",
          amountCents,
        },
        {
          ledgerAccountId: sourceAccount.ledgerAccountId,
          direction: "CREDIT",
          amountCents,
        },
      ];
    }

    case "CREDIT_CARD_PAYMENT": {
      if (!ASSET_ACCOUNT_TYPES.has(sourceAccount.type)) {
        throw new TransactionValidationError(
          "Credit card payments must come from checking, savings, or cash."
        );
      }

      if (destinationAccount.type !== "CREDIT_CARD") {
        throw new TransactionValidationError(
          "The payment destination must be a credit card."
        );
      }

      // DR Credit Card Liability
      // CR Source Asset
      return [
        {
          ledgerAccountId: destinationAccount.ledgerAccountId,
          direction: "DEBIT",
          amountCents,
        },
        {
          ledgerAccountId: sourceAccount.ledgerAccountId,
          direction: "CREDIT",
          amountCents,
        },
      ];
    }

    default:
      throw new TransactionValidationError(
        "Unsupported transaction type."
      );
  }
}

/**
 * Record a financial transaction for the authenticated user.
 *
 * Supported:
 * - EXPENSE
 * - INCOME
 * - TRANSFER
 * - CREDIT_CARD_PAYMENT
 */
export async function createTransaction(userId, body) {
  const input = validateInput(body);

  return prisma.$transaction(async (tx) => {
    // 1. Identify the user's financial workspace.
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

    // 2. Check for a previously processed request.
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

    // 3. Validate the source account and ownership.
    const sourceAccount = await getActiveAccount(
      tx,
      workspace.id,
      input.accountId
    );

    // 4. Validate the destination when required.
    let destinationAccount = null;

    if (input.destinationAccountId) {
      destinationAccount = await getActiveAccount(
        tx,
        workspace.id,
        input.destinationAccountId
      );
    }

    // 5. Apply the accounting rules.
    const lines = await buildJournalLines(
      tx,
      workspace.id,
      input,
      sourceAccount,
      destinationAccount
    );

    // 6. Post the balanced journal entry atomically.
    const entry = await postJournalEntry(tx, {
      entityId: workspace.id,
      type: input.type,
      description: input.description,
      effectiveDate: input.effectiveDate,
      idempotencyKey: input.idempotencyKey,
      lines,
    });

    // 7. Return JSON-safe transaction details.
    return {
      id: entry.id,
      type: entry.type,
      description: entry.description,
      accountId: sourceAccount.id,
      destinationAccountId: destinationAccount?.id ?? null,
      amountCents: input.amountCents.toString(),
      date: input.effectiveDate.toISOString().slice(0, 10),
      postedAt: entry.postedAt.toISOString(),
    };
  });
}
