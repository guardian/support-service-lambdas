// import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

// const client = new DynamoDBClient({
// 	region: process.env.region,
// });

// export const putItem = async ({ tableName }: { tableName: string }) => {
// 	const input = {
// 		TableName: tableName,
// 		Item: {
// 			'<keys>': {
// 				// AttributeValue Union: only one key present
// 				S: 'STRING_VALUE',
// 				N: 'STRING_VALUE',
// 				B: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
// 				SS: [
// 					// StringSetAttributeValue
// 					'STRING_VALUE',
// 				],
// 				NS: [
// 					// NumberSetAttributeValue
// 					'STRING_VALUE',
// 				],
// 				BS: [
// 					// BinarySetAttributeValue
// 					new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
// 				],
// 				M: {
// 					// MapAttributeValue
// 					'<keys>': {
// 						//  Union: only one key present
// 						S: 'STRING_VALUE',
// 						N: 'STRING_VALUE',
// 						B: new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
// 						SS: ['STRING_VALUE'],
// 						NS: ['STRING_VALUE'],
// 						BS: [
// 							new Uint8Array(), // e.g. Buffer.from("") or new TextEncoder().encode("")
// 						],
// 						M: {
// 							'<keys>': '<AttributeValue>',
// 						},
// 						L: [
// 							// ListAttributeValue
// 							'<AttributeValue>',
// 						],
// 						NULL: true || false,
// 						BOOL: true || false,
// 					},
// 				},
// 				L: ['<AttributeValue>'],
// 				NULL: true || false,
// 				BOOL: true || false,
// 			},
// 		},
// 		Expected: {
// 			// ExpectedAttributeMap
// 			'<keys>': {
// 				// ExpectedAttributeValue
// 				Value: '<AttributeValue>',
// 				Exists: true || false,
// 				ComparisonOperator:
// 					'EQ' ||
// 					'NE' ||
// 					'IN' ||
// 					'LE' ||
// 					'LT' ||
// 					'GE' ||
// 					'GT' ||
// 					'BETWEEN' ||
// 					'NOT_NULL' ||
// 					'NULL' ||
// 					'CONTAINS' ||
// 					'NOT_CONTAINS' ||
// 					'BEGINS_WITH',
// 				AttributeValueList: [
// 					// AttributeValueList
// 					'<AttributeValue>',
// 				],
// 			},
// 		},
// 		ReturnValues:
// 			'NONE' || 'ALL_OLD' || 'UPDATED_OLD' || 'ALL_NEW' || 'UPDATED_NEW',
// 		ReturnConsumedCapacity: 'INDEXES' || 'TOTAL' || 'NONE',
// 		ReturnItemCollectionMetrics: 'SIZE' || 'NONE',
// 		ConditionalOperator: 'AND' || 'OR',
// 		ConditionExpression: 'STRING_VALUE',
// 		ExpressionAttributeNames: {
// 			// ExpressionAttributeNameMap
// 			'<keys>': 'STRING_VALUE',
// 		},
// 		ExpressionAttributeValues: {
// 			// ExpressionAttributeValueMap
// 			'<keys>': '<AttributeValue>',
// 		},
// 		ReturnValuesOnConditionCheckFailure: 'ALL_OLD' || 'NONE',
// 	};
// 	const command = new PutItemCommand(input);
// 	const response = await client.send(command);
// 	console.log(response);
// };
