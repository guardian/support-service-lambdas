package com.gu.productmove.endpoint.move

import com.gu.productmove.GuStageLive.Stage.CODE
import com.gu.productmove.endpoint.available.Currency.GBP
import com.gu.productmove.{Dynamo, IdentityId, SQS}
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType.RecurringContributionToSupporterPlus
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, Success}
import com.gu.productmove.endpoint.move.switchtype.RecurringContributionToSupporterPlus
import com.gu.productmove.zuora.GetAccount.{BasicInfo, GetAccountResponse}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.{
  CreatePayment,
  DefaultPaymentMethod,
  GetAccount,
  GetCatalogue,
  GetInvoice,
  GetInvoiceItems,
  GetSubscription,
  InvoiceItemAdjustment,
  SubscriptionUpdate,
  TermRenewal,
  ZuoraProductCatalogue,
}
import zio.{Task, UIO, URIO, ZIO}
import zio.test.{ZIOSpecDefault, assertTrue}

import java.time.LocalDate

object ProductMoveEndpointSpec extends ZIOSpecDefault {
  override def spec = suite("ProductMoveEndpointSpec")(
    test("can get through with the right identity id") {
      runCheck(
        identityInZuora = Some("johnIdentity"),
        identityOfMMAUser = Some("johnIdentity"),
      ).map(wasCalled => assertTrue(wasCalled))
    },
    test("can get through from SF (zuora should always have an id)") {
      runCheck(
        identityInZuora = Some("johnIdentity"),
        identityOfMMAUser = None, // called from SF
      ).map(wasCalled => assertTrue(wasCalled))
    },
    test("can't get through with the wrong identity id") {
      runCheck(
        identityInZuora = Some("victimIdentity"),
        identityOfMMAUser = Some("baddieIdentity"),
      ).map(wasCalled => assertTrue(!wasCalled))
    },
    test("can't get through if no identity id in zuora") {
      runCheck(
        identityInZuora = None,
        identityOfMMAUser = Some("baddieIdentity"),
      ).map(wasCalled => assertTrue(!wasCalled))
    },
  )

  private def runCheck(
      identityInZuora: Option[String],
      identityOfMMAUser: Option[String],
  ): Task[Boolean] = {
    val mockRecurringContributionToSupporterPlus = new MockRecurringContributionToSupporterPlus
    val sub = "johnSub"
    val acc = "accountNumber"
    new ProductMoveEndpointSteps(
      mockRecurringContributionToSupporterPlus,
      null,
      mockGetSubscription(sub, acc),
      mockGetAccount(acc, identityInZuora),
    ).runWithLayers(
      RecurringContributionToSupporterPlus,
      SubscriptionName(sub),
      null,
      identityOfMMAUser.map(IdentityId.apply),
    ).as(mockRecurringContributionToSupporterPlus.wasCalled)
  }

  private def mockGetAccount(expectedAccountNumber: String, identityIdToReturn: Option[String]) = {
    new GetAccount:
      override def get(subscriptionNumber: AccountNumber): Task[GetAccountResponse] =
        if (subscriptionNumber.value == expectedAccountNumber)
          ZIO.succeed(
            GetAccountResponse(
              BasicInfo("", DefaultPaymentMethod("", None), identityIdToReturn.map(IdentityId.apply), "", 0, GBP),
              null,
              null,
            ),
          )
        else
          ZIO.fail(new Throwable(s"accountid: $subscriptionNumber"))

      override def getPaymentMethod(paymentMethodId: String): Task[GetAccount.PaymentMethodResponse] = ???
  }

  private def mockGetSubscription(expectedSubName: String, accountNumberToReturn: String) = {
    new GetSubscription:
      override def get(subscriptionName: SubscriptionName): Task[GetSubscriptionResponse] =
        if (subscriptionName.value == expectedSubName)
          ZIO.succeed(GetSubscriptionResponse("", "", AccountNumber(accountNumberToReturn), LocalDate.EPOCH, Nil))
        else
          ZIO.fail(new Throwable("subscriptionName: " + subscriptionName))
  }

  class MockRecurringContributionToSupporterPlus extends RecurringContributionToSupporterPlus:
    var wasCalled = false

    override def run(
        subscriptionName: SubscriptionName,
        postData: ExpectedInput,
        subscription: GetSubscriptionResponse,
        account: GetAccountResponse,
    ): UIO[ProductMoveEndpointTypes.OutputBody] =
      wasCalled = true
      ZIO.succeed(null)

}
