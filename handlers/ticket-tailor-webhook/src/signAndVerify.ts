import { createHmac, timingSafeEqual } from 'crypto';
import type { Stage } from '@modules/stage';
import type { SQSRecord } from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';

const stage = process.env.STAGE as Stage;

export interface BuyerDetails {
	buyer_details:{
	  email: string;
	};
  }

export const signAndVerify = async (
    record: SQSRecord
): Promise<string | void> => {
    const webhookValidationSecret = await getWebhookValidationSecret(stage);
    const buyerDetails = JSON.parse(record.body) as BuyerDetails;

    const signature = record.messageAttributes['Tickettailor-Webhook-Signature']?.stringValue
    
    const hash = createHmac('sha256', webhookValidationSecret)
        .update(record.body)
        .digest('hex');

        if (typeof signature === 'string') {
              return timingSafeEqual(Buffer.from(hash), Buffer.from(signature)) ?  buyerDetails.buyer_details.email : console.log("invalid")
        }
        else {
            return console.log("invalid")
        }

};
