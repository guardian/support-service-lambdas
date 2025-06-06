import { stageFromEnvironment } from '@modules/stage';
import type { EventBatch } from '../../interfaces/event-batch';
import type { HttpResponse } from "../http";
import { makeHttpRequest } from "../http";
import { getSecretValue } from '../secrets';

let _inputPlatformKey: string | undefined;
let _inputPlatformSecret: string | undefined;
async function getInputPlatformKeyAndSecret(): Promise<{ key: string; secret: string }> {
    if (!_inputPlatformKey || !_inputPlatformSecret) {
        // Load them from AWS Systems Manager Parameter Store
        const [workspaceKey, workspaceSecret] = await Promise.all([
            getSecretValue(
                `/mparticle-api/${stageFromEnvironment()}/input-platform-key`,
                'MPARTICLE_INPUT_PLATFORM_KEY'
            ),
            getSecretValue(
                `/mparticle-api/${stageFromEnvironment()}/input-platform-secret`,
                'MPARTICLE_INPUT_PLATFORM_SECRET'
            ),
        ]);
        _inputPlatformKey = workspaceKey;
        _inputPlatformSecret = workspaceSecret;
    }

    return {
        key: _inputPlatformKey,
        secret: _inputPlatformSecret
    }
}

const pod = process.env.MPARTICLE_POD ?? 'EU1';
async function requestEventsApi<T>(url: string, options: {
    method?: 'POST';
    body?: unknown;
}): Promise<HttpResponse<T>> {
    const inputPlatformKeyAndSecret: { key: string; secret: string } = await getInputPlatformKeyAndSecret();
    return makeHttpRequest<T>(url, {
        method: options.method,
        baseURL: `https://s2s.${pod}.mparticle.com/v2`,
        headers: {
            'Content-Type': 'application/json',
            /**
             * Authentication
             * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
             * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
             * is for a single workspace and scopes the DSR to this workspace only.
             * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
             */
            'Authorization': `Basic ${Buffer.from(`${inputPlatformKeyAndSecret.key}:${inputPlatformKeyAndSecret.secret}`).toString('base64')}`,
        },
        body: options.body
    });
}

/**
 * Upload an event batch
 * Sends usage data into mParticle
 * https://docs.mparticle.com/developers/apis/http/#upload-an-event-batch
 * @param batch - The event batch to upload
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const uploadAnEventBatch = async (batch: EventBatch): Promise<object> => {
    const response = await requestEventsApi(`/events`, {
        method: 'POST',
        body: {
            events: batch.events.map((event => {
                return {
                    data: event.data,
                    event_type: event.eventType
                };
            })),
            device_info: batch.deviceInfo,
            user_attributes: batch.userAttributes,
            deleted_user_attributes: batch.deletedUserAttributes,
            user_identities: batch.userIdentities,
            application_info: batch.applicationInfo,
            schema_version: batch.schemaVersion,
            environment: batch.environment,
            context: batch.context,
            ip: batch.ip
        }
    });

    if (!response.success) {
        throw response.error;
    }

    return {};
};

export {
    requestEventsApi
};