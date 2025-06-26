/**
 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 * NOTE: This syntax is defined by mParticle convention since it's a payload from a callback request (webhook)
 */
export interface DataSubjectRequestCallback {
    /** 
     * A unique ID representing the data controller. mParticles sets this to the workspace ID.
     */
    controller_id: string;

    /**
     * The estimated time by which the request will be fulfilled, in UTC.
     */
    expected_completion_time: string; // ISO 8601 date string

    /**
     * The controller-provided identifier of the request in a GUID v4 format. 
     */
    subject_request_id: string; // UUID v4 string

    /** 
     * The group_id can be used to relate different subject requests together. 
     * The maximum number of requests that can be associated to a group_id is 150. 
     * Groups are scoped to the workspace.
     */
    group_id?: string | null;

    /** 
     * The status of the request. 
     * Possible values are 'pending', 'in_progress', 'completed' and 'cancelled'.
     */
    request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

    /**
     * The API version for this request. The current version is '3.0'.
     */
    api_version?: string | null;

    /** 
     * For Access/Portability requests, a download link to the request results data. 
     * This field contains null unless the request is complete. After a request completes, 
     * the results_url is valid for 7 days. After that time, attempting to access this URL 
     * results in a 410 Gone HTTP response. If no records can be found matching the identities 
     * in the request, a request returns a 404 error.
     */
    results_url: string | null;

    /**
     * Extensions related to DSR forwarding.
     */
    extensions: Record<string, {
        /**
         * The domain of the partner.
         */
        domain: string;

        /**
         * The name entered when configuring the DSR configuration for the partner.
         */
        name: string;

        /** 
         * The current status of the forwarding request to the partner.
         * - 'pending': The request has been queued for forwarding.
         * - 'skipped': Request was not forwarded due to missing identities.
         * - 'sent': The request has been forwarded.
         * - 'failed': The request could not be sent. For example, the request may have invalid credentials or partner API errors occurred.
         */
        status: 'pending' | 'skipped' | 'sent' | 'failed';

        /**
         * Additional details for the 'skipped' and 'failed' status.
         */
        status_message: string;
    }> | null;
}