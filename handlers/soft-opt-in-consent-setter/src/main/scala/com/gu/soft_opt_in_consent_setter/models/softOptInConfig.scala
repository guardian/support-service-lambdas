package com.gu.soft_opt_in_consent_setter.models

import com.gu.effects.GetFromS3.fetchString
import com.gu.effects.S3Location
import com.gu.salesforce.SFAuthConfig
import io.circe.parser.decode
import scala.util.{Failure, Success}

case class SoftOptInConfig(
    sfConfig: SFAuthConfig,
    sfApiVersion: String,
    identityConfig: IdentityConfig,
    mpapiConfig: MpapiConfig,
    consentsMapping: Map[String, Set[String]],
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
      consentsMapping <- getConsentsByProductMapping(stage)
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
      consentsMapping,
      stage,
    )).toRight(
      SoftOptInError(
        "SoftOptInConfig: Could not obtain all config.",
      ),
    )
  }

  def getConsentsByProductMapping(stage: String): Option[Map[String, Set[String]]] = {
    fetchString(S3Location("soft-opt-in-consent-setter", s"$stage/ConsentsByProductMapping.json")) match {
      case Success(jsonContent) => decode[Map[String, Set[String]]](jsonContent).toOption
      case Failure(f) => None
    }
  }
}
