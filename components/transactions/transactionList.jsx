
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  ReceiptText,
} from "lucide-react";

const TYPE_CONFIG = {
  EXPENSE: {
    label: "Expense",
    title: "Expense",
    icon: ArrowUpRight,
  },
  INCOME: {
    label: "Income",
    title: "Income",
    icon: ArrowDownLeft,
  },
  TRANSFER: {
    label: "Transfer",
    title: "Account Transfer",
    icon: ArrowLeftRight,
  },
  CREDIT_CARD_PAYMENT: {
    label: "Card Payment",
    title: "Credit Card Payment",
    icon: CreditCard,
  },
};

function formatMoney(centsValue) {
  const cents = BigInt(centsValue);
  const absolute = cents < 0n ? -cents : cents;

  const dollars = new Intl.NumberFormat("en-US").format(
    absolute / 100n
  );

  const fraction = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  return `$${dollars}.${fraction}`;
}

function formatDate(dateString) {
  // Date-only values must not shift with the viewer's timezone.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateString}T00:00:00.000Z`));
}

function getAccountDescription(transaction) {
  const source = transaction.account;
  const destination = transaction.destinationAccount;

  switch (transaction.type) {
    case "INCOME":
      return source
        ? `Received into ${source.name}`
        : "Income received";

    case "EXPENSE":
      return source
        ? `Paid with ${source.name}`
        : "Expense recorded";

    case "TRANSFER":
      return `${source?.name ?? "Account"} → ${
        destination?.name ?? "Account"
      }`;

    case "CREDIT_CARD_PAYMENT":
      return `${source?.name ?? "Account"} → ${
        destination?.name ?? "Credit Card"
      }`;

    default:
      return "Financial transaction";
  }
}

function getAmountDisplay(transaction) {
  const amount = formatMoney(transaction.amountCents);

  switch (transaction.type) {
    case "INCOME":
      return `+${amount}`;

    case "EXPENSE":
      return `−${amount}`;

    // Transfers and card payments are not spending.
    // Display their amount without a positive/negative sign.
    default:
      return amount;
  }
}

export default function TransactionList({
  transactions,
  compact = false,
}) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-muted-foreground">
          <ReceiptText size={23} />
        </div>

        <h3 className="mt-4 text-sm font-semibold">
          No transactions found
        </h3>

        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Your recorded transactions will appear here.
          Try changing your filters if you're looking
          for an existing transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((transaction) => {
        const config =
          TYPE_CONFIG[transaction.type] ?? {
            label: transaction.type,
            title: "Transaction",
            icon: ReceiptText,
          };

        const Icon = config.icon;

        return (
          <article
            key={transaction.id}
            className="flex items-center gap-3 py-4 sm:gap-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary sm:h-11 sm:w-11">
              <Icon size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {transaction.description || config.title}
              </p>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {getAccountDescription(transaction)}
              </p>

              {!compact && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {config.label}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p
                className={`text-sm font-semibold tabular-nums sm:text-base ${
                  transaction.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {getAmountDisplay(transaction)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(transaction.date)}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
