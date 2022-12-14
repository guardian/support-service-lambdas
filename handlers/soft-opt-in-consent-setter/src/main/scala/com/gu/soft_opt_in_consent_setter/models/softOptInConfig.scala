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
    consentsMapping: Map[String, Set[String]],
    stage: String,
)

case class IdentityConfig(identityUrl: String, identityToken: String)

object SoftOptInConfig {

  def apply(): Either[SoftOptInError, SoftOptInConfig] = {
    (for {
      sfUsername <- sys.env.get("sfUsername")
      sfClientId <- sys.env.get("sfClientId")
      sfClientSecret <- sys.env.get("sfClientSecret")
      sfPassword <- sys.env.get("sfPassword")
      sfToken <- sys.env.get("sfToken")
      sfAuthUrl <- sys.env.get("sfAuthUrl")
      sfApiVersion <- sys.env.get("sfApiVersion")
      identityUrl <- sys.env.get("identityUrl")
      identityToken <- sys.env.get("identityToken")
      stage <- sys.env.get("Stage")
      consentsMapping <- getConsentsByProductMapping(stage)
    } yield SoftOptInConfig(
      SFAuthConfig(
        sfAuthUrl,
        sfClientId,
        sfClientSecret,
        sfUsername,
        sfPassword,
        sfToken,
      ),
      sfApiVersion,
      IdentityConfig(
        identityUrl,
        identityToken,
      ),
      consentsMapping,
      stage,
    )).toRight(
      SoftOptInError(
        "SoftOptInConfig",
        "Could not obtain all config.",
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
