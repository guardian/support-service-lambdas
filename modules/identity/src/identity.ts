import { ValidationError } from '@modules/errors';
import type { Stage } from '@modules/stage';
import type { JwtClaims } from '@okta/jwt-verifier';
import OktaJwtVerifier from '@okta/jwt-verifier';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// The claims object returned by Okta should include the identity_id
interface JwtClaimsWithUserID extends JwtClaims {
	legacy_identity_id?: string;
	braze_uuid?: string;
}
type OktaConfig = {
	issuer: string;
	audience: string;
};

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

export class IdentityAuthorisationHelper {
	config;
	oktaJwtVerifier;
	constructor(stage: Stage, requiredScopes: string[] = []) {
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
		const accessToken = authHeader.match(/Bearer (.+)/)?.[1];
		if (accessToken) {
			return this.oktaJwtVerifier.verifyAccessToken(
				accessToken,
				this.config.audience,
			);
		} else {
			throw new Error('Invalid Authorization header');
		}
	};
	checkIdentityToken = async (authHeader: string): Promise<string> => {
		return this.verifyAccessToken(authHeader)
			.then((jwt) => {
				const claims = jwt.claims as JwtClaimsWithUserID;
				if (!claims.legacy_identity_id) {
					throw new Error('No legacy_identity_id in claims');
				}
				return claims.legacy_identity_id;
			})
			.catch((err) => {
				console.log(`Failed to verify access token: ${String(err)}`);
				throw err;
			});
	};
	public identityIdFromRequest = (
		apiGatewayEvent: APIGatewayProxyEvent,
	): Promise<string> => {
		if (apiGatewayEvent.headers.Authorization === undefined) {
			throw new ValidationError('No Authorization header found in the request');
		}
		return this.checkIdentityToken(apiGatewayEvent.headers.Authorization);
	};
}
