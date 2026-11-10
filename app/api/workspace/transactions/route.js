
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../lib/auth";
import {
  createTransaction,
  TransactionValidationError,
} from "../../../lib/finance/transactions";

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

    // Prisma unique constraint: protects against
    // concurrent requests with the same idempotency key.
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
