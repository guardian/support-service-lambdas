package com.gu.productmove.zuora

import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.ExpectedInput
import com.gu.productmove.endpoint.move.{ProductMoveEndpoint, ProductMoveEndpointSteps}
import com.gu.productmove.zuora.model.SubscriptionName
import com.gu.productmove.zuora.rest.{ZuoraClientLive, ZuoraGet, ZuoraGetLive}
import com.gu.productmove.SecretsLive
import com.gu.productmove.*
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType
import com.gu.productmove.endpoint.move.switchtype.{
  GetRatePlans,
  RecurringContributionToSupporterPlus,
  RecurringContributionToSupporterPlusImpl,
  ToRecurringContribution,
  ToRecurringContributionImpl,
}
import com.gu.supporterdata.model.Stage.CODE
import zio.*
import zio.test.Assertion.*
import zio.test.*

import java.time.*

object ProductMoveSpec {

  @main
  def runSwitchLocally(): Unit =
    val postData = ExpectedInput(
      price = 120,
      preview = false,
      csrUserId = None,
      caseId = None,
    )
    runTest(postData, "A-S00702950")

  @main
  def runSwitchPreviewLocally(): Unit =
    val postData = ExpectedInput(95, true, None, None)
    runTest(postData, "A-S00716446")

  private def runTest(postData: ExpectedInput, subscriptionName: String): Unit = {
    val output =
      for {
        _ <- TestClock.setTime(Instant.now())
        ep <- defaultProductMoveEndpoint()
        output <- ep.runWithLayers(
          SwitchType.RecurringContributionToSupporterPlus,
          SubscriptionName(subscriptionName),
          postData,
          Some(IdentityId("test")),
        )
      } yield output
    println(output)
  }

  private def defaultProductMoveEndpoint(): Task[ProductMoveEndpointSteps] =
    (for {
      subscriptionUpdate <- ZIO.service[SubscriptionUpdate] // TODO make these all layers into normal params
      zuoraGet <- ZIO.service[ZuoraGet]
      getInvoiceItems <- ZIO.service[GetInvoiceItems]
      getInvoice <- ZIO.service[GetInvoice]
      createPayment <- ZIO.service[CreatePayment]
      invoiceItemAdjustment <- ZIO.service[InvoiceItemAdjustment]
      getSubscription <- ZIO.service[GetSubscription]
      getAccount <- ZIO.service[GetAccount]
      sqs <- ZIO.service[SQS]
      dynamo <- ZIO.service[Dynamo]
      stage = GuStageLive.get
    } yield new ProductMoveEndpointSteps(
      new RecurringContributionToSupporterPlusImpl(
        new GetRatePlans(
          stage,
          new GetCatalogueLive(
            AwsS3Live(AwsS3Live.impl(AwsCredentialsLive.impl)),
            stage,
          ),
        ),
        subscriptionUpdate,
        TermRenewalLive(zuoraGet),
        getInvoiceItems,
        getInvoice,
        createPayment,
        invoiceItemAdjustment,
        sqs,
        dynamo,
      ),
      new ToRecurringContributionImpl(
        subscriptionUpdate,
        SQSLive.impl(stage, AwsCredentialsLive.impl).get,
        stage,
      ),
      getSubscription,
      getAccount,
    ))
      .provide(
        GetSubscriptionLive.layer,
        AwsCredentialsLive.layer,
        SttpClientLive.layer,
        ZuoraClientLive.layer,
        ZuoraGetLive.layer,
        SubscriptionUpdateLive.layer,
        SQSLive.layer,
        GetAccountLive.layer,
        GuStageLive.layer,
        DynamoLive.layer,
        GetInvoiceItemsLive.layer,
        GetInvoiceLive.layer,
        InvoiceItemAdjustmentLive.layer,
        CreatePaymentLive.layer,
        SecretsLive.layer,
      )

}
