import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { detectAts } from "@/lib/scrapers/ats/detect-ats";
import {
  deleteCompany,
  getCompanyById,
  getTrackedCompanies,
  insertCompany,
  setCompanyAts,
} from "./companies.db";
import type {
  AddCompanyInput,
  DeleteCompanyInput,
  UpdateCompanyInput,
} from "./companies.validators";

export async function fetchTrackedCompanies(db: Database, userId: string) {
  return getTrackedCompanies(db, userId);
}

/**
 * Adds a target company and immediately tries to resolve its ATS board.
 *
 * Resolution is best-effort: a company with no detected board is still worth
 * keeping, because the user can supply the slug by hand or we may detect it on a
 * later attempt once they add a careers URL.
 */
export async function addTrackedCompany(
  db: Database,
  userId: string,
  companyData: AddCompanyInput,
) {
  const careersUrl = companyData.careersUrl?.trim() || null;

  const inserted = await insertCompany(db, userId, {
    name: companyData.name.trim(),
    careersUrl,
  });

  if (!inserted) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `You're already tracking ${companyData.name}.`,
    });
  }

  const detected = await detectAts(inserted.name, careersUrl).catch(() => null);
  if (!detected) return inserted;

  const updated = await setCompanyAts(db, userId, inserted.id, {
    atsProvider: detected.provider,
    atsSlug: detected.slug,
  });

  return updated ?? inserted;
}

// Re-runs detection for a company that didn't resolve on creation, or whose board
// moved to a different ATS.
export async function resolveCompanyAts(db: Database, userId: string, companyId: string) {
  const company = await getCompanyById(db, userId, companyId);
  if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });

  const detected = await detectAts(company.name, company.careersUrl);
  if (!detected) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Couldn't find a job board for ${company.name}. Add their careers page URL, or enter the board slug manually.`,
    });
  }

  return setCompanyAts(db, userId, companyId, {
    atsProvider: detected.provider,
    atsSlug: detected.slug,
  });
}

export async function updateTrackedCompany(
  db: Database,
  userId: string,
  updateData: UpdateCompanyInput,
) {
  const updated = await setCompanyAts(db, userId, updateData.id, {
    atsProvider: updateData.atsProvider ?? null,
    atsSlug: updateData.atsSlug ?? null,
  });

  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
  return updated;
}

export async function removeTrackedCompany(
  db: Database,
  userId: string,
  input: DeleteCompanyInput,
) {
  const deleted = await deleteCompany(db, userId, input.id);
  if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
  return deleted;
}
