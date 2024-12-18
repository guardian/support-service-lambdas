import type { Stage } from '@modules/utils/stage';
import OktaJwtVerifier from '@okta/jwt-verifier';
import { z } from 'zod';

// The claims object returned by Okta. It should include the identity ID and email
const jwtClaimsSchema = z.object({
	legacy_identity_id: z.string(),
	sub: z.string(),
});

export type IdentityUserDetails = {
	identityId: string;
	email: string;
};
type OktaConfig = {
	issuer: string;
	audience: string;
};

export class InvalidScopesError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidScopesError';
	}
}

export class ExpiredTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ExpiredTokenError';
	}
}

export class InvalidTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidTokenError';
	}
}

const loadOktaConfig = (stage: Stage): OktaConfig => {
	if (stage === 'PROD') {
		return {
			issuer: 'https://profile.theguardian.com/oauth2/aus3xgj525jYQRowl417',
			audience: 'https://profile.theguardian.com/',
		};
	}
	return {
		issuer:
			'https://profile.code.dev-theguardian.com/oauth2/aus3v9gla95Toj0EE0x7',
		audience: 'https://profile.code.dev-theguardian.com/',
	};
};

export class OktaTokenHelper {
	config;
	oktaJwtVerifier;
	constructor(stage: Stage, requiredScopes: string[]) {
		this.config = loadOktaConfig(stage);
		this.oktaJwtVerifier = new OktaJwtVerifier({
			issuer: this.config.issuer,
			assertClaims: {
				'scp.includes': requiredScopes,
			},
			cacheMaxAge: 24 * 60 * 60 * 1000, // 24 hours
		} as OktaJwtVerifier.VerifierOptions);
	}
	verifyAccessToken = (authHeader: string): Promise<OktaJwtVerifier.Jwt> => {
		const accessToken = authHeader.replace('Bearer ', '');
		if (accessToken) {
			return this.oktaJwtVerifier.verifyAccessToken(
				accessToken,
				this.config.audience,
			);
		} else {
			throw new InvalidTokenError('Invalid Authorization header');
		}
	};
	getIdentityId = async (authHeader: string): Promise<IdentityUserDetails> => {
		try {
			const jwt = await this.verifyAccessToken(authHeader);
			console.log('Successfully verified access token');
			const claims = jwtClaimsSchema.parse(jwt.claims);
			return {
				identityId: claims.legacy_identity_id,
				email: claims.sub,
			};
		} catch (err) {
			console.log(`Failed to verify access token: ${String(err)}`);
			if (err instanceof Error) {
				if (err.name === 'JwtParseError' && err.message === 'Jwt is expired') {
					throw new ExpiredTokenError('Jwt is expired');
				}
				if (
					err.name === 'JwtParseError' &&
					err.message === 'Jwt cannot be parsed'
				) {
					throw new InvalidTokenError('Jwt cannot be parsed');
				}
				if (
					/claim 'scp' value.*does not include expected value .*/.test(
						err.message,
					)
				) {
					throw new InvalidScopesError(
						'Token does not have the required scopes',
					);
				}
			}
			throw err;
		}
	};
}
