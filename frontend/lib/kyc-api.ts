export type KycStatus =
  | "Not Started"
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Correction Required"
  | "Verified"
  | "Rejected";

export type KycUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "student" | "admin";
};

export type KycDocument = {
  id: string;
  type: string;
  educationId: string;
  originalName: string;
  bytes: number;
  uploadedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewerId?: { name: string; email: string } | string | null;
  comments: string;
};

export type EducationRecord = {
  recordId: string;
  level: string;
  institution: string;
  board: string;
  registrationNumber: string;
  symbolNumber: string;
  passedYear: string;
  gpa: string;
  major: string;
};

export type KycProfile = {
  id: string;
  student?: { id: string; name: string; email: string; phone: string } | null;
  personal: Record<string, string>;
  citizenship: Record<string, string>;
  birthCertificate: Record<string, string>;
  education: EducationRecord[];
  documents: KycDocument[];
  status: KycStatus;
  submittedAt: string | null;
  verifiedAt: string | null;
  verifiedBy?: { name: string; email: string } | string | null;
  feedback: string[];
  internalNotes?: { text: string; authorId: KycUser | string; createdAt: string }[];
  history?: { action: string; status: string; comment: string; actorId: KycUser | string; createdAt: string }[];
  completion: { percentage: number; completed: number; total: number; missing: string[] };
  createdAt: string;
  updatedAt: string;
};

export type GeneratedDocument = {
  _id: string;
  type: string;
  label: string;
  createdAt: string;
};

export type ApiError = Error & { missing?: string[] };

const API_BASE = process.env.NEXT_PUBLIC_KYC_API_URL || "http://localhost:5000";

export async function kycApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const error = new Error(
      typeof payload.error === "string" ? payload.error : "The request could not be completed.",
    ) as ApiError;
    if (Array.isArray(payload.missing)) error.missing = payload.missing as string[];
    throw error;
  }
  return payload as T;
}

export function documentDownloadUrl(path: string) {
  return `${API_BASE}${path}`;
}
