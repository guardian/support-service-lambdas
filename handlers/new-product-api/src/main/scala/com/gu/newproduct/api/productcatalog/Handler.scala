package com.gu.newproduct.api.productcatalog

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.util.Logging
import com.gu.util.apigateway.ApiGatewayHandler.{LambdaIO, Operation}
import com.gu.util.apigateway.{ApiGatewayHandler, ApiGatewayRequest, ApiGatewayResponse}
import com.gu.util.reader.Types.ApiGatewayOp.ContinueProcessing

object Handler extends Logging {

  // Referenced in Cloudformation
  def apply(inputStream: InputStream, outputStream: OutputStream, context: Context): Unit =
    ApiGatewayHandler(LambdaIO(inputStream, outputStream, context)) {
      ContinueProcessing(
        Operation.noHealthcheck {
          Req: ApiGatewayRequest => ApiGatewayResponse(body = catalog, statusCode = "200")
        }
      )
    }

  val catalog = {
    val voucherWindowRules = WindowRules(
      cutOffDayInclusive = Some(Tuesday),
      minDaysAfterCutOff = Some(20),
      sizeDays = Some(28)
    )
    val voucherEverydayRules = StartDateRules(
      daysOfWeek = Some(List(Monday)),
      windowRules = Some(voucherWindowRules)
    )

    val voucherEveryday = ProductInfo(
      id = "voucher_everyday",
      label = "Every day",
      startDateRules = Some(voucherEverydayRules)
    )

    val weekendsRule = voucherEverydayRules.copy(
      daysOfWeek = Some(List(Saturday, Sunday))
    )
    val voucherWeekend = ProductInfo(
      id = "voucher_weekend",
      label = "Weekend",
      startDateRules = Some(weekendsRule)
    )

    val contributionWindowRules = WindowRules(
      sizeDays = Some(1)
    )
    val contributionRules = StartDateRules(
      windowRules = Some(contributionWindowRules)
    )

    val monthlyContribution = ProductInfo(
      id = "monthly_contribution",
      label = "Monthly",
      startDateRules = Some(contributionRules)
    )
    val voucherGroup = Group("Voucher", List(voucherWeekend, voucherEveryday))
    val contributionGroup = Group("Contribution", List(monthlyContribution))
    Catalog(List(voucherGroup, contributionGroup))
  }
}

