/**
 * check that we can copy from an http url to an s3 bucket on completion of an mparticle SAR
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
import { HandleSarStatus } from '../src/routers/baton/handle-sar-status';

const s3Client = new S3Client(awsConfig);

test('fetchToS3', async () => {
	const bucketName = 'support-service-lambdas-test'; // this is a real bucket
	const sarS3BaseKey = 'handleSarStatusIntegrationTest/';
	const dummyRef = 'dummy-ref';

	const realUrl = 'https://manage.theguardian.com/sitemap.txt';
	// we just want to make sure it's the right file, checking the length is rough and ready
	const expectedMinimumSitemapLength = 5000;
	const expectedMaximumSitemapLength = 10000;

	const dateTimeString = '2025-08-06T18:19:42.123Z';
	const handleSarStatus = new HandleSarStatus(
		bucketName,
		sarS3BaseKey,
		() => new Date(Date.parse(dateTimeString)),
	);

	await deleteFiles(bucketName, sarS3BaseKey);

	const actualS3Key = await handleSarStatus.fetchToS3(realUrl, dummyRef);

	console.log("checking what's in s3 " + actualS3Key);
	const s3File = await getFileFromS3({ bucketName, filePath: actualS3Key });

	expect(s3File.length).toBeGreaterThan(expectedMinimumSitemapLength);
	expect(s3File.length).toBeLessThan(expectedMaximumSitemapLength);
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
