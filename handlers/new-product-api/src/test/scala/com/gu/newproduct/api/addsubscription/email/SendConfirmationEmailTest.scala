package com.gu.newproduct.api.addsubscription.email

import com.gu.i18n.Currency.GBP
import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.VoucherSunday
import com.gu.newproduct.api.productcatalog.RuleFixtures.testStartDateRules
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.concurrent.Future

class SendConfirmationEmailTest extends AsyncFlatSpec with Matchers {
  it should "send confirmation email" in {
    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future {
      payload shouldBe ETPayload(
        "billToEmail@mail.com",
        testVoucherData,
        DataExtensionName("paper-voucher"),
        Some("sfContactId"),
      )
      ()
    }

    val send = SendConfirmationEmail(sqsSend) _
    send(Some(SfContactId("sfContactId")), testVoucherData).underlying map { result =>
      result shouldBe ContinueProcessing(())
    }
  }

  it should "return error if contact has no email" in {

    val noBilltoEmail = testVoucherData.contacts.billTo.copy(email = None)
    val noBilltoEmailContacts = testVoucherData.contacts.copy(billTo = noBilltoEmail)
    val noBilltoEmailVoucherData = testVoucherData.copy(contacts = noBilltoEmailContacts)

    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future.successful(())

    val send = SendConfirmationEmail(sqsSend) _
    send(Some(SfContactId("sfContactId")), noBilltoEmailVoucherData).underlying map { result =>
      result shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some error"))
    }
  }

  it should "return error if sqs send fails" in {

    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future.failed(new RuntimeException("sqs error"))

    val send = SendConfirmationEmail(sqsSend) _

    send(Some(SfContactId("sfContactId")), testVoucherData).underlying map { result =>
      result shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some error"))
    }
  }

  val testVoucherData = PaperEmailData(
    plan = Plan(VoucherSunday, PlanDescription("Sunday"), testStartDateRules),
    firstPaymentDate = LocalDate.of(2018, 9, 24),
    firstPaperDate = LocalDate.of(2018, 9, 23),
    subscriptionName = SubscriptionName("subName"),
    contacts = TestData.contacts,
    paymentMethod = TestData.directDebitPaymentMethod,
    currency = GBP,
    deliveryAgentDetails = None,
    discountMessage = None,
  )

}
