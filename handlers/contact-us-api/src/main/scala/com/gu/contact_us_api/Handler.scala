package com.gu.contact_us_api

import java.io.{InputStream, OutputStream}
import com.amazonaws.services.lambda.runtime.Context
import com.gu.contact_us_api.models.{ContactUsFailureResponse, ContactUsSuccessfulResponse}
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.ResponseModels.ApiResponse
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing
import io.circe.syntax._

object Handler extends Logging {
  val contactUsReqHandler = new ContactUs(new SalesforceConnector())

  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit = {
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      def operation(apiGatewayRequest: ApiGatewayRequest): ApiResponse = {
        logger.info("Received request with body " + apiGatewayRequest.body)

        obtainResponse(apiGatewayRequest.body) match {
          case Right(succ) => ApiResponse("201", succ.asJson.toString())
          case Left(err) => ApiResponse("500", err.asJson.toString())
        }
      }

      ContinueProcessing(Operation.noHealthcheck(steps = operation))
    }

    def obtainResponse(reqBody: Option[String]): Either[ContactUsFailureResponse, ContactUsSuccessfulResponse] = {
      reqBody.map(body => Right(contactUsReqHandler.processReq(body)))
        .getOrElse(Left(ContactUsFailureResponse("Could not process: Empty request body."))).flatten
    }
  }
}
