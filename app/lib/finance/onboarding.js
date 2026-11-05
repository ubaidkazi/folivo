
import "server-only";

import { prisma } from "../prisma";

const ALLOWED_ACCOUNT_TYPES = new Set([
  "CHECKING",
  "SAVINGS",
  "CASH",
  "CREDIT_CARD",
]);

const MAX_ACCOUNTS = 20;
const MAX_AMOUNT_CENTS = 99999999999n;

export class OnboardingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "OnboardingValidationError";
  }
}

function validateText(value, label, maxLength = 80) {
  if (typeof value !== "string") {
    throw new OnboardingValidationError(`${label} is required.`);
  }

  const text = value.trim();

  if (!text || text.length > maxLength) {
    throw new OnboardingValidationError(
      `${label} must contain 1–${maxLength} characters.`
    );
  }

  return text;
}

// Convert user-entered USD amounts directly into integer cents.
// Never use floating-point arithmetic for stored money.
function parseAmountCents(value) {
  if (typeof value !== "string") {
    throw new OnboardingValidationError(
      "Opening balances must be decimal strings."
    );
  }

  const amount = value.trim();

  // An empty opening balance means zero.
  if (amount === "") return 0n;

  if (!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount)) {
    throw new OnboardingValidationError(
      "Enter a valid non-negative USD amount with up to 2 decimals."
    );
  }
  const [dollars, fraction = ""] = amount.split(".");

  const cents =
    BigInt(dollars) * 100n +
    BigInt(fraction.padEnd(2, "0") || "0");

  if (cents > MAX_AMOUNT_CENTS) {
    throw new OnboardingValidationError(
      "Opening balance exceeds the allowed limit."
    );
  }

  return cents;
}

function parseOpeningDate(value) {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new OnboardingValidationError(
      "Opening date must use YYYY-MM-DD format."
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new OnboardingValidationError(
      "Opening date is invalid."
    );
  }

  return date;
}

function validateTimeZone(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new OnboardingValidationError(
      "A time zone is required."
    );
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });

    return value;
  } catch {
    throw new OnboardingValidationError(
      "Invalid time zone."
    );
  }
}

export function validateOnboardingInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new OnboardingValidationError(
      "Invalid onboarding request."
    );
  }

  const name = validateText(body.name, "Workspace name");

  if (body.currency !== "USD") {
    throw new OnboardingValidationError(
      "Folivo currently supports USD only."
    );
  }

  const timeZone = validateTimeZone(body.timeZone);
  const openingDate = parseOpeningDate(body.openingDate);

  if (!Array.isArray(body.accounts) ||
      body.accounts.length > MAX_ACCOUNTS) {
    throw new OnboardingValidationError(
      `Accounts must be an array of at most ${MAX_ACCOUNTS} items.`
    );
  }

  const names = new Set();

  const accounts = body.accounts.map((account, index) => {
    if (!account || typeof account !== "object" ||
        Array.isArray(account)) {
      throw new OnboardingValidationError(
        `Account ${index + 1} is invalid.`
      );
    }

    const accountName = validateText(
      account.name,
      `Account ${index + 1} name`
    );

    if (!ALLOWED_ACCOUNT_TYPES.has(account.type)) {
      throw new OnboardingValidationError(
        `Unsupported account type: ${account.type}`
      );
    }

    const normalizedName = accountName.toLowerCase();

    if (names.has(normalizedName)) {
      throw new OnboardingValidationError(
        "Account names must be unique within the workspace."
      );
    }

    names.add(normalizedName);

    return {
      name: accountName,
      type: account.type,
      openingBalanceCents: parseAmountCents(
        account.openingBalance
      ),
    };
  });

  return {
    name,
    currency: "USD",
    timeZone,
    openingDate,
    accounts,
  };
}

export async function createPersonalWorkspace(userId, input) {
  return prisma.$transaction(async (tx) => {
    // One personal workspace per user.
    // The ownerId unique constraint also protects against races.
    const existing = await tx.financialEntity.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (existing) {
      throw new OnboardingValidationError(
        "You already have a financial workspace."
      );
    }

    // 1. Create workspace.
    const entity = await tx.financialEntity.create({
      data: {
        ownerId: userId,
        name: input.name,
        currency: input.currency,
        timeZone: input.timeZone,
      },
    });

    // 2. Create internal opening equity account.
    const openingEquity = await tx.ledgerAccount.create({
      data: {
        entityId: entity.id,
        name: "Opening Balance Equity",
        type: "EQUITY",
        systemKey: "OPENING_EQUITY",
        isSystem: true,
      },
    });

    const createdAccounts = [];

    // 3. Create each selected account.
    for (const account of input.accounts) {
      const isLiability = account.type === "CREDIT_CARD";

      const ledgerAccount = await tx.ledgerAccount.create({
        data: {
          entityId: entity.id,
          name: account.name,
          type: isLiability ? "LIABILITY" : "ASSET",
          isSystem: false,
        },
      });

      const financialAccount = await tx.financialAccount.create({
        data: {
          entityId: entity.id,
          name: account.name,
          type: account.type,
          ledgerAccountId: ledgerAccount.id,
        },
      });

      const amount = account.openingBalanceCents;

      // Zero balances require no journal entry.
      if (amount > 0n) {
        const lines = isLiability
          ? [
              {
                ledgerAccountId: openingEquity.id,
                direction: "DEBIT",
                amountCents: amount,
              },
              {
                ledgerAccountId: ledgerAccount.id,
                direction: "CREDIT",
                amountCents: amount,
              },
            ]
          : [
              {
                ledgerAccountId: ledgerAccount.id,
                direction: "DEBIT",
                amountCents: amount,
              },
              {
                ledgerAccountId: openingEquity.id,
                direction: "CREDIT",
                amountCents: amount,
              },
            ];

        // Each opening entry contains one debit and one
        // credit of the same exact amount.
        await tx.journalEntry.create({
          data: {
            entityId: entity.id,
            type: "OPENING_BALANCE",
            description: `Opening balance: ${account.name}`,
            effectiveDate: input.openingDate,
            idempotencyKey: `opening:${financialAccount.id}`,
            lines: {
              create: lines,
            },
          },
        });
      }

      createdAccounts.push({
        id: financialAccount.id,
        name: financialAccount.name,
        type: financialAccount.type,
        openingBalanceCents: amount.toString(),
      });
    }

    // 4. Complete onboarding only after all records exist.
    const completedEntity = await tx.financialEntity.update({
      where: { id: entity.id },
      data: {
        onboardingCompletedAt: new Date(),
      },
    });

    return {
      id: completedEntity.id,
      name: completedEntity.name,
      currency: completedEntity.currency,
      timeZone: completedEntity.timeZone,
      onboardingCompletedAt:
        completedEntity.onboardingCompletedAt,
      accounts: createdAccounts,
    };
  });
}
