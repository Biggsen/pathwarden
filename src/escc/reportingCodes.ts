/** Official CAMS map; “Report an issue” is an in-app view, not a deep link. */
export const ESCC_REPORTING_MAP_URL = "https://row.eastsussex.gov.uk/";

/**
 * Reporting-map codes (e.g. HEL/Cuckoo/3) are not in the open FeatureServer.
 * Named licensed routes therefore need an explicit Path_Name → code map.
 */
export const REPORTING_CODE_BY_PATH_NAME: Record<string, string> = {
  "Cuckoo Trail - Hellingly LB": "HEL/Cuckoo/3",
};
