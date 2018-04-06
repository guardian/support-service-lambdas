package com.gu.digitalSubscriptionExpiry

import com.gu.cas.Valid
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
//import org.joda.time.format.DateTimeFormat
import play.api.libs.json.{JsValue, Json}
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokens

import scala.util.{Success, Try}
import scalaz.{-\/}
import scalaz.std.option.optionSyntax._

object DigitalSubscriptionExpirySteps extends Logging {

  def getZuoraExpiry(): Option[DigitalSubscriptionExpiryResponse] = {
    //    val formatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    //    val expiryValue = formatter.parseDateTime("26/10/1985")
    //
    //    Some(DigitalSubscriptionExpiryResponse(Expiry(
    //      expiryDate = expiryValue,
    //      expiryType = ExpiryType.SUB,
    //      subscriptionCode = None,
    //      provider = Some("test provider")
    //    )))
    None
  }

  def getEmergencyTokenExpiry(subscriberId: String, emergencyTokens: EmergencyTokens): Option[DigitalSubscriptionExpiryResponse] = {
    import com.gu.digitalSubscriptionExpiry.emergencyToken.TokenPayloadOps._

    val upperCaseSubId = subscriberId.toUpperCase
    if (!upperCaseSubId.startsWith(emergencyTokens.prefix)) {
      println("it is not an emergency token")
      None
    } else {
      logger.info(s"EMERGENCY PROVIDER triggered for subscriber id:'$upperCaseSubId'")

      Try(emergencyTokens.codec.decode(upperCaseSubId)) match {

        case Success(Valid(payload)) =>
          logger.info(s"subscriber id:'$upperCaseSubId' resolves to $payload")
          logger.info(s"subscriber id:'$upperCaseSubId' was created on ${payload.creationDate}")

          val expiry = Expiry(
            expiryDate = payload.expiryDate,
            expiryType = ExpiryType.SUB,
            subscriptionCode = Some(payload.subscriptionCode),
            provider = Some(emergencyTokens.prefix)
          )
          Some(DigitalSubscriptionExpiryResponse(expiry))
        case errorResponse =>
          logger.error(s"error decoding token $subscriberId :  $errorResponse")
          None
      }
    }
  }

  def parseJson(input: String): Option[JsValue] = Try(Json.parse(input)).toOption

  def apply(emergencyTokens: EmergencyTokens): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      val responseOrError = for {
        jsonRequest <- parseJson(apiGatewayRequest.body).toRightDisjunction(badRequest)
        expiryRequest <- Json.fromJson[DigitalSubscriptionExpiryRequest](jsonRequest).asOpt.toRightDisjunction(badRequest)
        expiryResponse <- (getEmergencyTokenExpiry(expiryRequest.subscriberId, emergencyTokens) orElse getZuoraExpiry()).toRightDisjunction(notFoundResponse)
      } yield {
        val responseJson = Json.toJson(expiryResponse)
        ApiResponse("200", new Headers, Json.prettyPrint(responseJson))
      }

      val response = responseOrError.valueOr(identity)
      -\/(response)
    }

    //TODO
    //    def healthcheck() =
    //      for {
    //        identityId <- getByEmail(EmailAddress("john.duffell@guardian.co.uk")).leftMap(a => ApiGatewayResponse.internalServerError(a.toString)).withLogging("healthcheck getByEmail")
    //        _ <- countZuoraAccountsForIdentityId(identityId)
    //        _ <- sfAuth()
    //      } yield ()

    Operation.noHealthcheck(steps, false)

  }

  val notFoundResponse = {
    val notFoundBody =
      """
        |{
        |    "error": {
        |        "message": "Unknown subscriber",
        |        "code": -90
        |    }
        |}
      """.stripMargin
    ApiGatewayResponse.notFound(notFoundBody)
  }

  val badRequest = {
    val body =
      """
        |{
        |    "error": {
        |        "message": "Mandatory data missing from request",
        |        "code": -50
        |    }
        |}
      """.stripMargin
    ApiGatewayResponse.badRequestWithBody(body)
  }

}

