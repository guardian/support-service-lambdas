package com.gu.batchemailsender.api.batchemail

import com.gu.util.Logging
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayRequest, ApiGatewayResponse}

class HandleEmailBatchRequest(val sendBatch: SendEmailBatchToSqs) extends Logging {
  def apply(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
    apiGatewayRequest
      .bodyAsCaseClass[EmailBatch]()
      .map(batch => {
        val result = sendBatch(batch.messages)
        if (result.exists(_.isFailed)) {
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
        } else {
          logger.info(s"Successfully sent all Braze SQS messages: ${batch.messages.mkString("\n\n")}")
          ApiGatewayResponse.successfulExecution
        }
      })
      .apiResponse
  }
}
