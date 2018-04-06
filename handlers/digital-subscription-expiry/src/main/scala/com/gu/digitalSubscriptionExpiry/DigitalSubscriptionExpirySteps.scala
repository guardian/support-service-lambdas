package com.gu.digitalSubscriptionExpiry

import com.gu.cas.{Valid}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.Json
import com.gu.digitalSubscriptionExpiry.emergencyToken.EmergencyTokens

import scala.util.{Success, Try}
import scalaz.-\/

object DigitalSubscriptionExpirySteps extends Logging {

  def getZuoraExpiry(): Option[DigitalSubscriptionExpiryResponse] = {
    val formatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    val expiryValue = formatter.parseDateTime("26/10/1985")

    Some(DigitalSubscriptionExpiryResponse(Expiry(
      expiryDate = expiryValue,
      expiryType = ExpiryType.SUB,
      subscriptionCode = None,
      provider = Some("test provider")
    )))
  }

  def getEmergencyTokenExpiry(subscriberId: String, emergencyTokens: EmergencyTokens): Option[DigitalSubscriptionExpiryResponse] = {
    import com.gu.digitalSubscriptionExpiry.emergencyToken.TokenPayloadOps._

    val upperCaseSubId = subscriberId.toUpperCase
    if (!upperCaseSubId.startsWith(emergencyTokens.prefix)) {
      println("it is not an emergency token")
      None
    } else {
      //TODO SEE WHAT WE NEED TO LOG HERE
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
  def apply(emergencyTokens: EmergencyTokens): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      //TODO ADD DIFFERENT RESPONSE WHEN PARSING THE REQUEST RETURNS NONE
      val maybeResponse = for {
        expiryRequest <- Json.fromJson[DigitalSubscriptionExpiryRequest](Json.parse(apiGatewayRequest.body)).asOpt
        expiryResponse <- getEmergencyTokenExpiry(expiryRequest.subscriberId, emergencyTokens) orElse getZuoraExpiry()
      } yield {
        val responseJson = Json.toJson(expiryResponse)
        ApiResponse("200", new Headers, Json.prettyPrint(responseJson))
      }
      -\/(maybeResponse getOrElse notFoundResponse)
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

}

