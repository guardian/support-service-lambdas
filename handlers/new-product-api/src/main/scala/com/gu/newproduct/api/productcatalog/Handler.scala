package com.gu.newproduct.api.productcatalog

import java.io.{InputStream, OutputStream}

import com.amazonaws.services.lambda.runtime.Context
import com.gu.newproduct.api.productcatalog.WireModel._
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
    val voucherWindowRules = WireSelectableWindow(
      cutOffDayInclusive = Some(Tuesday),
      startDaysAfterCutOff = Some(20),
      sizeInDays = Some(28)
    )
    val voucherEverydayRules = WireStartDateRules(
      daysOfWeek = Some(List(Monday)),
      selectableWindow = Some(voucherWindowRules)
    )

    val voucherEveryday = WirePlanInfo(
      id = "voucher_everyday",
      label = "Every day",
      startDateRules = Some(voucherEverydayRules)
    )

    val weekendsRule = voucherEverydayRules.copy(
      daysOfWeek = Some(List(Saturday, Sunday))
    )
    val voucherWeekend = WirePlanInfo(
      id = "voucher_weekend",
      label = "Weekend",
      startDateRules = Some(weekendsRule)
    )

    val contributionWindowRules = WireSelectableWindow(
      sizeInDays = Some(1)
    )
    val contributionRules = WireStartDateRules(
      selectableWindow = Some(contributionWindowRules)
    )

    val monthlyContribution = WirePlanInfo(
      id = "monthly_contribution",
      label = "Monthly",
      startDateRules = Some(contributionRules)
    )
    val voucherGroup = WireProduct("Voucher", List(voucherWeekend, voucherEveryday))
    val contributionGroup = WireProduct("Contribution", List(monthlyContribution))
    WireCatalog(List(voucherGroup, contributionGroup))
  }
}

