/**
 * Event Batch
 * https://docs.mparticle.com/developers/apis/http/#example-json-request-body
 * https://docs.mparticle.com/developers/apis/json-reference/
 */
export interface EventBatch {
	/** Array of events to be processed */
	events?: Array<{
		/** Custom data payload for the event */
		data: Record<string, unknown>;

		/** Type identifier for the event */
		eventType: string;
	}>;

	/** Information about the device that generated the events */
	deviceInfo?: Record<string, unknown>;

	/** Custom attributes associated with the user */
	userAttributes?: Record<string, unknown>;

	/** List of user attribute keys that have been deleted */
	deletedUserAttributes?: string[];

	/** Identity information for the user across different platforms */
	userIdentities?: Record<string, unknown>;

	/** Information about the application */
	applicationInfo?: Record<string, unknown>;

	/** Version of the data schema being used */
	schemaVersion?: number;

	/**
	 * Environment where the events were generated (e.g., production, development).
	 * Since our setup has separated "development" and "production" workspaces, the
	 * environment property becomes largely redundant and has minimal practical value.
	 * Still, for some reason, currently we only have access to "Dev" events live
	 * streamings. Let's keep this open for testing users running in dev or prod.
	 */
	environment: 'production' | 'development';

	/** Additional context information */
	context?: Record<string, unknown>;

	/** IP address of the client */
	ip?: string;
}
