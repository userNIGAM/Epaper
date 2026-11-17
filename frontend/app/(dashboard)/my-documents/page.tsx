"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  documentDownloadUrl,
  EducationRecord,
  GeneratedDocument,
  KycDocument,
  KycProfile,
  KycStatus,
  KycUser,
  kycApi,
} from "@/lib/kyc-api";

type Field = {
  key: string;
  label: string;
  type?: "date" | "email" | "tel" | "select";
  optional?: boolean;
  options?: string[];
};
type GroupName = "personal" | "citizenship" | "birthCertificate";

const steps = ["Personal information", "Citizenship", "Birth certificate", "Education"];
const statusColor: Record<KycStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-700",
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-blue-50 text-blue-700",
  "Under Review": "bg-amber-50 text-amber-800",
  "Correction Required": "bg-orange-50 text-orange-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

const personalFields: Field[] = [
  { key: "fullName", label: "Full name (as per citizenship)" },
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name", optional: true },
  { key: "lastName", label: "Last name" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Other"] },
  { key: "nationality", label: "Nationality" },
  { key: "fatherName", label: "Father’s name" },
  { key: "motherName", label: "Mother’s name" },
  { key: "grandfatherName", label: "Grandfather’s name" },
  { key: "maritalStatus", label: "Marital status", type: "select", options: ["Single", "Married", "Divorced", "Widowed"] },
  { key: "phone", label: "Contact number", type: "tel" },
  { key: "email", label: "Email address", type: "email" },
  { key: "permanentAddress", label: "Permanent address" },
  { key: "temporaryAddress", label: "Temporary address" },
  { key: "district", label: "District" },
  { key: "municipality", label: "Municipality" },
  { key: "wardNumber", label: "Ward number" },
  { key: "passportNumber", label: "Passport number", optional: true },
  { key: "passportIssueDate", label: "Passport issue date", type: "date", optional: true },
  { key: "passportExpiryDate", label: "Passport expiry date", type: "date", optional: true },
];

const citizenshipFields: Field[] = [
  { key: "number", label: "Citizenship number" },
  { key: "issueDate", label: "Citizenship issue date", type: "date" },
  { key: "issueDistrict", label: "Issue district" },
  { key: "issueOffice", label: "Issue office" },
  { key: "fullName", label: "Citizenship holder’s full name" },
  { key: "dateOfBirth", label: "Citizenship holder’s date of birth", type: "date" },
];

const birthFields: Field[] = [
  { key: "registrationNumber", label: "Birth registration number" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "district", label: "Birth registration district" },
  { key: "municipality", label: "Birth registration municipality" },
];

const educationFields: Field[] = [
  { key: "level", label: "Education level" },
  { key: "institution", label: "Institution name" },
  { key: "board", label: "Board / University" },
  { key: "registrationNumber", label: "Registration number" },
  { key: "symbolNumber", label: "Symbol number" },
  { key: "passedYear", label: "Passed year" },
  { key: "gpa", label: "GPA / Percentage" },
  { key: "major", label: "Major / Faculty" },
];

function emptyProfile(): KycProfile {
  return {
    id: "",
    personal: {},
    citizenship: {},
    birthCertificate: {},
    education: [],
    documents: [],
    status: "Not Started",
    submittedAt: null,
    verifiedAt: null,
    feedback: [],
    completion: { percentage: 0, completed: 0, total: 6, missing: [] },
    createdAt: "",
    updatedAt: "",
  };
}

function FieldGrid({
  fields,
  values,
  onChange,
  disabled,
}: {
  fields: Field[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.key} className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            {field.label}
            {field.optional && <span className="ml-1 text-slate-400">(optional)</span>}
          </span>
          {field.type === "select" ? (
            <select
              value={values[field.key] || ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              disabled={disabled}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            >
              <option value="">Select</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || "text"}
              value={values[field.key] || ""}
              onChange={(event) => onChange(field.key, event.target.value)}
              disabled={disabled}
              maxLength={field.key === "email" ? 254 : 240}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          )}
        </label>
      ))}
    </div>
  );
}

