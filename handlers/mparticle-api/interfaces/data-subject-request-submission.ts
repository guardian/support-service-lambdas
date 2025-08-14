/**
 * Data Subject Request Submission
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export interface DataSubjectRequestSubmission {
	/**
	 * The estimated time by which the request will be fulfilled, in UTC.
	 */
	expectedCompletionTime: Date;

	/**
	 * The estimated time by which the request was submitted, in UTC.
	 */
	receivedTime: Date;

	/**
	 * The controller-provided identifier of the request in a GUID v4 format.
	 */
	requestId: string;

	/**
	 * A unique ID representing the data controller. mParticles sets this to the workspace ID.
	 */
	controllerId: string;
}
