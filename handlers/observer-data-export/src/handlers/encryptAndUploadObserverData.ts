import * as crypto from 'crypto';
import { getFileFromS3, uploadFileToS3 } from '@modules/aws/s3';
import type { S3Event, SQSEvent } from 'aws-lambda';

export const handler = async (event: SQSEvent) => {
	console.log(JSON.stringify(event, null, 2));

	for (const sqsRecord of event.Records) {
		const body = JSON.parse(sqsRecord.body) as S3Event;

		for (const s3Record of body.Records) {
			const salesforceObserverDataTransferBucketName = s3Record.s3.bucket.name;
			const objectKey = s3Record.s3.object.key;

			const sharedBucketName = process.env.UnifidaSharedBucketName;
			const unifidaPublicRsaKeyFilePath =
				process.env.UnifidaPublicRsaKeyFilePath;
			const observerNewspaperSubscribersFolder =
				process.env.ObserverNewspaperSubscribersFolder;

			const utcTimestamp = new Date().toISOString();
			const todayDate = new Date().toISOString().split('T')[0];

			const aesKey = crypto.randomBytes(32);
			const aesIV = crypto.randomBytes(16);

			console.info("Fetching Unifida's RSA public key...");
			const publicKey = await getFileFromS3({
				bucketName: sharedBucketName,
				filePath: unifidaPublicRsaKeyFilePath,
			});
			const encryptedAesKey = crypto.publicEncrypt(
				{ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
				aesKey,
			);

			console.info('Fetching unencrypted CSV data...');
			const s3Object = await getFileFromS3({
				bucketName: salesforceObserverDataTransferBucketName,
				filePath: objectKey,
			});

			console.info('Generating MD5 hash of unencrypted CSV data...');
			const md5Hash = crypto.createHash('md5').update(s3Object).digest('hex');

			const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, aesIV);
			const encryptedFile = Buffer.concat([
				cipher.update(s3Object),
				cipher.final(),
			]);

			const uploadFolders = [
				`${observerNewspaperSubscribersFolder}/${todayDate}`,
				`${observerNewspaperSubscribersFolder}/latest`,
			];

			console.info('Uploading files to S3...');
			await Promise.all(
				uploadFolders.flatMap((folder) => [
					uploadFileToS3({
						bucketName: sharedBucketName,
						filePath: `${folder}/aes-key.enc`,
						content: encryptedAesKey,
					}),
					uploadFileToS3({
						bucketName: sharedBucketName,
						filePath: `${folder}/aes-iv.bin`,
						content: aesIV,
					}),
					uploadFileToS3({
						bucketName: sharedBucketName,
						filePath: `${folder}/data.csv.enc`,
						content: encryptedFile,
					}),
				]),
			);

			const buildManifestJson = (basePath: string) => ({
				timestamp: utcTimestamp,
				aesKey: `${basePath}/aes-key.enc`,
				aesIv: `${basePath}/aes-iv.bin`,
				csvData: `${basePath}/data.csv.enc`,
				csvDataMd5Hex: md5Hash,
			});

			await Promise.all(
				uploadFolders.map((folder) =>
					uploadFileToS3({
						bucketName: sharedBucketName,
						filePath: `${folder}/manifest.json`,
						content: JSON.stringify(
							buildManifestJson(`s3://${sharedBucketName}/${folder}`),
							null,
							2,
						),
					}),
				),
			);
		}
	}

	console.info('Files encrypted and uploaded successfully!');
};
