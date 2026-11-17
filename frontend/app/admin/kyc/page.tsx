"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  documentDownloadUrl,
  GeneratedDocument,
  KycProfile,
  KycStatus,
  KycUser,
  kycApi,
} from "@/lib/kyc-api";

type KycRecord = {
  id: string;
  student: { _id: string; name: string; email: string; phone: string };
  name: string;
  citizenshipNumber: string;
  status: KycStatus;
  documentCount: number;
  submittedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string;
};
type TemplateField = { key: string; label: string; x: number; y: number; fontSize: number; alignment: "left" | "center" | "right" };
type Template = { fields: TemplateField[]; photo: { x: number; y: number; width: number; height: number }; updatedAt: string; hasFont: boolean };
type Note = { text: string; authorId: KycUser | string; createdAt: string };
type ProfileResponse = { kyc: KycProfile; generatedDocuments: GeneratedDocument[] };
type ProfileTab = "personal" | "identity" | "education" | "documents" | "generated" | "history";

const apiStatuses: KycStatus[] = ["Not Started", "Draft", "Submitted", "Under Review", "Correction Required", "Verified", "Rejected"];
const badge: Record<KycStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-700",
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-blue-50 text-blue-700",
  "Under Review": "bg-amber-50 text-amber-800",
  "Correction Required": "bg-orange-50 text-orange-800",
  Verified: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-red-50 text-red-700",
};

const defaultFields: TemplateField[] = [
  { key: "holderName", label: "Citizenship holder name", x: 27, y: 29, fontSize: 10, alignment: "left" },
  { key: "dateOfBirth", label: "Date of birth", x: 27, y: 35, fontSize: 10, alignment: "left" },
  { key: "fatherName", label: "Father name", x: 27, y: 41, fontSize: 10, alignment: "left" },
  { key: "motherName", label: "Mother name", x: 27, y: 47, fontSize: 10, alignment: "left" },
  { key: "grandfatherName", label: "Grandfather name", x: 27, y: 53, fontSize: 10, alignment: "left" },
  { key: "address", label: "Address", x: 27, y: 59, fontSize: 10, alignment: "left" },
  { key: "citizenshipNumber", label: "Citizenship number", x: 27, y: 65, fontSize: 10, alignment: "left" },
  { key: "issueDate", label: "Issue date", x: 27, y: 71, fontSize: 10, alignment: "left" },
  { key: "issueDistrict", label: "Issue district", x: 27, y: 77, fontSize: 10, alignment: "left" },
];

const fieldOptions = [
  ["holderName", "Citizenship holder name"],
  ["dateOfBirth", "Date of birth"],
  ["fatherName", "Father name"],
  ["motherName", "Mother name"],
  ["grandfatherName", "Grandfather name"],
  ["address", "Address"],
  ["citizenshipNumber", "Citizenship number"],
  ["issueDate", "Issue date"],
  ["issueDistrict", "Issue district"],
];

function isApiError(error: unknown): error is Error {
  return error instanceof Error;
}

