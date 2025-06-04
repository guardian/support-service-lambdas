import { stageFromEnvironment } from '@modules/stage';
import type { DataSubjectRequestForm } from "../../interfaces/data-subject-request-form";
import type { DataSubjectRequestState } from "../../interfaces/data-subject-request-state";
import { DataSubjectRequestStatus } from "../../interfaces/data-subject-request-state";
import type { DataSubjectRequestSubmission } from "../../interfaces/data-subject-request-submission";
import type { HttpResponse } from "../http";
import { makeHttpRequest } from "../http";
import { getSecretValue } from '../secrets';

function parseDataSubjectRequestStatus(status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): DataSubjectRequestStatus {
    switch (status) {
        case 'pending':
            return DataSubjectRequestStatus.Pending;
        case 'in_progress':
            return DataSubjectRequestStatus.InProgress;
        case 'completed':
            return DataSubjectRequestStatus.Completed;
        case 'cancelled':
            return DataSubjectRequestStatus.Cancelled;
    }
}

let _workspaceKey: string | undefined;
let _workspaceSecret: string | undefined;
async function getWorkspaceKeyAndSecret(): Promise<{ key: string; secret: string }> {
    if (!_workspaceKey || !_workspaceSecret) {
        // Load them from AWS Systems Manager Parameter Store
        const [workspaceKey, workspaceSecret] = await Promise.all([
            getSecretValue(
                `/mparticle-api/${stageFromEnvironment()}/workspace-key`,
                'MPARTICLE_WORKSPACE_KEY'
            ),
            getSecretValue(
                `/mparticle-api/${stageFromEnvironment()}/workspace-secret`,
                'MPARTICLE_WORKSPACE_SECRET'
            ),
        ]);
        _workspaceKey = workspaceKey;
        _workspaceSecret = workspaceSecret;
    }

    return {
        key: _workspaceKey,
        secret: _workspaceSecret
    }
}

async function requestDataSubjectRequestApi<T>(url: string, options: {
    method?: 'GET' | 'POST';
    body?: unknown;
}): Promise<HttpResponse<T>> {
    const workspaceKeyAndSecret: { key: string; secret: string } = await getWorkspaceKeyAndSecret();
    return makeHttpRequest<T>(url, {
        method: options.method,
        baseURL: `https://opendsr.mparticle.com/v3`,
        headers: {
            'Content-Type': 'application/json',
            /**
             * Authentication
             * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
             * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
             * is for a single workspace and scopes the DSR to this workspace only.
             * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
             */
            'Authorization': `Basic ${Buffer.from(`${workspaceKeyAndSecret.key}:${workspaceKeyAndSecret.secret}`).toString('base64')}`,
        },
        body: options.body
    });
}

/**
 * Submit a Data Subject Request (DSR)
 * A request in the OpenDSR format communicates a Data Subject’s wish to access or erase their data.
 * The OpenDSR Request takes a JSON request body and requires a Content-Type: application/json header.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * @param {DataSubjectRequestForm} form - The form containing the data subject request details.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const submitDataSubjectRequest = async (form: DataSubjectRequestForm): Promise<DataSubjectRequestSubmission> => {
    const response = await requestDataSubjectRequestApi<{
        expected_completion_time: Date;
        received_time: Date;
        encoded_request: string;
        subject_request_id: string;
        controller_id: string;
    }>(`/requests`, {
        method: 'POST',
        body: {
            regulation: form.regulation,
            subject_request_id: form.requestId,
            subject_request_type: form.requestType,
            submitted_time: form.submittedTime,
            skip_waiting_period: true,
            subject_identities: [
                {
                    identity_type: 'controller_customer_id',
                    value: form.userId,
                    encoding: 'raw',
                }
            ],
            api_version: "3.0",
            "status_callback_urls": [
                "https://exampleurl.com/opendsr/callbacks" // <- We should create an endpoint on this app to receive this status callback and propagate its state. In alternative we can call the BigQuery erasure app.
            ],
            group_id: form.userId, // Let's group by User Unique Id to group all requests related to that user (max 150 requests per group)
            extensions: []
        }
    });

    if (!response.success) {
        throw response.error;
    }

    return {
        expectedCompletionTime: new Date(response.data.expected_completion_time),
        receivedTime: new Date(response.data.received_time),
        requestId: response.data.subject_request_id,
        controllerId: response.data.controller_id,
    };
};

/**
 * Get the status of an OpenDSR request
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#get-the-status-of-an-opendsr-request
 * @param {string} requestId - The ID of the request to check the status of.
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 */
export const getStatusOfDataSubjectRequest = async (requestId: string): Promise<DataSubjectRequestState> => {
    const response = await requestDataSubjectRequestApi<{
        controller_id: string;
        expected_completion_time: Date;
        subject_request_id: string;
        group_id: string | null;
        request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        api_version: string;
        results_url: string | null;
        extensions: Array<{
            domain: string;
            name: string;
            status: 'pending' | 'skipped' | 'sent' | 'failed';
            status_message: string;
        }> | null;
    }>(`/requests/${requestId}`, {
        method: "GET"
    });

    if (!response.success) {
        throw response.error;
    }

    return {
        expectedCompletionTime: new Date(response.data.expected_completion_time),
        requestId: response.data.subject_request_id,
        controllerId: response.data.controller_id,
        requestStatus: parseDataSubjectRequestStatus(response.data.request_status),
        resultsUrl: response.data.results_url,
    };
};