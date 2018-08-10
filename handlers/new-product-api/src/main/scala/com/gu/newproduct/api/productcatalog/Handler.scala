package com.gu.newproduct.api.productcatalog

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.newproduct.api.productcatalog.WireModel._
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing

object Handler extends Logging {

  val wireCatalog = WireCatalog.fromCatalog(NewProductApi.catalog)

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      ContinueProcessing(
        Operation.noHealthcheck {
          Req: ApiGatewayRequest => ApiGatewayResponse(body = wireCatalog, statusCode = "200")
        }
      )
    }
}

