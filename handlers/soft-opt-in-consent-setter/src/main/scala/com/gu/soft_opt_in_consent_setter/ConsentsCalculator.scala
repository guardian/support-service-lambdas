package com.gu.soft_opt_in_consent_setter

import com.gu.effects.GetFromS3.fetchString
import com.gu.effects.S3Location
import com.gu.soft_opt_in_consent_setter.models.SoftOptInError
import io.circe._
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax.EncoderOps

import scala.util.{Failure, Success}

object ConsentsCalculator {

  def consentsMappings(): Either[Error, Map[String, Set[String]]] = {
    val bucketName = "kelvin-test"
    val fileName = "ConsentsByProductMapping.json"

    val consentsByProductJson: String = fetchString(
      S3Location(bucketName, fileName)
    ) match {
        case Success(jsonContent) => jsonContent
        case Failure(f) => "error"
      }

    decode[Map[String, Set[String]]](consentsByProductJson)
  }

  def getAcqConsents(
    productName: String
  ): Either[SoftOptInError, Set[String]] = {

    consentsMappings match {
      case Left(error) =>
        Left(
          SoftOptInError(
            "ConsentsCalculator",
            s"Error occurred getting AcqConsents: ${error.toString}"
          )
        )
      case Right(mapContent) =>
        mapContent
          .get(productName)
          .toRight(
            SoftOptInError(
              "ConsentsCalculator",
              s"getAcqConsents couldn't find $productName in consentsMappings"
            )
          )
    }
  }

  def getCancConsents(
    canceledProductName: String,
    ownedProductNames: Set[String]
  ): Either[SoftOptInError, Set[String]] = {
    ownedProductNames
      .foldLeft[Either[SoftOptInError, Set[String]]](Right(Set())) {
        (acc, ownedProductName) =>
          consentsMappings match {
            case Left(error) =>
              Left(
                SoftOptInError(
                  "ConsentsCalculator",
                  s"Error occurred getting CancConsents: ${error.toString}"
                )
              )
            case Right(mapContent) =>
              mapContent
                .get(ownedProductName)
                .toRight(
                  SoftOptInError(
                    "ConsentsCalculator",
                    s"getCancConsents couldn't find $ownedProductName in consentsMappings"
                  )
                )
                .flatMap(productConsents =>
                  acc match {
                    case Right(ownedProductConsents) =>
                      Right(ownedProductConsents.union(productConsents))
                    case other => other
                  })
          }

      }
      .flatMap(ownedProductConsents => {
        consentsMappings match {
          case Left(error) =>
            Left(
              SoftOptInError(
                "ConsentsCalculator",
                s"Error occurred getting AcqConsents: ${error.toString}"
              )
            )
          case Right(mapContent) =>
            mapContent
              .get(canceledProductName)
              .toRight(
                SoftOptInError(
                  "ConsentsCalculator",
                  s"getCancConsents couldn't find $canceledProductName in consentsMappings"
                )
              )
              .flatMap(canceledProductConsents =>
                Right(canceledProductConsents.diff(ownedProductConsents)))
        }

      })
  }

  def buildConsentsBody(consents: Set[String], state: Boolean): String = {
    case class consentsObject(id: String, consented: Boolean)

    consents.map(consentsObject(_, state)).asJson.toString()
  }
}
