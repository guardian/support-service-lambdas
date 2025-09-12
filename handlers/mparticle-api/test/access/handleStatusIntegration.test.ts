/**
 * check that we can copy from an http url to an s3 bucket on completion of an mparticle SAR
 *
 * This uses the manage-frontend sitemap as a handy internet accessible file, and it uses the
 * testBucketName to write it to a bucket accessible from membership account
 *
 * @group integration
 */
import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	S3Client,
} from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import { getFileFromS3 } from '@modules/aws/s3';
import { Logger } from '@modules/routing/logger';
import type { GetRequestsResponse } from '../../src/apis/dataSubjectRequests/getStatus';
import { handleSarStatus } from '../../src/routers/baton/access/handleStatus';
import type { InitiationReference } from '../../src/routers/baton/initiationReference';
import type { BatonS3Writer } from '../../src/services/batonS3Writer';
import { BatonS3WriterImpl } from '../../src/services/batonS3Writer';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../../src/services/mparticleClient';

const s3Client = new S3Client(awsConfig);

test('fetch a real URL to a real S3 bucket, and check the content', async () => {
	const testBucketName = 'support-service-lambdas-test'; // this is a real bucket
	const sarS3BaseKey = 'handleSarStatusIntegrationTest/';
	const testRef = 'test12345Ref' as InitiationReference;

	const baseURL = 'https://manage.theguardian.com';
	const realPath = '/sitemap.txt';

	// we just want to make sure it's the right file, checking the length is rough and ready
	const expectedMinimumSitemapLength = 5000;
	const expectedMaximumSitemapLength = 10000;

	await deleteFiles(testBucketName, sarS3BaseKey);

	const { manageURLDataSubjectClient, realS3Client } =
		createRealServicesToTestEndpoints(
			realPath,
			baseURL,
			testBucketName,
			sarS3BaseKey,
		);

	// now run the actual business logic
	const actualS3Url = (
		await handleSarStatus(manageURLDataSubjectClient, realS3Client, testRef)
	).resultLocations?.[0];

	console.log("checking what's in s3 " + actualS3Url);

	const actualS3File = await getFileFromS3(parseS3Url(actualS3Url!));

	expect(actualS3File.length).toBeGreaterThan(expectedMinimumSitemapLength);
	expect(actualS3File.length).toBeLessThan(expectedMaximumSitemapLength);
}, 30000);

async function deleteFiles(
	bucketName: string,
	sarS3BaseKey: string,
): Promise<void> {
	console.log(`Deleting stale files from s3://${bucketName}${sarS3BaseKey}*`);

	const listResponse = await s3Client.send(
		new ListObjectsV2Command({
			Bucket: bucketName,
			Prefix: sarS3BaseKey,
		}),
	);

	if (listResponse.Contents && listResponse.Contents.length > 0) {
		const objects = listResponse.Contents.flatMap((obj) =>
			obj.Key ? [obj.Key] : [],
		);
		const result = await s3Client.send(
			new DeleteObjectsCommand({
				Bucket: bucketName,
				Delete: {
					Objects: objects.map((Key) => ({ Key })),
				},
			}),
		);

		console.log(
			`Deleted\n  ${objects.join('\n  ')}\n${JSON.stringify(result)}`,
		);
	} else {
		console.log('No files found to delete');
	}
}

function parseS3Url(s3Url: string): { bucketName: string; filePath: string } {
	const match = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
	if (!match) {
		throw new Error(`Invalid S3 URL format: ${s3Url}`);
	}
	return { bucketName: match[1]!, filePath: match[2]! };
}

function createRealServicesToTestEndpoints(
	realPath: string,
	baseURL: string,
	bucketName: string,
	sarS3BaseKey: string,
) {
	const mockSARStatusResponse: GetRequestsResponse = {
		expected_completion_time: new Date(),
		subject_request_id: 'subject_request_idsubject_request_id',
		request_status: 'completed',
		results_url: baseURL + realPath,
		controller_id: 'controller_idcontroller_id',
	};
	const manageURLDataSubjectClient: MParticleClient<DataSubjectAPI> = {
		clientType: 'dataSubject',
		get: jest.fn().mockResolvedValue({
			success: true,
			data: mockSARStatusResponse,
		}),
		post: jest.fn().mockRejectedValue(new Error('Mock error')),
		getStream: jest.fn().mockImplementation(async (path: string) => {
			expect(path).toBe(realPath);
			const response = await fetch(baseURL + realPath);
			return response.body;
		}),
		baseURL,
	};

	const realS3Client: BatonS3Writer = new BatonS3WriterImpl(
		bucketName,
		sarS3BaseKey,
		new Logger(),
	);
	return {
		manageURLDataSubjectClient,
		realS3Client,
	};
}
