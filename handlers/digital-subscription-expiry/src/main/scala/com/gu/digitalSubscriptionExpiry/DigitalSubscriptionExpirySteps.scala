package com.gu.digitalSubscriptionExpiry

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.Json

import scalaz.-\/

object DigitalSubscriptionExpirySteps extends Logging {

  def getZuoraExpiry() = {
    val formatter = DateTimeFormat.forPattern("dd/MM/yyyy")
    val expiryValue = formatter.parseDateTime("26/10/1985")

    DigitalSubscriptionExpiryResponse(Expiry(
      expiryDate = expiryValue,
      expiryType = ExpiryType.SUB,
      subscriptionCode = None,
      provider = Some("test provider")
    ))
  }

  def getEmergencyTokenExpiry() = {

  }
  def apply(): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      val calloutParsed: Option[DigitalSubscriptionExpiryRequest] = Json.fromJson[DigitalSubscriptionExpiryRequest](Json.parse(apiGatewayRequest.body)).asOpt

      logger.info(s"Parsed request as: $calloutParsed")

      val responseJson = Json.toJson(getZuoraExpiry())

      -\/(ApiResponse("200", new Headers, Json.prettyPrint(responseJson)))
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

