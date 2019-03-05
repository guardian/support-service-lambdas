package com.gu.newproduct.api.addsubscription.email.paper

import java.time.LocalDate

import com.gu.newproduct.TestData
import com.gu.newproduct.api.addsubscription.email.{DataExtensionName, ETPayload}
import com.gu.newproduct.api.addsubscription.zuora.CreateSubscription.SubscriptionName
import com.gu.newproduct.api.addsubscription.zuora.GetAccount.SfContactId
import com.gu.newproduct.api.productcatalog.PlanId.VoucherSunday
import com.gu.newproduct.api.productcatalog.{Plan, PlanDescription}
import com.gu.util.apigateway.ApiGatewayResponse
import com.gu.util.reader.Types.ApiGatewayOp.{ContinueProcessing, ReturnWithResponse}
import org.scalatest.{AsyncFlatSpec, Matchers}

import scala.concurrent.Future

class SendPaperConfirmationEmailTest extends AsyncFlatSpec with Matchers {
  it should "send voucher confirmation email" in {
    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future {
      payload shouldBe ETPayload("billToEmail@mail.com", testVoucherData, DataExtensionName("paper-voucher"), Some("sfContactId"))
      ()
    }

    val send = SendPaperConfirmationEmail(sqsSend) _
    send(Some(SfContactId("sfContactId")), testVoucherData).underlying map {
      result => result shouldBe ContinueProcessing(())
    }
  }

  it should "return error if contact has no email" in {

    val noEmailBillTo = testVoucherData.contacts.billTo.copy(email = None)
    val noBillToEmailContacts = testVoucherData.contacts.copy(billTo = noEmailBillTo)
    val noBillToToEmailVoucherData = testVoucherData.copy(contacts = noBillToEmailContacts)

    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future.successful(())

    val send = SendPaperConfirmationEmail(sqsSend) _
    send(Some(SfContactId("sfContactId")), noBillToToEmailVoucherData).underlying map {
      result => result shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some error"))
    }
  }

  it should "return error if sqs send fails" in {

    def sqsSend(payload: ETPayload[PaperEmailData]): Future[Unit] = Future.failed(new RuntimeException("sqs error"))

    val send = SendPaperConfirmationEmail(sqsSend) _

    send(Some(SfContactId("sfContactId")), testVoucherData).underlying map {
      result => result shouldBe ReturnWithResponse(ApiGatewayResponse.internalServerError("some error"))
    }
  }

  val testVoucherData = PaperEmailData(
    plan = Plan(VoucherSunday, PlanDescription("Sunday")),
    firstPaymentDate = LocalDate.of(2018, 9, 24),
    firstPaperDate = LocalDate.of(2018, 9, 23),
    subscriptionName = SubscriptionName("subName"),
    contacts = TestData.contacts,
    paymentMethod = TestData.directDebitPaymentMethod
  )

}
