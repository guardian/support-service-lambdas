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
     * The type of request. Supported values are access, portability and erasure.
     */
    subjectRequestType: 'access' | 'portability' | 'erasure';

    /**
     * The time the Data Subject originally submitted the request.
     */
    submittedTime: Date;

    /**
     * The subject_identities are sent as a dictionary where the keys are identity
     * types, and the value fields are value and encoding. You can specify up to 50
     * identities in a single request. The number of identities in a request is also
     * limited by the number of different unique identity types.
     * https://docs.mparticle.com/developers/apis/dsr-api/v3/#supported-identity-types
     */
    subjectIdentities: Array<{
        /**
         * A string representing the type of identifier used (such as email or android_advertising_id).
         */
        identityType:
        // TODO: Limit these to only the ones that we will use (and abstract them)
        | 'controller_customer_id'
        | 'email'
        | 'android_advertising_id'
        | 'android_id'
        | 'fire_advertising_id'
        | 'ios_advertising_id'
        | 'ios_vendor_id'
        | 'microsoft_advertising_id'
        | 'microsoft_publisher_id'
        | 'roku_advertising_id'
        | 'roku_publishing_id';

        /**
         *  A string representing the value of the identifier (such as example@example.com)
         */
        value: string;

        /**
         * The encoding format of the identity value. For mParticle, the value is raw.
         */
        encoding: string;
    }>;
}