import { NextResponse } from "next/server";
import { getApplicationContainer } from "@/infrastructure";

export async function GET(): Promise<NextResponse> {
  try {
    const container = getApplicationContainer();
    const result = container.checkReadiness();

    if (result.ready) {
      return NextResponse.json(
        { status: "ready", database: "ready" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { status: "unready", database: "error" },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      { status: "unready", database: "error" },
      { status: 503 }
    );
  }
}