
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "../../../lib/auth";
import { getFinancialSummary } from "../../../lib/finance/summary";

export async function GET() {
  // 1. Authenticate the request.
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
    // 2. Calculate the user's financial summary.
    const summary = await getFinancialSummary(session.user.id);

    if (!summary) {
      return NextResponse.json(
        {
          error: "A completed financial workspace is required.",
        },
        { status: 404 }
      );
    }

    // 3. Return the calculated financial information.
    return NextResponse.json(summary, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Financial summary calculation failed:", error);

    return NextResponse.json(
      { error: "Failed to calculate financial summary." },
      { status: 500 }
    );
  }
}
