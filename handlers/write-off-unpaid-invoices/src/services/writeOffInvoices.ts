// import { stageFromEnvironment } from '@modules/stage';
// import { type LambdaEvent } from '../handlers/writeOffInvoices';
// import { getZuoraOAuthToken } from './getOAuthToken';

// export type WriteOffInvoiceInput = {
// 	invoice_id: string;
// };

// export const writeOffInvoices = async (
// 	event: LambdaEvent,
// ) => {
// 	const failedRecords = [];
// 	const stage = stageFromEnvironment();
// 	const { Items } = event;

// 	for (const batchInput of Items) {
// 		const {
// 			item: { invoice_id: invoiceId },
// 			comment,
// 			reasonCode,
// 		} = batchInput;

// 		const payload = {
// 			comment,
// 			reasonCode,
// 		};

// 		try {
// 			const accessToken = await getZuoraOAuthToken({ stage });

// 			const domain = {
// 				CODE: `https://rest.apisandbox.zuora.com`,
// 				CSBX: `https://rest.test.zuora.com`,
// 				PROD: `https://rest.zuora.com`,
// 			};

// 			const response = await fetch(
// 				`${domain[stage]}/v1/invoices/${invoiceId}/write-off`,
// 				{
// 					method: 'PUT',
// 					headers: {
// 						Authorization: `Bearer ${accessToken}`,
// 						'Content-Type': 'application/json',
// 					},
// 					body: JSON.stringify(payload),
// 				},
// 			);

// 			if (response.ok) {
// 				const responseData = (await response.json()) as {
// 					success: boolean;
// 					reasons: Array<{ code: string; message: string }>;
// 				};

// 				if (!responseData.success) {
// 					failedRecords.push({
// 						invoice_id: invoiceId,
// 						error: responseData.reasons
// 							.map((reason) => `${reason.code}: ${reason.message}`)
// 							.join(', '),
// 					});
// 					console.error(
// 						`Invoice ${invoiceId} failed: ${JSON.stringify(
// 							responseData.reasons,
// 							null,
// 							2,
// 						)}`,
// 					);
// 				}
// 			} else {
// 				const errorData = await response.json();
// 				failedRecords.push({
// 					invoice_id: invoiceId,
// 					error: JSON.stringify(errorData, null, 2),
// 				});
// 				console.error(
// 					'Failed to process invoice:',
// 					JSON.stringify(errorData, null, 2),
// 				);
// 			}
// 		} catch (error) {
// 			console.error('Error during API call:', error);
// 			failedRecords.push({ invoice_id: invoiceId, error: String(error) });
// 		}
// 	}

// 	if (failedRecords.length > 0) {
// 		throw new Error(JSON.stringify(failedRecords));
// 	}
// };
