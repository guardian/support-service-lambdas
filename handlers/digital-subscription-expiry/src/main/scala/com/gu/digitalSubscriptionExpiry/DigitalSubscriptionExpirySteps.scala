package com.gu.digitalSubscriptionExpiry

import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.Operation
import com.gu.util.apigateway.ApiGatewayRequest
import com.gu.util.apigateway.ResponseModels.{ApiResponse, Headers}
import com.gu.util.reader.Types._
import main.scala.com.gu.digitalSubscriptionExpiry.DigitalSubscriptionExpiryRequest

//import org.joda.time.format.DateTimeFormat
import play.api.libs.json.{JsValue, Json}

import scala.util.Try
import scalaz.-\/
import scalaz.std.option.optionSyntax._

object DigitalSubscriptionExpirySteps extends Logging {

  def getZuoraExpiry(): Option[SuccessResponse] = {
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

  def parseJson(input: String): Option[JsValue] = Try(Json.parse(input)).toOption

  def apply(
    getEmergencyTokenExpiry: String => Option[SuccessResponse]
  ): Operation = {

    def steps(apiGatewayRequest: ApiGatewayRequest): FailableOp[Unit] = {
      val successfulOrErrorResponse = for {
        jsonRequest <- parseJson(apiGatewayRequest.body).toRightDisjunction(badRequest)
        expiryRequest <- Json.fromJson[DigitalSubscriptionExpiryRequest](jsonRequest).asOpt.toRightDisjunction(badRequest)
        expiryResponse <- (getEmergencyTokenExpiry(expiryRequest.subscriberId) orElse getZuoraExpiry()).toRightDisjunction(notFoundResponse)
      } yield {
        apiResponse(expiryResponse, "200")
      }
      val response = successfulOrErrorResponse.valueOr(identity)
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

  def apiResponse(body: DigitalSubscriptionExpiryResponse, status: String) = {
    val bodyTxt = Json.prettyPrint(Json.toJson(body))
    ApiResponse(status, new Headers, bodyTxt)
  }

  val notFoundResponse = apiResponse(ErrorResponse("Unknown subscriber", -90), "404")
  val badRequest = apiResponse(ErrorResponse("Mandatory data missing from request", -50), "400")

}

