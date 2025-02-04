import { getSecretValue } from './secretsManager';

type User = {
	id: string;
};

type GuestRegistrationRequest = {
	token: string;
	userId: string;
	timeIssued: string;
};

type CreateUserSuccessResponse = {
	status: 'ok';
	guestRegistrationRequest: GuestRegistrationRequest;
};

type GetUserSuccessResponse = {
	status: 'ok';
	user: User;
};

type ErrorDetail = {
	message: string;
	description: string;
	context: string;
};

type ErrorResponse = {
	status: 'error';
	errors: ErrorDetail[];
};

type CreateUserResponse = CreateUserSuccessResponse | ErrorResponse;
type GetUserResponse = GetUserSuccessResponse | ErrorResponse;

export const getBearerToken = async () => {
	try {
		const { bearerToken } = await getSecretValue<{ bearerToken: string }>({
			secretName: `${process.env.STAGE}/Identity/${process.env.APP}`,
		});
		return bearerToken;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const getUser = async ({ email }: { email: string }) => {
	try {
		console.log('Fetching user from Identity API...');
		const response = await fetch(
			`${process.env.IDENTITY_API_URL}/user?` +
				new URLSearchParams({
					emailAddress: email,
				}).toString(),
			{
				method: 'GET',
				headers: {
					'x-gu-id-client-access-token': `Bearer ${await getBearerToken()}`,
				},
			},
		);
		const data = (await response.json()) as GetUserResponse;
		console.log(data);
		if (data.status == 'ok') {
			console.log(data.status);
			console.log('data.status is ok');
			return { user: data.user };
		} else {
			return { errors: data.errors };
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const createGuestUser = async ({
	email,
	firstName,
}: {
	email: string;
	firstName: string;
}) => {
	try {
		console.log('Creating new guest user...');
		const response = await fetch(
			`${process.env.IDENTITY_API_URL}/guest?` +
				new URLSearchParams({
					accountVerificationEmail: 'true',
				}).toString(),
			{
				method: 'POST',
				headers: {
					'x-gu-id-client-access-token': `Bearer ${await getBearerToken()}`,
				},
				body: JSON.stringify({
					primaryEmailAddress: email,
					publicFields: { firstName },
				}),
			},
		);
		const data = (await response.json()) as CreateUserResponse;
		console.log(data);
		if (data.status == 'ok') {
			return { guestRegistrationRequest: data.guestRegistrationRequest };
		} else {
			return { errors: data.errors };
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
