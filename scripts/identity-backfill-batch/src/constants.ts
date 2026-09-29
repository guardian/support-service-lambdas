// Output file names
export const STATE_FILE = 'state.json';
export const PROCESSED_FILE = 'processed.csv';
export const REJECTED_FILE = 'rejected.csv';
export const ERRORS_FILE = 'errors.csv';
export const SUMMARY_FILE = 'summary.txt';

// Output directory layout (relative to user's home)
export const OUTPUT_BASE_DIR = 'Downloads';
export const OUTPUT_PARENT_DIR = 'identity-backfill-batch-results';

// CSV headers for the output files
export const PROCESSED_HEADER =
	'timestamp,email,sub_id,sub_number,sf_product,identity_id,mode\n';
export const REJECTED_HEADER =
	'timestamp,email,sub_id,sub_number,sf_product,reason\n';
export const ERRORS_HEADER =
	'timestamp,email,sub_id,sub_number,sf_product,http_status,reason\n';

// Required columns in the input CSV (output of the BigQuery query)
export const CSV_REQUIRED_COLUMNS = [
	'sub_id',
	'sub_number',
	'subscription_end_date',
	'sub_status',
	'zuora_bill_to_email',
	'sf_contact_email',
	'identity_status',
	'sf_product',
	'account_crm_id',
] as const;

// Identity status values produced by the BigQuery query
export const IDENTITY_STATUS_HAS = 'Has Identity ID';
export const IDENTITY_STATUS_NONE = 'No Identity ID';
export const IDENTITY_STATUS_NO_EMAIL = 'No Email Address';

// API call config
export const API_CLIENT_ID = 'identity-backfill-batch';
export const API_TOKEN_PLACEHOLDER = 'batch';
export const DEFAULT_MAX_RETRIES = 3;
export const INITIAL_BACKOFF_MS = 500;
export const MAX_RESPONSE_PREVIEW_CHARS = 300;

// Environment variable prefixes (suffixed with the stage)
export const ENV_URL_PREFIX = 'IDENTITY_BACKFILL_URL_';
export const ENV_API_KEY_PREFIX = 'IDENTITY_BACKFILL_API_KEY_';

// Main loop
export const PROGRESS_REPORT_EVERY = 25;
