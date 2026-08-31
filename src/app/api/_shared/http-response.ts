import { NextResponse } from "next/server";

export interface ApiSuccessEnvelope<T> {
  readonly data: T;
}

export interface ApiErrorDetail {
  readonly field?: string;
  readonly message: string;
}

export interface ApiErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ApiErrorDetail[];
  };
}

export function jsonSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessEnvelope<T>> {
  return NextResponse.json({ data }, { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 500,
  details?: readonly ApiErrorDetail[]
): NextResponse<ApiErrorEnvelope> {
  const payload: ApiErrorEnvelope = {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
  return NextResponse.json(payload, { status });
}