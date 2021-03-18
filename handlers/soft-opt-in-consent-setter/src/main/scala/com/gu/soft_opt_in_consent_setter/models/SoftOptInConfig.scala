package com.gu.soft_opt_in_consent_setter.models

import com.gu.effects.GetFromS3.fetchString
import com.gu.effects.S3Location
import com.gu.soft_opt_in_consent_setter.ConsentsCalculatorV2
import io.circe.parser.decode

import scala.util.{Failure, Success}

case class SoftOptInConfig(
    authUrl: String,
    clientId: String,
    clientSecret: String,
    userName: String,
    password: String,
    token: String
)

object SoftOptInConfig {

  val optConfig: Either[SoftOptInError, SoftOptInConfig] = {
    (for {
      sfUserName <- Option(System.getenv("username"))
      sfClientId <- Option(System.getenv("clientId"))
      sfClientSecret <- Option(System.getenv("clientSecret"))
      sfPassword <- Option(System.getenv("password"))
      sfToken <- Option(System.getenv("token"))
      sfAuthUrl <- Option(System.getenv("authUrl"))

    } yield SoftOptInConfig(
      userName = sfUserName,
      clientId = sfClientId,
      clientSecret = sfClientSecret,
      password = sfPassword,
      token = sfToken,
      authUrl = sfAuthUrl
    )).toRight(
      SoftOptInError(
        "Environment",
        "Could not obtain all environment variables."
      )
    )
  }

  val consentsByProductJson: String = fetchString(
    S3Location("kelvin-test", "ConsentsByProductMapping.json")
  ) match {
    case Success(lines) => lines
    case Failure(f)     => "error"
  }

  val consentsByProductMapping: Map[String, Set[String]] = {
    decode[Map[String, Set[String]]](consentsByProductJson) match {
      case Right(mapContent) => mapContent
    }
  }
  def consentsCalculatorV2 =
    new ConsentsCalculatorV2(
      consentsByProductMapping
    )
}
