package com.gu.holiday_stops

import com.gu.salesforce.SalesforceClient.SalesforceErrorResponseBody
import com.gu.salesforce.holiday_stops.SalesforceHolidayStopRequest.{CompositeResponse, successStatusCodes}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.reader.Types.ApiGatewayOp
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import com.gu.util.resthttp.Types
import com.gu.util.resthttp.Types.ClientFailure
import play.api.libs.json.Json

import scala.util.{Failure, Success, Try}

class SFErrorExposer[A <: Product](
    action: String,
    inputThatCausedError: Option[A] = None,
) extends Logging {

  // if we get a 4xx error back, we can try parsing it to find the error codes
  // we need to pass on the error back to salesforce so it can display to the CSRs
  // https://github.com/guardian/salesforce/blob/356c08e5a28f947eb609cce53046ec459d0a2d3d/force-app/main/default/classes/HolidayStopRequestService.cls#L156
  def parseFailureTo500ApiResponse(failure: ClientFailure): ApiResponse =
    failure match {
      case error4xx: Types.Error4xx => // auth errors could be 401, validation could be 400
        Try(Json.parse(error4xx.body).as[List[SalesforceErrorResponseBody]]) match {
          case Success(sfErrors) =>
            logger.error(s"Failed to $action using input $inputThatCausedError: $sfErrors")
            sfErrors match {
              case Nil =>
                ApiGatewayResponse.messageResponse("500", "Salesforce error response didn't contain any detail")
              case sfError :: Nil =>
                ApiGatewayResponse.messageResponse("500", sfError.toString)
              case sfErrors =>
                val error = sfErrors.groupBy(_.errorCode).view.mapValues(_.map(_.message)).mkString.take(500)
                ApiGatewayResponse.messageResponse("500", error)
            }
          case Failure(exception) =>
            logger.warn("could not parse salesforce error as SalesforceErrorResponseBody", exception)
            logger.error(s"Failed to $action using input $inputThatCausedError: ${error4xx.body}")
            ApiGatewayResponse.messageResponse("500", "internal server error, check the logs for information")
        }
      case otherFailure =>
        logger.error(s"Failed to $action using input $inputThatCausedError: $otherFailure")
        ApiGatewayResponse.messageResponse("500", "internal server error, check the logs for information")
    }

  // even if a composite operation succeeds, there might be errors inside the individual results, so check them here
  // we need to pass on the error back to salesforce so it can display to the CSRs
  // https://github.com/guardian/salesforce/blob/356c08e5a28f947eb609cce53046ec459d0a2d3d/force-app/main/default/classes/HolidayStopRequestService.cls#L156
  def compositeResponseErrorto500ApiResponse(response: CompositeResponse): ApiGatewayOp[Unit] = {
    val failures = response.compositeResponse
      .filter(resp => !successStatusCodes.contains(resp.httpStatusCode))
    if (failures.isEmpty) {
      ContinueProcessing(())
    } else {
      logger.error(response.toString)
      val failuresStr: String = failures
        .flatMap(_.body.map(_.validate[List[SalesforceErrorResponseBody]].asOpt))
        .flatten
        .mkString(", ")
      val sfErrorText = s"MULTIPLE ERRORS : ${failuresStr.take(500)}${if (failuresStr.length > 500) "..." else ""}"
      logger.error(s"Failed to $action using input $inputThatCausedError: $sfErrorText")
      ReturnWithResponse(ApiGatewayResponse.messageResponse("500", sfErrorText))
    }
  }

}
