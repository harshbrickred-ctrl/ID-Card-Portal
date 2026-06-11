import { requireAuth, withApi } from "@idportal/api-kit";
import { getCdrConversionCapabilities, getInkscapeCandidates } from "@/server/cdr-converter";

export const GET = withApi(async (req) => {
  await requireAuth(req);
  const capabilities = getCdrConversionCapabilities();
  const inkscapeCandidates = await getInkscapeCandidates();
  return {
    ...capabilities,
    inkscapeFound: inkscapeCandidates.length > 0,
  };
});
