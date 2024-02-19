package com.gu.productmove.endpoint.cancel

import com.gu.productmove.GuStageLive.Stage.CODE
import com.gu.productmove.endpoint.available.Currency.GBP
import com.gu.productmove.endpoint.move.ProductMoveEndpoint.SwitchType.RecurringContributionToSupporterPlus
import com.gu.productmove.endpoint.move.ProductMoveEndpointTypes.{ExpectedInput, Success}
import com.gu.productmove.endpoint.move.switchtype.RecurringContributionToSupporterPlus
import com.gu.productmove.endpoint.zuora.GetSubscriptionToCancel
import com.gu.productmove.zuora.GetAccount.{BasicInfo, GetAccountResponse}
import com.gu.productmove.zuora.GetSubscription.GetSubscriptionResponse
import com.gu.productmove.zuora.model.{AccountNumber, SubscriptionName}
import com.gu.productmove.zuora.*
import com.gu.productmove.{Dynamo, IdentityId, SQS}
import zio.test.{ZIOSpecDefault, assertTrue}
import zio.{Task, UIO, URIO, ZIO}

import java.time.LocalDate

object SubscriptionCancelEndpointStepsSpec extends ZIOSpecDefault {
  override def spec = suite("SubscriptionCancelEndpointStepsSpec")(
    test("can get through with the right identity id") {
      runCheck(
        identityInZuora = Some("johnIdentity"),
        identityOfMMAUser = "johnIdentity",
      ).map(wasCalled => assertTrue(wasCalled))
    },
    test("can't get through with the wrong identity id") {
      runCheck(
        identityInZuora = Some("victimIdentity"),
        identityOfMMAUser = "baddieIdentity",
      ).map(wasCalled => assertTrue(!wasCalled))
    },
    test("can't get through if no identity id in zuora") {
      runCheck(
        identityInZuora = None,
        identityOfMMAUser = "baddieIdentity",
      ).map(wasCalled => assertTrue(!wasCalled))
    },
  )

  case object CarriedOnException extends Throwable

  private def runCheck(
      identityInZuora: Option[String],
      identityOfMMAUser: String,
  ): Task[Boolean] = {
    val sub = "johnSub"
    val acc = "accountNumber"
    new SubscriptionCancelEndpointSteps(
      mockGetSubscription(sub, acc),
      mockGetAccount(acc, identityInZuora),
      new GetSubscriptionToCancel() {
        override def get(
            subscriptionName: SubscriptionName,
        ): Task[GetSubscriptionToCancel.GetSubscriptionToCancelResponse] =
          ZIO.fail(CarriedOnException)
      },
      null,
      null,
      null,
      null,
    ).subscriptionCancel(
      SubscriptionName(sub),
      null,
      IdentityId(identityOfMMAUser),
    ).as(false)
      .catchSome { case CarriedOnException =>
        ZIO.succeed(true)
      }
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

}
