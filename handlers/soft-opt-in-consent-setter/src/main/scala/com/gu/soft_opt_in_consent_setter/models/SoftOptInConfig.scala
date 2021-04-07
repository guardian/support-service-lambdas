package com.gu.soft_opt_in_consent_setter.models

import com.gu.effects.GetFromS3.fetchString
import com.gu.effects.S3Location
import io.circe.parser.decode
import scala.util.{Failure, Success}

case class SoftOptInConfig(
  sfConfig: SalesforceConfig,
  identityConfig: IdentityConfig,
  consentsMapping: Map[String, Set[String]]
)

case class SalesforceConfig(
  sfAuthUrl: String,
  sfClientId: String,
  sfClientSecret: String,
  sfUsername: String,
  sfPassword: String,
  sfToken: String
)
case class IdentityConfig(identityUrl: String, identityToken: String)

object SoftOptInConfig {

  def get: Either[SoftOptInError, SoftOptInConfig] = {
    (for {
      sfUsername <- sys.env.get("sfUsername")
      sfClientId <- sys.env.get("sfClientId")
      sfClientSecret <- sys.env.get("sfClientSecret")
      sfPassword <- sys.env.get("sfPassword")
      sfToken <- sys.env.get("sfToken")
      sfAuthUrl <- sys.env.get("sfAuthUrl")
      identityUrl <- sys.env.get("identityUrl")
      identityToken <- sys.env.get("identityToken")
      consentsMapping <- getConsentsByProductMapping()
    } yield SoftOptInConfig(
      SalesforceConfig(
        sfAuthUrl,
        sfClientId,
        sfClientSecret,
        sfUsername,
        sfPassword,
        sfToken
      ),
      IdentityConfig(
        identityUrl,
        identityToken
      ),
      consentsMapping
    )).toRight(
      SoftOptInError(
        "SoftOptInConfig",
        "Could not obtain all config."
      )
    )
  }

  def getConsentsByProductMapping(): Option[Map[String, Set[String]]] = {
    fetchString(S3Location("kelvin-test", "ConsentsByProductMapping.json")) match {
      case Success(jsonContent) => decode[Map[String, Set[String]]](jsonContent).toOption
      case Failure(f) => None
    }
  }

}
