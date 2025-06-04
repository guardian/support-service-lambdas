/**
 * Data Subject Request Form
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 */
export interface DataSubjectRequestForm {
    /**
     * The regulation this DSR falls under, either gdpr or ccpa.
     */
    regulation: 'gdpr' | 'ccpa';

    /**
     * A unique identifier (UUID v4 string) for the request provided by the controller.
     */
    requestId: string;

    /**
     * The type of request. Supported values are access, portability and erasure.
     */
    requestType: 'access' | 'portability' | 'erasure';

    /**
     * The time the Data Subject originally submitted the request.
     */
    submittedTime: Date;

    /**
     * User Id to be used as the subject identity.
     */
    userId: string;
}