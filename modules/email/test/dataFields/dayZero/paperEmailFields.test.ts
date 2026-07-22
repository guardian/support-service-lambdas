import dayjs from 'dayjs';
import { buildPaperEmailFields } from '@modules/email/dataFields/dayZero/paperEmailFields';
import { DataExtensionNames } from '@modules/email/email';
import {
	deliveryAgentDetails,
	deliveryContact,
	directDebitPaymentMethod,
	emailAddress,
	emailUser,
	mandateId,
	paperPaymentSchedule,
	subscriptionNumber,
} from '../fixtures/emailFieldsTestData';

describe('Paper email fields', () => {
	const today = dayjs('2025-11-11');
	const expected = {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					subscription_rate: '£10.00 every month',
					subscriber_id: subscriptionNumber,
					delivery_address_line_1: '90 York Way',
					delivery_address_line_2: '',
					delivery_address_town: 'London',
					delivery_country: 'United Kingdom',
					delivery_postcode: deliveryContact.postalCode,
					payment_method: 'Direct Debit',
					first_name: deliveryContact.firstName,
					last_name: deliveryContact.lastName,
					account_holder: 'Mickey Mouse',
					package: 'Everyday',
					first_payment_date:
						'Tuesday, 18 November 2025 (Direct Debit may be up to 10 days after this)',
					bank_sort_code: '20-20-20',
					mandate_id: mandateId,
					bank_account_no: '******11',
				},
			},
		},
		DataExtensionName: DataExtensionNames.day0Emails.homeDelivery,
		IdentityUserId: '1234',
	};
	const expectedDeliveryAgentFields = {
		delivery_agent_email: deliveryAgentDetails.email,
		delivery_agent_telephone: deliveryAgentDetails.telephone,
		delivery_agent_name: deliveryAgentDetails.agentname,
		delivery_agent_address1: deliveryAgentDetails.address1,
		delivery_agent_address2: deliveryAgentDetails.address2,
		delivery_agent_town: deliveryAgentDetails.town,
		delivery_agent_county: deliveryAgentDetails.county,
		delivery_agent_postcode: deliveryAgentDetails.postcode,
	};
	it('should build correct email fields for HomeDelivery Everyday sub with DD', () => {
		const emailFields = buildPaperEmailFields({
			today: today,
			user: emailUser,
			currency: 'GBP',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paperPaymentSchedule,
			paymentMethod: directDebitPaymentMethod,
			mandateId: mandateId,
			productInformation: {
				product: 'HomeDelivery',
				ratePlan: 'Everyday',
				firstDeliveryDate: today.add(7, 'day').toDate(),
				deliveryInstructions: '',
				deliveryContact: deliveryContact,
			},
			taxMode: 'TaxInclusive',
		});

		expect(emailFields).toStrictEqual(expected);
	});
	it('should build correct email fields for NationalDelivery Everyday sub with DD and delivery agent details', () => {
		const emailFields = buildPaperEmailFields({
			today: today,
			user: emailUser,
			currency: 'GBP',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paperPaymentSchedule,
			paymentMethod: directDebitPaymentMethod,
			mandateId: mandateId,
			productInformation: {
				product: 'NationalDelivery',
				ratePlan: 'Everyday',
				firstDeliveryDate: today.add(7, 'day').toDate(),
				deliveryInstructions: '',
				deliveryContact: deliveryContact,
				deliveryAgent: 123,
			},
			deliveryAgentDetails: deliveryAgentDetails,
			taxMode: 'TaxInclusive',
		});

		expect(emailFields.To.ContactAttributes.SubscriberAttributes).toMatchObject(
			{
				...expected.To.ContactAttributes.SubscriberAttributes,
				...expectedDeliveryAgentFields,
			},
		);
		expect(emailFields.DataExtensionName).toBe(
			DataExtensionNames.day0Emails.nationalDelivery,
		);
		expect(emailFields.IdentityUserId).toBe(expected.IdentityUserId);
	});
});
