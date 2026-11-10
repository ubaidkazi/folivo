
import "server-only";

import { prisma } from "../prisma";

const TRANSACTION_TYPES = [
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "CREDIT_CARD_PAYMENT",
];

export class TransactionHistoryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "TransactionHistoryError";
    this.status = status;
  }
}

function parsePositiveInteger(value, fallback, max, field) {
  if (value === null) return fallback;

  if (!/^[1-9]\d*$/.test(value)) {
    throw new TransactionHistoryError(
      `${field} must be a positive integer.`
    );
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number > max) {
    throw new TransactionHistoryError(
      `${field} cannot exceed ${max}.`
    );
  }

  return number;
}

function parseDate(value, field) {
  if (value === null) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TransactionHistoryError(
      `${field} must use YYYY-MM-DD format.`
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new TransactionHistoryError(
      `${field} is not a valid date.`
    );
  }

  return date;
}

function parseFilters(searchParams) {
  const page = parsePositiveInteger(
    searchParams.get("page"),
    1,
    10000,
    "page"
  );

  const pageSize = parsePositiveInteger(
    searchParams.get("pageSize"),
    20,
    100,
    "pageSize"
  );

  const type = searchParams.get("type") || "ALL";

  if (
    type !== "ALL" &&
    !TRANSACTION_TYPES.includes(type)
  ) {
    throw new TransactionHistoryError(
      "Invalid transaction type filter."
    );
  }

  const from = parseDate(
    searchParams.get("from"),
    "from"
  );

  const to = parseDate(
    searchParams.get("to"),
    "to"
  );

  if (from && to && from > to) {
    throw new TransactionHistoryError(
      "The start date cannot be after the end date."
    );
  }

  const rawAccountId = searchParams.get("accountId");
  const accountId = rawAccountId?.trim() ?? null;

  if (rawAccountId !== null && !accountId) {
    throw new TransactionHistoryError(
      "accountId cannot be empty."
    );
  }

  return {
    page,
    pageSize,
    type,
    from,
    to,
    accountId,
  };
}

function formatAccount(line) {
  if (!line) return null;

  const account = line.ledgerAccount.financialAccount;

  if (!account) return null;

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    isArchived: account.isArchived,
  };
}

/**
 * Convert an internal journal entry into a transaction
 * suitable for the frontend.
 *
 * Step 9 currently supports simple two-line entries.
 */
function mapJournalEntry(entry) {
  if (entry.lines.length !== 2) {
    throw new Error(
      `Unexpected journal structure for entry ${entry.id}.`
    );
  }

  const financialLines = entry.lines.filter(
    (line) => line.ledgerAccount.financialAccount
  );

  const findLine = (direction, accountType = null) =>
    financialLines.find(
      (line) =>
        line.direction === direction &&
        (
          accountType === null ||
          line.ledgerAccount.financialAccount.type === accountType
        )
    );

  let sourceLine = null;
  let destinationLine = null;

  switch (entry.type) {
    case "EXPENSE":
      // Expense: DR Expense, CR Asset/Liability.
      sourceLine = findLine("CREDIT");
      break;

    case "INCOME":
      // Income: DR Asset, CR Income.
      sourceLine = findLine("DEBIT");
      break;

    case "TRANSFER":
      // Transfer: DR Destination, CR Source.
      sourceLine = findLine("CREDIT");
      destinationLine = findLine("DEBIT");
      break;

    case "CREDIT_CARD_PAYMENT":
      // Payment: DR Card Liability, CR Source Asset.
      sourceLine = findLine("CREDIT");
      destinationLine = findLine(
        "DEBIT",
        "CREDIT_CARD"
      );
      break;

    default:
      throw new Error(
        `Unsupported transaction type: ${entry.type}`
      );
  }

  const requiresDestination =
    entry.type === "TRANSFER" ||
    entry.type === "CREDIT_CARD_PAYMENT";

  if (
    !sourceLine ||
    (requiresDestination && !destinationLine)
  ) {
    throw new Error(
      `Invalid financial account mapping for entry ${entry.id}.`
    );
  }

  // Every currently supported transaction has two
  // equal-value journal lines.
  if (
    entry.lines[0].amountCents <= 0n ||
    entry.lines[0].amountCents !== entry.lines[1].amountCents
  ) {
    throw new Error(
      `Invalid journal amounts for entry ${entry.id}.`
    );
  }

  return {
    id: entry.id,
    type: entry.type,
    description: entry.description,
    amountCents: sourceLine.amountCents.toString(),
    date: entry.effectiveDate.toISOString().slice(0, 10),
    postedAt: entry.postedAt.toISOString(),
    account: formatAccount(sourceLine),
    destinationAccount: formatAccount(destinationLine),
  };
}

/**
 * Retrieve a paginated transaction history for the
 * authenticated user's personal workspace.
 */
export async function getTransactionHistory(
  userId,
  searchParams
) {
  const filters = parseFilters(searchParams);

  // Resolve the workspace from the authenticated user,
  // never from a client-provided workspace ID.
  const workspace = await prisma.financialEntity.findUnique({
    where: {
      ownerId: userId,
    },
    select: {
      id: true,
      onboardingCompletedAt: true,
    },
  });

  if (!workspace?.onboardingCompletedAt) {
    throw new TransactionHistoryError(
      "A completed financial workspace is required.",
      404
    );
  }

  let accountLedgerId = null;

  if (filters.accountId) {
    // Archived accounts remain valid history filters.
    const account = await prisma.financialAccount.findFirst({
      where: {
        id: filters.accountId,
        entityId: workspace.id,
      },
      select: {
        ledgerAccountId: true,
      },
    });

    if (!account) {
      throw new TransactionHistoryError(
        "Financial account not found.",
        404
      );
    }

    accountLedgerId = account.ledgerAccountId;
  }

  const where = {
    entityId: workspace.id,

    type:
      filters.type === "ALL"
        ? { in: TRANSACTION_TYPES }
        : filters.type,

    ...(filters.from || filters.to
      ? {
          effectiveDate: {
            ...(filters.from
              ? { gte: filters.from }
              : {}),
            ...(filters.to
              ? { lte: filters.to }
              : {}),
          },
        }
      : {}),

    ...(accountLedgerId
      ? {
          lines: {
            some: {
              ledgerAccountId: accountLedgerId,
            },
          },
        }
      : {}),
  };

  const [total, entries] = await Promise.all([
    prisma.journalEntry.count({
      where,
    }),

    prisma.journalEntry.findMany({
      where,

      // Recently posted entries appear first.
      // ID provides a stable tie-breaker.
      orderBy: [
        { postedAt: "desc" },
        { id: "desc" },
      ],

      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,

      select: {
        id: true,
        type: true,
        description: true,
        effectiveDate: true,
        postedAt: true,

        lines: {
          select: {
            direction: true,
            amountCents: true,

            ledgerAccount: {
              select: {
                financialAccount: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    isArchived: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(
    total / filters.pageSize
  );

  return {
    transactions: entries.map(mapJournalEntry),

    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
      hasPreviousPage: filters.page > 1 && total > 0,
    },
  };
}
