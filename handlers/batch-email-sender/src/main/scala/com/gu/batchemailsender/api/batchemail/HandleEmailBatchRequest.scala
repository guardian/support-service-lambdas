package com.gu.batchemailsender.api.batchemail

import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}
import play.api.libs.json.{JsObject, Json}

case class EmailBatch(messages: List[JsObject])

object EmailBatch {
  implicit val reads = Json.reads[EmailBatch]
}

class HandleEmailBatchRequest(val sendBatch: SendEmailBatchToSqs) extends Logging {
  def apply(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    apiGatewayRequest
      .bodyAsCaseClass[EmailBatch]()
      .map(send)
      .apiResponse
  }

  private def send(batch: EmailBatch): ApiResponse = {
    val result = sendBatch(batch.messages)
    if (result.exists(_.isFailed)) {
      failureResponse(result)
    } else {
      successResponse(batch)
    }
  }

  private def successResponse(batch: EmailBatch): ApiResponse = {
    logger.info(s"Successfully sent all Braze SQS messages: ${batch.messages.mkString("\n\n")}")
    ApiGatewayResponse.successfulExecution
  }

  case class PartialSendSuccess(message: String, code: Int)
  implicit val failureResponseWrites = Json.writes[PartialSendSuccess]

  private def failureResponse(result: List[SendResult]): ApiResponse = {
    val failedResults = result.filter(_.isFailed)
    val successfulResults = result.filterNot(_.isFailed).map(_.json)
    if (successfulResults.size > 0) {
      logger.info(s"Successfully sent these messages: ${successfulResults.mkString("\n\n")}")
    }
    failedResults.foreach { result =>
      val failure = result.failure.get
      logger.error(s"Failed to send Braze SQS message: ${result.json}", failure)
    }
    ApiGatewayResponse(
      "502",
      PartialSendSuccess("Failed to send some Braze SQS messages.", 502),
    )
  }
}