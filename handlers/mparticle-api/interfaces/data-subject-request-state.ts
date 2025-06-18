export enum DataSubjectRequestStatus {
    Pending = 'pending',
    InProgress = 'in-progress',
    Completed = 'completed',
    Cancelled = 'cancelled',
}

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export interface DataSubjectRequestState {
    /**
     * The estimated time by which the request will be fulfilled, in UTC.
     */
    expectedCompletionTime: Date;

    /**
     * The controller-provided identifier of the request in a GUID v4 format.
     */
    requestId: string;

    /**
     * A unique ID representing the data controller. mParticles sets this to the workspace ID.
     */
    controllerId: string;

    /**
     * The status of the request.
     */
    requestStatus: DataSubjectRequestStatus;

    /**
     * For Access/Portability requests, a download link to the request results data.
     * This field contains null unless the request is complete. After a request completes,
     * the resultsUrl is valid for 7 days. After that time, attempting to access this URL
     * results in a 410 Gone HTTP response. If no records can be found matching the identities
     * in the request, a request returns a 404 error.
     */
    resultsUrl: string | null;
}