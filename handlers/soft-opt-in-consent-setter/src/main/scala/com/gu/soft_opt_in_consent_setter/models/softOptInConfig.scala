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

  def apply(maybeStage: Option[String], maybeSfApiVersion: Option[String]): Either[SoftOptInError, SoftOptInConfig] = {
    (for {
      stage <- maybeStage.toRight("stage is missing")
      secrets <- Secrets(stage)
      salesforceConnectedAppSecrets <- secrets.getSalesforceConnectedAppSecrets
      salesforceUserSecrets <- secrets.getSalesforceUserSecrets
      identitySoftOptInConsentAPISecrets <- secrets.getIdentitySoftOptInConsentAPISecrets
      mobilePurchasesAPIUserGetSubscriptionsSecrets <- secrets.getMobilePurchasesAPIUserGetSubscriptionsSecrets
      sfApiVersion <- maybeSfApiVersion.toRight("sfApiVersion is missing")
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
    )).left.map(err =>
      SoftOptInError(
        "SoftOptInConfig: Could not obtain all config: " + err,
      ),
    )
  }
}
