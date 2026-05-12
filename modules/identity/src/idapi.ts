import * as console from 'node:console';
import { RestClientError } from '@modules/zuora/restClient';
import { z } from 'zod';
import type { IdentityClient } from './identityClient';

const identityUserSchema = z.object({
	id: z.string(),
	primaryEmailAddress: z.string(),
	publicFields: z.object({ displayName: z.string() }),
});

type IdentityUser = z.infer<typeof identityUserSchema>;

const userByEmailResponseSchema = z.object({
	status: z.literal('ok'),
	user: identityUserSchema,
});

const guestAccountResponseSchema = z.object({
	status: z.literal('ok'),
	guestRegistrationRequest: z.object({
		userId: z.string(),
	}),
});

export const getUserByEmail = async (
	client: IdentityClient,
	email: string,
): Promise<IdentityUser | undefined> => {
	try {
		const response = await client.get<
			z.input<typeof userByEmailResponseSchema>,
			z.output<typeof userByEmailResponseSchema>,
			typeof userByEmailResponseSchema
		>(
			`/user?emailAddress=${encodeURIComponent(email)}`,
			userByEmailResponseSchema,
		);
		return response.user;
	} catch (error) {
		if (error instanceof RestClientError && error.status === 404) {
			// A 404 means that there is no user with that email, so we return undefined.
			// Any other error should be thrown
			console.log(`No user found for email ${email}`);
			return;
		}
		throw error;
	}
};

export const createGuestAccount = async (
	client: IdentityClient,
	email: string,
): Promise<string> => {
	const response = await client.post<
		z.input<typeof guestAccountResponseSchema>,
		z.output<typeof guestAccountResponseSchema>,
		typeof guestAccountResponseSchema
	>(
		`/guest?accountVerificationEmail=true`,
		JSON.stringify({ primaryEmailAddress: email }),
		guestAccountResponseSchema,
	);
	return response.guestRegistrationRequest.userId;
};

export const getOrCreateIdentityId = async (
	client: IdentityClient,
	email: string,
): Promise<string> => {
	const user = await getUserByEmail(client, email);
	if (user) {
		return user.id;
	}
	return await createGuestAccount(client, email);
};
