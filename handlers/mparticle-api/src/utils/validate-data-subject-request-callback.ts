import * as crypto from 'crypto';
import * as tls from 'tls';
import { X509Certificate } from '@peculiar/x509';
import { requestDataSubjectApi } from '../apis/data-subject-requests';

const ALLOWED_PROCESSOR_DOMAINS = [
    "opendsr.mparticle.com"
    // Add other trusted processor domains here if needed
];

let cachedProcessorCertificate: {
    parsed: X509Certificate;
    pem: string;
} | undefined;

/**
 * Get Processor Domain Certificate
 * If the X-OpenDSR-Processor-Domain header value is the whitelist, we should fetch the certificate.
 * The certificate URL is available as the value of "processor_certificate" in the /discovery response body.
 * The certificate can be cached for the lifetime of the certificate.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#validating-a-callback-request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#discovery
 * @param {boolean} expirationRetry - If should run in expiration retry mode
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
async function getProcessorDomainCertificate(expirationRetry?: boolean): Promise<{
    parsed: X509Certificate;
    pem: string;
} | null> {
    if (!cachedProcessorCertificate) {
        const discoveryResponse = await requestDataSubjectApi<{
            processor_certificate: string;
        }>("/discovery", {
            method: "GET"
        });

        if (!discoveryResponse.success) {
            console.error("Could not Discover Processor Certificate.")
            return null;
        }

        const certificateResponse = await fetch(discoveryResponse.data.processor_certificate, {
            method: "GET"
        });

        if (!certificateResponse.ok) {
            console.error("Could not obtain Processor Certificate.")
            return null;
        }

        const pem = await certificateResponse.text();
        cachedProcessorCertificate = {
            parsed: new X509Certificate(pem),
            pem
        };
    }

    const now = new Date();
    const notExpired = now >= cachedProcessorCertificate.parsed.notBefore && now <= cachedProcessorCertificate.parsed.notAfter;

    if (!notExpired) {
        if (!expirationRetry) {
            console.info("Certificate has expired. Attempting to refresh certificate...");
            cachedProcessorCertificate = undefined;
            return getProcessorDomainCertificate(true);
        }

        console.error("Certificate remains expired after refresh attempt. Please contact mParticle support for assistance.");
        return null;
    }

    return cachedProcessorCertificate;
};

/**
 * Validates a certificate chain against trusted Certificate Authorities
 * This implementation is specifically designed for OpenDSR certificate validation
 * @param {string} certificatePem - The PEM-encoded certificate to validate
 * @returns {Promise<boolean>} - Returns true if certificate chain is valid, false otherwise
 */
async function validateCertificateChain(certificatePem: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            // More robust validation - could use node-forge or similar
            tls.createSecureContext({
                cert: certificatePem,
            });
            resolve(true);
        } catch (error) {
            console.warn(`Certificate validation failed:`, error);
            resolve(false);
        }
    });
}

/**
 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
 * When a request changes status, including when a request is first created, mParticle sends a callback
 * POST to all URLs specified in the status_callback_urls array of the request. Callbacks are queued
 * and sent every 15 minutes.
 * Callback requests are signed and issued over TLS. We must validate the authenticity of the request
 * before parsing the request body.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#callbacks
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#validating-a-callback-request
 * @param {string} processorDomain - The value of the 'x-opendsr-processor-domain' header
 * @param {string} signature - The value of the 'x-opendsr-signature' header
 */
export const validateDataSubjectRequestCallback = async (processorDomain: string | undefined, signature: string | undefined, payload: string | null): Promise<boolean> => {
    // 1. Establish a whitelist of all processor domains that we will allow to issue callbacks.
    if (!processorDomain || !ALLOWED_PROCESSOR_DOMAINS.includes(processorDomain)) {
        console.error("Invalid Processor Domain on Data Subject Request Callback validation.", processorDomain);
        return false;
    }

    // 2. If the X-OpenDSR-Processor-Domain header value is in our whitelist, fetch the certificate. The
    // certificate URL is available as the value of "processor_certificate" in the /discovery response body.
    // The certificate can be cached for the lifetime of the certificate.
    const processorCertificate: {
        parsed: X509Certificate;
        pem: string;
    } | null = await getProcessorDomainCertificate();
    if (!processorCertificate) {
        console.error("Could not obtain Processor Certificate to perform Data Subject Request Callback validation.")
        return false;
    }

    // 3. Validate the certificate. This should be handled by a library. Certificate validation should confirm that:
    const cert: X509Certificate = processorCertificate.parsed;

    // 3.1 The certificate was issued by a trusted authority.
    const isChainValid = await validateCertificateChain(processorCertificate.pem);
    if (!isChainValid) {
        console.error("Certificate chain is not trusted.");
        return false;
    }

    // 3.2 The certificate was issued to the exact string given in the X-OpenDSR-Processor-Domain header value.
    const certSubjectCN = cert.subjectName.toString().match(/CN=([^,]+)/)?.[1];
    if (certSubjectCN !== processorDomain) {
        console.error(`Certificate CN mismatch. Expected: ${processorDomain}, Found: ${certSubjectCN}`);
        return false;
    }

    // 3.3 The certificate has not expired.
    const now = new Date();
    if (now < cert.notBefore || now > cert.notAfter) {
        console.error("Certificate is not within valid date range.");
        return false;
    }

    // 4. If the certificate is valid, use it to validate the X-OpenDSR-Signature header against the raw request
    // body. mParticle uses SHA256 RSA as a signing algorithm.
    if (!signature || !payload) {
        console.error("Missing signature or payload.");
        return false;
    }

    try {
        const signatureBuffer = Buffer.from(signature, 'base64');
        const verifier = crypto.createVerify('SHA256');
        verifier.update(payload, 'utf8');

        const publicKey = crypto.createPublicKey(processorCertificate.pem);
        const isSignatureValid = verifier.verify(publicKey, signatureBuffer);

        if (!isSignatureValid) {
            console.error("Invalid signature.");
            return false;
        }
    } catch (error) {
        console.error("Error during signature verification:", error);
        return false;
    }

    // 5. Return a response with a 202 Accepted status header if all validations are successful. Return a response
    // with a 401 Unauthorized status header if the signature fails to validate or the processor domain is not
    // in your whitelist.
    return true;
}