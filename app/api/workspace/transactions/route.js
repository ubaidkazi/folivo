
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../lib/auth";

import {
  createTransaction,
  TransactionValidationError,
} from "../../../lib/finance/transactions";

import {
  getTransactionHistory,
  TransactionHistoryError,
} from "../../../lib/finance/transaction-history";

/**
 * GET /api/workspace/transactions
 *
 * Retrieve authenticated user's transaction history.
 */
export async function GET(request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const history = await getTransactionHistory(
      session.user.id,
      request.nextUrl.searchParams
    );

    return NextResponse.json(history, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof TransactionHistoryError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error(
      "Transaction history retrieval failed:",
      error
    );

    return NextResponse.json(
      { error: "Failed to retrieve transactions." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/transactions
 *
 * Record a new financial transaction.
 */
export async function POST(request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  try {
    const transaction = await createTransaction(
      session.user.id,
      body
    );

    return NextResponse.json(
      {
        message: "Transaction recorded successfully.",
        transaction,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error: "This transaction request has already been processed or conflicts with an existing record.",
        },
        { status: 409 }
      );
    }

    console.error("Transaction posting failed:", error);

    return NextResponse.json(
      { error: "Failed to record transaction." },
      { status: 500 }
    );
  }
}