export default function AdminKycPage() {
  const [user, setUser] = useState<KycUser | null>(null);
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState<KycRecord[]>([]);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordPage, setRecordPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [profileTab, setProfileTab] = useState<ProfileTab>("personal");
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [generated, setGenerated] = useState<GeneratedDocument[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>(defaultFields);
  const [photo, setPhoto] = useState({ x: 75, y: 20, width: 15, height: 20 });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [note, setNote] = useState("");
  const [correction, setCorrection] = useState("");
  const [documentComments, setDocumentComments] = useState<Record<string, string>>({});
  const [previewDocument, setPreviewDocument] = useState<{ id: string; name: string; path: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = async <T,>(action: () => Promise<T>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await action();
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "The request could not be completed.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const loadRecords = async (term = search, status = filterStatus, page = recordPage) => {
    const params = new URLSearchParams();
    if (term.trim()) params.set("search", term.trim());
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("limit", "20");
    const result = await kycApi<{ records: KycRecord[]; total: number; page: number }>(`/api/admin/kyc?${params.toString()}`);
    setRecords(result.records);
    setRecordTotal(result.total);
    setRecordPage(result.page);
  };

  const loadProfile = async (id: string) => {
    const result = await kycApi<ProfileResponse>(`/api/admin/kyc/${id}`);
    setProfile(result.kyc);
    setGenerated(result.generatedDocuments);
  };

  const loadTemplate = async () => {
    const result = await kycApi<{ template: Template | null }>("/api/admin/kyc/citizenship-template");
    if (result.template) {
      setTemplate(result.template);
      setTemplateFields(result.template.fields);
      setPhoto(result.template.photo);
    }
  };

  useEffect(() => {
    let active = true;
    kycApi<{ user: KycUser }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active && currentUser.role === "admin") setUser(currentUser);
        else if (active) setError("This page is available to authorized KYC administrators only.");
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let active = true;
    Promise.all([
      kycApi<{ records: KycRecord[]; total: number; page: number }>("/api/admin/kyc?page=1&limit=20"),
      kycApi<{ template: Template | null }>("/api/admin/kyc/citizenship-template"),
    ])
      .then(([list, templateResponse]) => {
        if (!active) return;
        setRecords(list.records);
        setRecordTotal(list.total);
        setRecordPage(list.page);
        if (templateResponse.template) {
          setTemplate(templateResponse.template);
          setTemplateFields(templateResponse.template.fields);
          setPhoto(templateResponse.template.photo);
        }
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!selectedId || !user) return;
    let active = true;
    kycApi<ProfileResponse>(`/api/admin/kyc/${selectedId}`)
      .then((result) => {
        if (!active) return;
        setProfile(result.kyc);
        setGenerated(result.generatedDocuments);
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [selectedId, user]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await request(() => kycApi<{ user: KycUser }>("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }));
    if (result) setUser(result.user);
  };

  const signOut = async () => {
    const result = await request(() => kycApi<void>("/api/auth/logout", { method: "POST" }));
    if (result !== null) {
      setUser(null);
      setProfile(null);
      setRecords([]);
    }
  };

  const refreshProfile = async () => {
    try {
      if (selectedId) await loadProfile(selectedId);
      await loadRecords();
    } catch (requestError) {
      setError(isApiError(requestError) ? requestError.message : "The request could not be completed.");
    }
  };

  const reviewDocument = async (documentId: string, status: "approved" | "rejected") => {
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/documents/${documentId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, comments: documentComments[documentId] || "" }),
    }));
    if (result) {
      await refreshProfile();
      setNotice(`Document marked ${status}.`);
    }
  };

  const setStatus = async (status: "Under Review" | "Rejected") => {
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, comment: correction.trim() }),
    }));
    if (result) {
      await refreshProfile();
      setNotice(`KYC status updated to ${status}.`);
    }
  };

  const requestCorrection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/request-correction`, {
      method: "POST",
      body: JSON.stringify({ comment: correction }),
    }));
    if (result) {
      await refreshProfile();
      setCorrection("");
      setNotice("Correction request sent to the student.");
    }
  };

  const verifyProfile = async () => {
    if (!window.confirm("Verify this complete KYC profile? This records your administrator account and the verification time.")) return;
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/verify`, { method: "POST" }));
    if (result) {
      await refreshProfile();
      setNotice("KYC profile verified.");
    }
  };

  const addNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text: note }),
    }));
    if (result) {
      await refreshProfile();
      setNote("");
      setNotice("Internal note added.");
    }
  };

  const generateDraft = async () => {
    if (!window.confirm("Generate a watermarked sample draft for internal data review? It will not be an official document.")) return;
    const result = await request(() => kycApi(`/api/admin/kyc/${selectedId}/generate-citizenship-draft`, { method: "POST" }));
    if (result) {
      await refreshProfile();
      setNotice("Internal sample draft generated.");
    }
  };

  const saveTemplateConfig = async () => {
    const result = await request(() => kycApi("/api/admin/kyc/citizenship-template", {
      method: "PUT",
      body: JSON.stringify({ fields: templateFields, photo }),
    }));
    if (result) {
      await loadTemplate();
      setNotice("Citizenship template positions saved.");
    }
  };

  const uploadTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!templateFile) {
      setError("Choose a PDF, JPG, or PNG template file.");
      return;
    }
    const formData = new FormData();
    formData.set("file", templateFile);
    formData.set("fields", JSON.stringify(templateFields));
    formData.set("photo", JSON.stringify(photo));
    const result = await request(() => kycApi("/api/admin/kyc/citizenship-template", { method: "POST", body: formData }));
    if (result) {
      await loadTemplate();
      setTemplateFile(null);
      setNotice("Private citizenship template uploaded and configured.");
    }
  };

  const uploadFont = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fontFile) {
      setError("Choose a TTF or OTF font file.");
      return;
    }
    const formData = new FormData();
    formData.set("file", fontFile);
    const result = await request(() => kycApi("/api/admin/kyc/citizenship-template/font", { method: "POST", body: formData }));
    if (result) {
      await loadTemplate();
      setFontFile(null);
      setNotice("Unicode font uploaded for citizenship draft generation.");
    }
  };

  const setField = (index: number, key: keyof TemplateField, value: string) => {
    setTemplateFields((fields) => fields.map((field, currentIndex) => {
      if (currentIndex !== index) return field;
      if (key === "x" || key === "y" || key === "fontSize") {
        return { ...field, [key]: Number(value) };
      }
      if (key === "alignment") {
        if (value !== "left" && value !== "center" && value !== "right") return field;
        return { ...field, alignment: value };
      }
      if (key === "label") return { ...field, label: value };
      return field;
    }));
  };

  const addTemplateField = (key: string) => {
    const option = fieldOptions.find(([value]) => value === key);
    if (!option || templateFields.some((field) => field.key === key)) return;
    setTemplateFields((fields) => [...fields, {
      key: option[0],
      label: option[1],
      x: 25,
      y: Math.min(90, 25 + fields.length * 5),
      fontSize: 10,
      alignment: "left",
    }]);
  };

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-slate-500"><LoaderCircle className="mr-2 animate-spin" />Loading admin workspace…</div>;

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white"><LockKeyhole /></div>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-blue-700">Restricted access</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Administrator KYC sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Administrator accounts are provisioned from server environment configuration. Student accounts cannot access this workspace.</p>
          <form onSubmit={login} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">Email
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500" />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {busy && <LoaderCircle size={16} className="animate-spin" />}Sign in as administrator
            </button>
          </form>
          <p className="mt-5 flex gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-700" />Every administrative review action is recorded in the profile history.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Ekagajpatra · Administration</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Student KYC management</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-slate-800">{user.name}</span><span className="text-xs text-slate-500">{user.email}</span></span>
            <button type="button" onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-7">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}

        <section className="grid gap-5 lg:grid-cols-[minmax(330px,0.8fr)_minmax(0,1.5fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">Student profiles</h2><p className="mt-1 text-xs text-slate-500">{recordTotal} result(s)</p></div>
              <button type="button" onClick={() => void request(() => loadRecords(search, filterStatus, recordPage))} aria-label="Refresh KYC records" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><RefreshCw size={16} /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void request(() => loadRecords(search, filterStatus, 1)); }} className="mt-4 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, phone, citizenship #" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-500" />
              </div>
              <button className="rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800">Search</button>
            </form>
            <select value={filterStatus} onChange={(event) => { setFilterStatus(event.target.value); void request(() => loadRecords(search, event.target.value, 1)); }} className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option value="">All statuses</option>
              {apiStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <div className="mt-4 max-h-[560px] space-y-2 overflow-auto">
              {records.map((record) => (
                <button key={record.id} type="button" onClick={() => { setProfileTab("personal"); setSelectedId(record.id); }} className={`w-full rounded-lg border p-3 text-left transition ${selectedId === record.id ? "border-blue-300 bg-blue-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{record.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{record.student?.email || "No email"}</span></span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${badge[record.status]}`}>{record.status}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{record.citizenshipNumber || "No citizenship number"}</span><span>{record.documentCount} docs</span></div>
                </button>
              ))}
              {records.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No KYC profiles match this search.</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">Page {recordPage} of {Math.max(1, Math.ceil(recordTotal / 20))}</span>
              <div className="flex gap-2">
                <button type="button" disabled={busy || recordPage <= 1} onClick={() => void request(() => loadRecords(search, filterStatus, recordPage - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40">Previous</button>
                <button type="button" disabled={busy || recordPage * 20 >= recordTotal} onClick={() => void request(() => loadRecords(search, filterStatus, recordPage + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40">Next</button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {!profile ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <FileCheck2 size={30} className="text-slate-300" /><h2 className="mt-3 font-semibold text-slate-800">Choose a student profile</h2><p className="mt-1 text-sm text-slate-500">Student documents and review controls will appear here.</p>
              </div>
            ) : (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Student profile</p><h2 className="mt-1 text-xl font-bold text-slate-900">{profile.personal.fullName || profile.student?.name}</h2><p className="mt-1 text-sm text-slate-500">{profile.student?.email} · {profile.student?.phone}</p></div>
                    <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${badge[profile.status]}`}>{profile.status}</span>
                  </div>
                  <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                    <p><span className="block text-xs text-slate-500">Citizenship number</span><strong className="text-slate-800">{profile.citizenship.number || "—"}</strong></p>
                    <p><span className="block text-xs text-slate-500">Submitted</span><strong className="text-slate-800">{profile.submittedAt ? new Date(profile.submittedAt).toLocaleString() : "—"}</strong></p>
                    <p><span className="block text-xs text-slate-500">Completion</span><strong className="text-slate-800">{profile.completion.percentage}%</strong></p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button type="button" disabled={busy || !["Submitted", "Under Review"].includes(profile.status)} onClick={() => void setStatus("Under Review")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">Mark under review</button>
                    <button type="button" disabled={busy || !["Submitted", "Under Review"].includes(profile.status)} onClick={verifyProfile} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 size={15} /> Verify profile</button>
                    <button type="button" disabled={busy} onClick={generateDraft} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">Generate citizenship sample</button>
                  </div>
                  {profile.verifiedAt && <p className="mt-3 text-xs text-emerald-800">Verified {new Date(profile.verifiedAt).toLocaleString()} by {typeof profile.verifiedBy === "object" && profile.verifiedBy ? profile.verifiedBy.name : "administrator"}.</p>}
                </section>

                <div role="tablist" aria-label="Student KYC profile sections" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
                  {([
                    ["personal", "Personal"],
                    ["identity", "Citizenship & birth"],
                    ["education", "Education"],
                    ["documents", "Documents"],
                    ["generated", "Generated"],
                    ["history", "History"],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={profileTab === tab}
                      onClick={() => setProfileTab(tab)}
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${profileTab === tab ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                    >{label}</button>
                  ))}
                </div>

                {profileTab === "personal" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Personal information</h3>
                  <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(profile.personal).map(([key, value]) => (
                      <div key={key}><dt className="text-xs capitalize text-slate-500">{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd className="mt-0.5 break-words text-sm font-medium text-slate-800">{value || "—"}</dd></div>
                    ))}
                  </dl>
                </section>}

                {profileTab === "identity" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Citizenship &amp; birth certificate</h3>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    {[["Citizenship", profile.citizenship], ["Birth certificate", profile.birthCertificate]].map(([label, values]) => (
                      <div key={label as string}><h4 className="text-sm font-semibold text-slate-700">{label as string}</h4><dl className="mt-2 space-y-2">{Object.entries(values as Record<string, string>).map(([key, value]) => <div key={key} className="flex justify-between gap-3 text-sm"><dt className="capitalize text-slate-500">{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}</dt><dd className="text-right font-medium text-slate-800">{value || "—"}</dd></div>)}</dl></div>
                    ))}
                  </div>
                </section>}

                {profileTab === "education" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Educational documents</h3>
                  {profile.education.length ? profile.education.map((record, index) => (
                    <div key={record.recordId} className="mt-4 rounded-lg border border-slate-100 p-4">
                      <h4 className="text-sm font-semibold text-slate-800">Qualification {index + 1} · {record.level}</h4>
                      <p className="mt-1 text-sm text-slate-500">{record.institution} · {record.board} · {record.passedYear}</p>
                      <p className="mt-1 text-xs text-slate-500">Registration {record.registrationNumber} · Symbol {record.symbolNumber} · {record.gpa} · {record.major}</p>
                    </div>
                  )) : <p className="mt-3 text-sm text-slate-500">No education records saved.</p>}
                </section>}

                {profileTab === "documents" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Document review</h3>
                  <div className="mt-4 space-y-3">
                    {profile.documents.map((document) => {
                      const path = `/api/admin/kyc/${profile.id}/documents/${document.id}/download`;
                      return (
                        <article key={document.id} className="rounded-lg border border-slate-100 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div><h4 className="text-sm font-semibold text-slate-800">{document.type.replaceAll("_", " ")}{document.educationId ? " · Education record" : ""}</h4><p className="mt-1 text-xs text-slate-500">{document.originalName} · {(document.bytes / (1024 * 1024)).toFixed(1)} MB · {new Date(document.uploadedAt).toLocaleString()}</p></div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${document.status === "approved" ? "bg-emerald-100 text-emerald-800" : document.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{document.status}</span>
                              <button type="button" onClick={() => setPreviewDocument({ id: document.id, name: document.originalName, path })} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">Preview <ArrowUpRight size={13} /></button>
                              <a href={documentDownloadUrl(`${path}?download=1`)} className="text-xs font-semibold text-slate-600 hover:text-blue-700">Download</a>
                            </div>
                          </div>
                          {document.comments && <p className="mt-2 text-xs text-slate-600">Reviewer comment: {document.comments}</p>}
                          {document.status !== "approved" && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <input value={documentComments[document.id] || ""} onChange={(event) => setDocumentComments((current) => ({ ...current, [document.id]: event.target.value }))} placeholder="Optional reviewer comment" maxLength={1000} className="h-9 min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-blue-500" />
                              <button type="button" disabled={busy} onClick={() => void reviewDocument(document.id, "approved")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
                              <button type="button" disabled={busy} onClick={() => void reviewDocument(document.id, "rejected")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Reject</button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {profile.documents.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No documents uploaded.</p>}
                  </div>
                </section>}

                <section className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="font-bold text-slate-900">Request corrections</h3>
                    <form onSubmit={requestCorrection} className="mt-3 space-y-3">
                      <textarea required value={correction} onChange={(event) => setCorrection(event.target.value)} maxLength={1000} rows={3} placeholder="Explain what the student needs to correct." className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" />
                      <div className="flex flex-wrap gap-2">
                        <button disabled={busy || !["Submitted", "Under Review", "Verified"].includes(profile.status)} className="rounded-lg bg-orange-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Send correction request</button>
                        <button type="button" disabled={busy || !correction.trim()} onClick={() => void setStatus("Rejected")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Reject profile</button>
                      </div>
                    </form>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="flex items-center gap-2 font-bold text-slate-900"><MessageSquareText size={17} /> Internal notes</h3>
                    <form onSubmit={addNote} className="mt-3 flex gap-2">
                      <input required value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Add a note visible only to admins" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500" />
                      <button disabled={busy} className="rounded-lg bg-slate-800 px-3 text-sm font-semibold text-white disabled:opacity-50">Add</button>
                    </form>
                    <div className="mt-3 max-h-36 space-y-2 overflow-auto">
                      {(profile.internalNotes || []).map((entry: Note, index) => <p key={`${entry.createdAt}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">{entry.text}<span className="mt-1 block text-[10px] text-slate-400">{typeof entry.authorId === "object" ? entry.authorId.name : "Admin"} · {new Date(entry.createdAt).toLocaleString()}</span></p>)}
                      {!profile.internalNotes?.length && <p className="text-xs text-slate-400">No internal notes.</p>}
                    </div>
                  </div>
                </section>

                {profileTab === "generated" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Generated documents</h3>
                  <p className="mt-1 text-xs text-slate-500">Citizenship drafts are watermarked, private, and not official documents.</p>
                  <div className="mt-3 space-y-2">
                    {generated.map((document) => {
                      const path = `/api/admin/kyc/${profile.id}/generated-documents/${document._id}/download`;
                      return <div key={document._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="text-sm text-slate-700">{document.label} · {new Date(document.createdAt).toLocaleString()}</span><span className="flex gap-3"><button type="button" onClick={() => setPreviewDocument({ id: document._id, name: document.label, path })} className="text-xs font-semibold text-blue-700 hover:underline">Preview</button><a href={documentDownloadUrl(`${path}?download=1`)} className="text-xs font-semibold text-slate-600 hover:text-blue-700">Download</a></span></div>;
                    })}
                    {!generated.length && <p className="text-sm text-slate-500">No sample drafts generated.</p>}
                  </div>
                </section>}

                {profileTab === "history" && <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">Verification history</h3>
                  <div className="mt-3 space-y-3">
                    {(profile.history || []).slice().reverse().map((entry, index) => <div key={`${entry.createdAt}-${index}`} className="flex gap-3 border-l-2 border-blue-100 pl-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-800">{entry.action}</p><p className="text-xs text-slate-500">{entry.status} · {typeof entry.actorId === "object" ? entry.actorId.name : "Account"} · {new Date(entry.createdAt).toLocaleString()}</p>{entry.comment && <p className="mt-1 text-xs text-slate-600">{entry.comment}</p>}</div></div>)}
                    {!profile.history?.length && <p className="text-sm text-slate-500">No review history yet.</p>}
                  </div>
                </section>}
              </>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-bold text-slate-900">Citizenship sample template</h2><p className="mt-1 text-sm text-slate-500">Template and font assets remain private. All generated outputs are watermarked internal drafts.</p></div>
            {template && <a href={documentDownloadUrl("/api/admin/kyc/citizenship-template/asset")} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">Preview current template</a>}
          </div>
          <form onSubmit={uploadTemplate} className="mt-4 flex flex-wrap items-center gap-3">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setTemplateFile(event.target.files?.[0] || null)} className="block max-w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
            <button disabled={busy || !templateFile} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Upload size={15} />{template ? "Replace template" : "Upload template"}</button>
            {template && <span className="text-xs text-slate-500">Updated {new Date(template.updatedAt).toLocaleString()}</span>}
          </form>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Field positions (percent of page)</h3>
                <select value="" onChange={(event) => { if (event.target.value) addTemplateField(event.target.value); }} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
                  <option value="">Add field…</option>
                  {fieldOptions.filter(([key]) => !templateFields.some((field) => field.key === key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Field</th><th className="p-2">X %</th><th className="p-2">Y %</th><th className="p-2">Size</th><th className="p-2">Alignment</th><th className="p-2" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {templateFields.map((field, index) => <tr key={field.key}>
                      <td className="p-2 font-medium text-slate-700">{field.label}</td>
                      {(["x", "y", "fontSize"] as const).map((key) => <td key={key} className="p-2"><input type="number" min={key === "fontSize" ? 6 : 0} max={key === "fontSize" ? 36 : 100} value={field[key]} onChange={(event) => setField(index, key, event.target.value)} className="h-8 w-16 rounded border border-slate-200 px-2" /></td>)}
                      <td className="p-2"><select value={field.alignment} onChange={(event) => setField(index, "alignment", event.target.value)} className="h-8 rounded border border-slate-200"><option>left</option><option>center</option><option>right</option></select></td>
                      <td className="p-2"><button type="button" onClick={() => setTemplateFields((fields) => fields.filter((_, fieldIndex) => fieldIndex !== index))} aria-label={`Remove ${field.label}`} className="text-red-600 hover:underline">Remove</button></td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Photograph area (percent of page)</h3>
              <div className="grid grid-cols-2 gap-3">
                {(["x", "y", "width", "height"] as const).map((key) => <label key={key} className="text-xs capitalize text-slate-500">{key}<input type="number" min={key === "width" || key === "height" ? 1 : 0} max={100} value={photo[key]} onChange={(event) => setPhoto((current) => ({ ...current, [key]: Number(event.target.value) }))} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-sm text-slate-800" /></label>)}
              </div>
              <button type="button" disabled={busy || !template} onClick={() => void saveTemplateConfig()} className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Save positions</button>
              <form onSubmit={uploadFont} className="space-y-2 rounded-lg bg-slate-50 p-3">
                <label className="block text-xs font-semibold text-slate-700">Unicode font for names (TTF / OTF)
                  <input type="file" accept=".ttf,.otf,font/ttf,font/otf" onChange={(event) => setFontFile(event.target.files?.[0] || null)} className="mt-2 block max-w-full text-xs text-slate-500" />
                </label>
                <button disabled={busy || !fontFile || !template} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{template?.hasFont ? "Replace font" : "Upload font"}</button>
                {template?.hasFont && <p className="text-[11px] text-emerald-700">A Unicode font is configured.</p>}
              </form>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Use this only to prepare internal data samples. Generated PDFs are prominently marked “DRAFT / NOT AN OFFICIAL DOCUMENT”; do not add government seals, signatures, or authentication marks.
          </div>
        </section>
      </div>

      {previewDocument && (
        <div role="dialog" aria-modal="true" aria-label="Document preview" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-8">
          <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="truncate pr-3 text-sm font-semibold text-slate-800">{previewDocument.name}</h2>
              <button type="button" onClick={() => setPreviewDocument(null)} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {/\.(jpe?g|png)$/i.test(previewDocument.name) ? (
              <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-100 p-4"><Image src={documentDownloadUrl(previewDocument.path)} alt={previewDocument.name} width={1200} height={900} unoptimized className="max-h-full max-w-full object-contain" /></div>
            ) : (
              <iframe title={previewDocument.name} src={documentDownloadUrl(previewDocument.path)} className="min-h-0 flex-1" />
            )}
          </div>
        </div>
      )}
      {busy && <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg"><LoaderCircle size={15} className="animate-spin" />Working…</div>}
    </main>
  );
}