function DocumentUpload({
  label,
  type,
  educationId,
  documents,
  disabled,
  uploading,
  onUpload,
  onDelete,
}: {
  label: string;
  type: string;
  educationId?: string;
  documents: KycDocument[];
  disabled: boolean;
  uploading: string | null;
  onUpload: (file: File, type: string, educationId?: string) => void;
  onDelete: (document: KycDocument) => void;
}) {
  const matching = documents
    .filter((document) => document.type === type && document.educationId === (educationId || ""))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  const inputId = `${type}-${educationId || "profile"}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
          <p className="mt-1 text-xs text-slate-500">PDF, JPG, JPEG, or PNG · up to 10 MB</p>
        </div>
        {!disabled && (
          <label
            htmlFor={inputId}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) onUpload(file, type, educationId);
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            {uploading === inputId ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{uploading === inputId ? "Uploading" : "Choose / drop"}</span>
            <input
              id={inputId}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="sr-only"
              disabled={uploading === inputId}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file, type, educationId);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {matching.map((document) => (
          <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              {/\.(jpe?g|png)$/i.test(document.originalName) ? (
                <Image
                  src={documentDownloadUrl(`/api/kyc/documents/${document.id}/download`)}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : <FileText size={17} className="shrink-0 text-slate-500" />}
              <a
                href={documentDownloadUrl(`/api/kyc/documents/${document.id}/download`)}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-blue-700 underline-offset-2 hover:underline"
              >
                {document.originalName}
              </a>
              <span className="hidden text-xs text-slate-400 sm:inline">
                {(document.bytes / (1024 * 1024)).toFixed(1)} MB
              </span>
              <a
                href={documentDownloadUrl(`/api/kyc/documents/${document.id}/download?download=1`)}
                className="text-xs font-semibold text-slate-600 hover:text-blue-700"
              >
                Download
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                document.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                  document.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
              }`}>{document.status}</span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${document.originalName}`}
                  onClick={() => onDelete(document)}
                  className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        {matching.length === 0 && <p className="text-xs text-slate-400">No file uploaded yet.</p>}
      </div>
    </div>
  );
}

export default function MyDocumentsPage() {
  const [user, setUser] = useState<KycUser | null>(null);
  const [profile, setProfile] = useState<KycProfile>(emptyProfile);
  const [generated, setGenerated] = useState<GeneratedDocument[]>([]);
  const [ready, setReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [auth, setAuth] = useState({ name: "", phone: "", email: "", password: "" });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editable = ["Not Started", "Draft", "Correction Required", "Rejected"].includes(profile.status);
  const progress = useMemo(() => profile.completion?.percentage || 0, [profile.completion?.percentage]);

  useEffect(() => {
    let active = true;
    kycApi<{ user: KycUser }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (!active) return;
        if (currentUser.role === "student") setUser(currentUser);
        else setError("Use the administrator KYC page to review student profiles.");
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    let active = true;
    Promise.all([
      kycApi<{ kyc: KycProfile }>("/api/kyc/me"),
      kycApi<{ documents: GeneratedDocument[] }>("/api/kyc/generated-documents"),
    ])
      .then(([{ kyc }, { documents }]) => {
        if (!active) return;
        setProfile({
          ...kyc,
          personal: {
            ...kyc.personal,
            email: kyc.personal.email || user.email,
            phone: kyc.personal.phone || user.phone,
            fullName: kyc.personal.fullName || user.name,
          },
        });
        setGenerated(documents);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      });
    return () => { active = false; };
  }, [user]);

  const updateGroup = (group: GroupName, key: string, value: string) => {
    setProfile((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
  };

  const saveDraft = async (advance = false) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { kyc } = await kycApi<{ kyc: KycProfile }>("/api/kyc/me", {
        method: "PUT",
        body: JSON.stringify({
          personal: profile.personal,
          citizenship: profile.citizenship,
          birthCertificate: profile.birthCertificate,
          education: profile.education,
        }),
      });
      setProfile((current) => ({
        ...kyc,
        personal: {
          ...kyc.personal,
          email: kyc.personal.email || current.personal.email || "",
          phone: kyc.personal.phone || current.personal.phone || "",
          fullName: kyc.personal.fullName || current.personal.fullName || "",
        },
        documents: current.documents,
      }));
      setNotice("Your KYC progress has been saved.");
      if (advance) setStep((current) => Math.min(steps.length - 1, current + 1));
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uploadDocument = async (file: File, type: string, educationId?: string) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Each document must be no larger than 10 MB.");
      return;
    }
    const key = `${type}-${educationId || "profile"}`;
    setUploading(key);
    setError("");
    setNotice("");
    try {
      const { kyc } = await kycApi<{ kyc: KycProfile }>("/api/kyc/me", {
        method: "PUT",
        body: JSON.stringify({
          personal: profile.personal,
          citizenship: profile.citizenship,
          birthCertificate: profile.birthCertificate,
          education: profile.education,
        }),
      });
      setProfile((current) => ({ ...current, ...kyc, documents: current.documents }));
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", type);
      if (educationId) formData.set("educationId", educationId);
      const { document, completion } = await kycApi<{ document: KycDocument; completion: KycProfile["completion"] }>("/api/kyc/documents/upload", {
        method: "POST",
        body: formData,
      });
      setProfile((current) => ({ ...current, documents: [...current.documents, document], completion }));
      setNotice(`${file.name} uploaded securely.`);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const deleteDocument = async (document: KycDocument) => {
    setError("");
    try {
      const { completion } = await kycApi<{ completion: KycProfile["completion"] }>(`/api/kyc/documents/${document.id}`, { method: "DELETE" });
      setProfile((current) => ({
        ...current,
        documents: current.documents.filter((entry) => entry.id !== document.id),
        completion,
      }));
      setNotice("Document removed.");
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const updateEducation = (recordId: string, key: string, value: string) => {
    setProfile((current) => ({
      ...current,
      education: current.education.map((record) =>
        record.recordId === recordId ? { ...record, [key]: value } : record,
      ),
    }));
  };

  const addEducation = () => {
    const record: EducationRecord = {
      recordId: crypto.randomUUID(),
      level: "",
      institution: "",
      board: "",
      registrationNumber: "",
      symbolNumber: "",
      passedYear: "",
      gpa: "",
      major: "",
    };
    setProfile((current) => ({ ...current, education: [...current.education, record] }));
  };

  const removeEducation = async (recordId: string) => {
    const relatedDocuments = profile.documents.filter((document) => document.educationId === recordId);
    if (relatedDocuments.length && !window.confirm("Remove this qualification and its uploaded documents?")) return;
    setError("");
    try {
      for (const document of relatedDocuments) {
        const { completion } = await kycApi<{ completion: KycProfile["completion"] }>(`/api/kyc/documents/${document.id}`, { method: "DELETE" });
        setProfile((current) => ({
          ...current,
          documents: current.documents.filter((entry) => entry.id !== document.id),
          completion,
        }));
      }
      setProfile((current) => ({
        ...current,
        education: current.education.filter((record) => record.recordId !== recordId),
      }));
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const submitKyc = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await kycApi<{ kyc: KycProfile }>("/api/kyc/me", {
        method: "PUT",
        body: JSON.stringify({
          personal: profile.personal,
          citizenship: profile.citizenship,
          birthCertificate: profile.birthCertificate,
          education: profile.education,
        }),
      });
      const submitted = await kycApi<{ kyc: KycProfile }>("/api/kyc/submit", { method: "POST" });
      setProfile((current) => ({ ...saved.kyc, ...submitted.kyc, documents: current.documents }));
      setNotice("Your KYC profile has been submitted for review.");
    } catch (requestError) {
      const typedError = requestError as Error & { missing?: string[] };
      setError(
        typedError.missing?.length
          ? `${typedError.message} Missing: ${typedError.missing.join(", ")}.`
          : typedError.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = authMode === "register" ? "/api/auth/register" : "/api/auth/student/login";
      const { user: currentUser } = await kycApi<{ user: KycUser }>(path, {
        method: "POST",
        body: JSON.stringify(auth),
      });
      setUser(currentUser);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await kycApi<void>("/api/auth/logout", { method: "POST" });
      setUser(null);
      setProfile(emptyProfile());
      setGenerated([]);
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  if (!ready) {
    return <div className="flex min-h-64 items-center justify-center text-slate-500"><LoaderCircle className="mr-2 animate-spin" />Loading KYC workspace…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <LockKeyhole />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student identity verification</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {authMode === "register" ? "Create your KYC account" : "Sign in to My Documents"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your identity documents are private. Sign in to manage your KYC information and uploads.
          </p>
          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            {authMode === "register" && (
              <>
                <label className="block text-sm font-medium text-slate-700">Full name
                  <input required autoComplete="name" value={auth.name} onChange={(event) => setAuth({ ...auth, name: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="block text-sm font-medium text-slate-700">Phone number
                  <input autoComplete="tel" value={auth.phone} onChange={(event) => setAuth({ ...auth, phone: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </label>
              </>
            )}
            <label className="block text-sm font-medium text-slate-700">Email address
              <input required type="email" autoComplete="email" value={auth.email} onChange={(event) => setAuth({ ...auth, email: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Password
              <input required type="password" minLength={12} autoComplete={authMode === "register" ? "new-password" : "current-password"} value={auth.password} onChange={(event) => setAuth({ ...auth, password: event.target.value })} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              {authMode === "register" && <span className="mt-1 block text-xs text-slate-500">Use at least 12 characters.</span>}
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {authMode === "register" ? "Create student account" : "Sign in"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { setError(""); setAuthMode(authMode === "register" ? "login" : "register"); }}
            className="mt-4 w-full text-sm font-medium text-blue-700 hover:underline"
          >
            {authMode === "register" ? "Already have an account? Sign in" : "New student? Create an account"}
          </button>
          <p className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
            Documents are uploaded through authenticated access and are never exposed as public file links.
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-slate-900">Administrator account detected</h1>
        <p className="mt-2 text-sm text-slate-600">Open the administrator KYC workspace to manage reviews.</p>
        <a href="/admin/kyc" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Open admin workspace</a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-slate-500">Dashboard / My Documents</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">My Documents &amp; KYC</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Keep your identity and education records together. You can save a draft and continue later.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button type="button" onClick={signOut} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Sign out</button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">KYC completion</p>
          <div className="mt-2 flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">{progress}%</p>
            <span className="text-xs text-slate-500">{profile.completion.completed} of {profile.completion.total} sections</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Verification status</p>
          <span className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${statusColor[profile.status]}`}>{profile.status}</span>
          <p className="mt-2 text-xs text-slate-500">{profile.submittedAt ? `Submitted ${new Date(profile.submittedAt).toLocaleDateString()}` : "Not yet submitted for review"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Uploaded documents</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{profile.documents.length}</p>
          <p className="mt-2 text-xs text-slate-500">Private to your account and authorized reviewers</p>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {profile.feedback.length > 0 && (
        <section className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h2 className="font-semibold text-orange-900">Correction requests</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-orange-900">
            {profile.feedback.map((feedback, index) => <li key={`${index}-${feedback}`}>{feedback}</li>)}
          </ul>
        </section>
      )}
      {!editable && (
        <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          Your profile is read-only while it is submitted for review or verified. A reviewer will contact you if corrections are required.
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Student KYC profile</h2>
              <p className="mt-1 text-sm text-slate-500">Required information is marked by the section checklist.</p>
            </div>
            <button type="button" onClick={() => void saveDraft()} disabled={busy || !editable} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              Save draft
            </button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {steps.map((label, index) => (
              <button
                type="button"
                key={label}
                onClick={() => setStep(index)}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition sm:text-sm ${
                  index === step ? "bg-blue-700 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${index === step ? "bg-white/20" : "bg-white"}`}>
                  {index + 1 < step ? <Check size={14} /> : index + 1}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-7 px-5 py-6 sm:px-7">
          {step === 0 && (
            <div className="space-y-5">
              <div><h3 className="text-base font-bold text-slate-900">Personal information</h3><p className="mt-1 text-sm text-slate-500">Enter your details as they appear on your identity documents.</p></div>
              <FieldGrid fields={personalFields} values={profile.personal} onChange={(key, value) => updateGroup("personal", key, value)} disabled={!editable} />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <div><h3 className="text-base font-bold text-slate-900">Citizenship information</h3><p className="mt-1 text-sm text-slate-500">Upload both sides of your citizenship document.</p></div>
              <FieldGrid fields={citizenshipFields} values={profile.citizenship} onChange={(key, value) => updateGroup("citizenship", key, value)} disabled={!editable} />
              <div className="grid gap-4 md:grid-cols-2">
                <DocumentUpload label="Citizenship front side" type="citizenship_front" documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
                <DocumentUpload label="Citizenship back side" type="citizenship_back" documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div><h3 className="text-base font-bold text-slate-900">Birth certificate</h3><p className="mt-1 text-sm text-slate-500">Provide the birth registration details and upload a scan or photo.</p></div>
              <FieldGrid fields={birthFields} values={profile.birthCertificate} onChange={(key, value) => updateGroup("birthCertificate", key, value)} disabled={!editable} />
              <DocumentUpload label="Birth certificate document" type="birth_certificate" documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-base font-bold text-slate-900">Education records</h3><p className="mt-1 text-sm text-slate-500">Add qualifications and supporting documents.</p></div>
                {editable && <button type="button" onClick={addEducation} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"><Plus size={16} /> Add education</button>}
              </div>
              <DocumentUpload label="Student photograph (for internal draft only)" type="profile_photo" documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
              {profile.education.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">No education records added. Use “Add education” to start.</div>}
              {profile.education.map((record, index) => (
                <div key={record.recordId} className="space-y-4 rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Qualification {index + 1}</h4>
                    {editable && <button type="button" onClick={() => removeEducation(record.recordId)} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"><Trash2 size={14} /> Remove</button>}
                  </div>
                  <FieldGrid fields={educationFields} values={{ ...record }} onChange={(key, value) => updateEducation(record.recordId, key, value)} disabled={!editable} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <DocumentUpload label="Transcript" type="education_transcript" educationId={record.recordId} documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
                    <DocumentUpload label="Character certificate" type="education_character" educationId={record.recordId} documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
                    <DocumentUpload label="Provisional certificate (optional)" type="education_provisional" educationId={record.recordId} documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
                    <DocumentUpload label="Migration certificate (optional)" type="education_migration" educationId={record.recordId} documents={profile.documents} disabled={!editable} uploading={uploading} onUpload={uploadDocument} onDelete={deleteDocument} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          ><ArrowLeft size={16} /> Previous</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step < steps.length - 1 ? (
              <button type="button" disabled={busy || !editable} onClick={() => void saveDraft(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : null} Save &amp; continue <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" disabled={busy || !editable} onClick={() => void submitKyc()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Submit KYC for review
              </button>
            )}
          </div>
        </div>
      </section>

      {profile.completion.missing.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Still needed to submit</h2>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {profile.completion.missing.map((item) => <li key={item} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{item}</li>)}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900"><FileCheck2 size={18} className="text-blue-700" /> Generated internal drafts</h2>
        <p className="mt-1 text-sm text-slate-500">Any generated citizenship document is a clearly marked sample for internal review only.</p>
        {generated.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {generated.map((document) => (
              <div key={document._id} className="flex items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-medium text-slate-800">{document.label}</p><p className="text-xs text-slate-500">{new Date(document.createdAt).toLocaleString()}</p></div>
                <div className="flex items-center gap-3">
                  <a href={documentDownloadUrl(`/api/kyc/documents/${document._id}/download`)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">Preview draft</a>
                  <a href={documentDownloadUrl(`/api/kyc/documents/${document._id}/download?download=1`)} className="text-sm font-semibold text-slate-600 hover:text-blue-700">Download</a>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No generated drafts are available.</p>}
      </section>

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />Uploaded identity records are private and accessible only to your account and authorized KYC administrators.</p>
    </div>
  );
}
