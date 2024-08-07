package com.gu.soft_opt_in_consent_setter.models

import com.gu.salesforce.SFAuthConfig

case class SoftOptInConfig(
    sfConfig: SFAuthConfig,
    sfApiVersion: String,
    identityConfig: IdentityConfig,
    mpapiConfig: MpapiConfig,
    stage: String,
)

case class IdentityConfig(identityUrl: String, identityToken: String)

case class MpapiConfig(mpapiUrl: String, mpapiToken: String)

object SoftOptInConfig {

  def apply(): Either[SoftOptInError, SoftOptInConfig] = {
    (for {
      salesforceConnectedAppSecrets <- Secrets.getSalesforceConnectedAppSecrets
      salesforceUserSecrets <- Secrets.getSalesforceUserSecrets
      identitySoftOptInConsentAPISecrets <- Secrets.getIdentitySoftOptInConsentAPISecrets
      mobilePurchasesAPIUserGetSubscriptionsSecrets <- Secrets.getMobilePurchasesAPIUserGetSubscriptionsSecrets
      sfApiVersion <- sys.env.get("sfApiVersion")
      stage <- sys.env.get("Stage")
    } yield SoftOptInConfig(
      SFAuthConfig(
        salesforceConnectedAppSecrets.authUrl,
        salesforceConnectedAppSecrets.clientId,
        salesforceConnectedAppSecrets.clientSecret,
        salesforceUserSecrets.sfUsername,
        salesforceUserSecrets.sfPassword,
        salesforceUserSecrets.sfToken,
      ),
      sfApiVersion,
      IdentityConfig(
        identitySoftOptInConsentAPISecrets.identityUrl,
        identitySoftOptInConsentAPISecrets.identityToken,
      ),
      MpapiConfig(
        mobilePurchasesAPIUserGetSubscriptionsSecrets.mpapiUrl,
        mobilePurchasesAPIUserGetSubscriptionsSecrets.mpapiToken,
      ),
      stage,
    )).toRight(
      SoftOptInError(
        "SoftOptInConfig: Could not obtain all config.",
      ),
    )
  }
}
