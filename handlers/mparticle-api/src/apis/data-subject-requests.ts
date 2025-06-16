import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { stageFromEnvironment } from '@modules/stage';
import type { DataSubjectRequestCallback } from '../../interfaces/data-subject-request-callback';
import type { DataSubjectRequestForm } from "../../interfaces/data-subject-request-form";
import type { DataSubjectRequestState } from "../../interfaces/data-subject-request-state";
import { DataSubjectRequestStatus } from "../../interfaces/data-subject-request-state";
import type { DataSubjectRequestSubmission } from "../../interfaces/data-subject-request-submission";
import { awsSqsConfig } from '../config/sqs';
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

async function requestDataSubjectApi<T>(url: string, options: {
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
 * @param {string} lambdaDomainUrl - Current running lambda domain url
 * @returns https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-success-response-body
 */
export const submitDataSubjectRequest = async (form: DataSubjectRequestForm, lambdaDomainUrl: string): Promise<DataSubjectRequestSubmission> => {
    const response = await requestDataSubjectApi<{
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
            subject_identities: {
                "controller_customer_id": {
                    value: form.userId,
                    encoding: 'raw',
                }
            },
            api_version: "3.0",
            status_callback_urls: [
                `${lambdaDomainUrl}/data-subject-requests/${form.requestId}/callback`
            ],
            group_id: form.userId, // Let's group by User Unique Id to group all requests related to that user (max 150 requests per group)
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
    const response = await requestDataSubjectApi<{
        controller_id: string;
        expected_completion_time: Date;
        subject_request_id: string;
        group_id: string | null;
        request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        api_version: string;
        results_url: string | null;
        extensions: Record<string, {
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

/**
 * Callback post made on completion of the Data Subject Request (DSR) by mParticle
 * When a request changes status, including when a request is first created, mParticle sends a callback
 * POST to all URLs specified in the status_callback_urls array of the request. Callbacks are queued
 * and sent every 15 minutes.
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#submit-a-data-subject-request-dsr
 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#example-response-body
 * @param {string} requestId - The ID of the request to check the status of.
 * @param {DataSubjectRequestCallback} payload - The data containing the data subject request state details.
 * @returns Confirmation message and timestamp
 */
export const processDataSubjectRequestCallback = async (requestId: string, payload: DataSubjectRequestCallback): Promise<{
    message: string;
    timestamp: Date;
}> => {
    // Check the received status and:
    // - Ignore it if not completed
    // - If completed, emit a ErasureJobOutcome event to SQS
    console.log("processDataSubjectRequestCallback", {
        requestId,
        form: payload
    });
    await Promise.resolve();

    interface ErasureJobOutcome {
        jobRunId: string;
        status: 'Processing' | 'Completed' | { type: 'Failed'; reason: string };
        timestamp: Date;
    }
    const message: ErasureJobOutcome = {
        jobRunId: "",
        status: 'Processing',
        timestamp: new Date(),
    };
    const queueName = `supporter-product-data-${stageFromEnvironment()}`;
    const client = new SQSClient(awsSqsConfig);
    console.log(
        `Sending message ${JSON.stringify(message)} to queue ${queueName}`,
    );
    const command = new SendMessageCommand({
        QueueUrl: queueName,
        MessageBody: JSON.stringify(message),
    });
    // const response = await client.send(command);
    console.log(`Response from message send was ${JSON.stringify(command)}`, client.config.defaultSigningName);

    return {
        message: 'Callback accepted and processed',
        timestamp: new Date(),
    };
};

export {
    requestDataSubjectApi
};