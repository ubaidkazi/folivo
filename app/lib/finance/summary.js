
import "server-only";

import { prisma } from "../prisma";

/**
 * Calculate the user's financial position from
 * posted journal lines.
 *
 * No editable account balances are stored.
 * All monetary values use BigInt cents internally.
 */
export async function getFinancialSummary(userId) {
  // 1. Find the authenticated user's workspace.
  const workspace = await prisma.financialEntity.findUnique({
    where: {
      ownerId: userId,
    },
    select: {
      id: true,
      name: true,
      currency: true,
      onboardingCompletedAt: true,
      financialAccounts: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          name: true,
          type: true,
          isArchived: true,
          ledgerAccountId: true,
          ledgerAccount: {
            select: {
              type: true,
            },
          },
        },
      },
    },
  });

  if (!workspace || !workspace.onboardingCompletedAt) {
    return null;
  }

  // 2. Collect the ledger account IDs belonging
  // to the user's financial accounts.
  const ledgerAccountIds = workspace.financialAccounts.map(
    (account) => account.ledgerAccountId
  );

  // 3. Sum journal lines by account and direction.
  // The database performs the aggregation.
  const groupedLines = ledgerAccountIds.length
    ? await prisma.journalLine.groupBy({
        by: ["ledgerAccountId", "direction"],
        where: {
          ledgerAccountId: {
            in: ledgerAccountIds,
          },
          journalEntry: {
            is: {
              entityId: workspace.id,
            },
          },
        },
        _sum: {
          amountCents: true,
        },
      })
    : [];

  // 4. Build a lookup containing debit/credit totals.
  const ledgerTotals = new Map();

  for (const line of groupedLines) {
    const totals = ledgerTotals.get(line.ledgerAccountId) ?? {
      debit: 0n,
      credit: 0n,
    };

    const amount = line._sum.amountCents ?? 0n;

    if (line.direction === "DEBIT") {
      totals.debit += amount;
    } else {
      totals.credit += amount;
    }

    ledgerTotals.set(line.ledgerAccountId, totals);
  }

  // 5. Calculate each financial account's balance.
  let totalAssets = 0n;
  let totalLiabilities = 0n;

  const accounts = workspace.financialAccounts.map((account) => {
    const totals = ledgerTotals.get(account.ledgerAccountId) ?? {
      debit: 0n,
      credit: 0n,
    };

    const isLiability = account.ledgerAccount.type === "LIABILITY";

    const balance = isLiability
      ? totals.credit - totals.debit
      : totals.debit - totals.credit;

    if (isLiability) {
      totalLiabilities += balance;
    } else {
      totalAssets += balance;
    }

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      isArchived: account.isArchived,
      balanceCents: balance.toString(),
    };
  });

  // 6. Net worth = assets - liabilities.
  const netWorth = totalAssets - totalLiabilities;

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      currency: workspace.currency,
    },
    accounts,
    totals: {
      assetsCents: totalAssets.toString(),
      liabilitiesCents: totalLiabilities.toString(),
      netWorthCents: netWorth.toString(),
    },
  };
}
