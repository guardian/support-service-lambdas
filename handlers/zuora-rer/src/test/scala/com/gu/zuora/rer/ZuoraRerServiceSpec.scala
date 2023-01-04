package com.gu.zuora.rer

import com.gu.effects.TestingRawEffects
import com.gu.effects.TestingRawEffects.{HTTPResponse, POSTRequest}
import com.gu.util.zuora.{ZuoraQuery, ZuoraRestConfig, ZuoraRestRequestMaker}
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class ZuoraRerServiceSpec extends AnyFlatSpec with Matchers {

  def zuoraRerService(fakeGetResponses: Map[String, HTTPResponse],
                      fakePutAndPostResponses: Map[POSTRequest, HTTPResponse] = Map()
                     ): ZuoraRerService = {
    val fakeZuoraConfig = ZuoraRestConfig("https://ddd", "fakeUser", "fakePass")
    val effects = new TestingRawEffects(500, fakeGetResponses, fakePutAndPostResponses)
    val requests = ZuoraRestRequestMaker(effects.response, fakeZuoraConfig)
    val zuoraQuerier = ZuoraQuery(requests)
    ZuoraRerService(requests, zuoraQuerier)
  }

  val testContact = ZuoraContact("1234567", "test@example.com")

  val subsResponseAllCancelled = "/subscriptions/accounts/1234567?page=1&pageSize=10000" ->
    HTTPResponse(200,
      """{"success": true,
        | "subscriptions": [
        |   {"id": "sub3", "status": "Cancelled"},
        |   {"id": "sub4", "status": "Expired"}
        | ]
        |}""".stripMargin)

  val subsResponseNotCancelled = "/subscriptions/accounts/1234567?page=1&pageSize=10000" ->
    HTTPResponse(200,
      """{"success": true,
        | "subscriptions": [
        |   {"id": "sub1", "status": "Active"},
        |   {"id": "sub2", "status": "Draft"},
        |   {"id": "sub3", "status": "Cancelled"},
        |   {"id": "sub4", "status": "Expired"}
        | ]
        |}""".stripMargin)

  val accountResponseZeroBalances = "/accounts/1234567" -> HTTPResponse(200,
    """{"success": true,
      | "basicInfo": {"accountNumber": "abc-123"},
      | "metrics": {"balance": "0.00", "creditBalance": "0.00", "totalInvoiceBalance": "0.00"}
      |}""".stripMargin)

  val accountResponseNotFound = "/accounts/1234567" -> HTTPResponse(200,
    """{"success":false,
      | "processId":"747E0D5A53240416",
      | "reasons":[
      |   {"code":50000040,"message":"Cannot find entity by key: '1234567'."}
      | ],"requestId":"359b0b97-c59b-439d-be52-f004f4c5e817"
      |}""".stripMargin)

  val accountResponseOutstandingBalances = "/accounts/1234567" -> HTTPResponse(200,
    """{"success": true,
      | "basicInfo": {"accountNumber": "abc-123"},
      | "metrics": {"balance": "10.37", "creditBalance": "0.00", "totalInvoiceBalance": "-3.45"}
      |}""".stripMargin)

  val scrubAccountPutResponse =
    POSTRequest("/accounts/1234567",
      """{"name":"abc-123","crmId":"","sfContactId__c":"","IdentityId__c":"","autoPay":false,"soldToContact":{"country":"United Kingdom"}}""",
      "PUT") -> HTTPResponse(200, """{"success": true}""")

  val paymentMethodsResponse = "/accounts/1234567/payment-methods" -> HTTPResponse(200,
    """{"success": true,
      | "bankTransfer": [
      |   {"id": "bank0123"}
      | ],
      | "creditCard": [
      |   {"id": "card0123"}
      | ]
      |}""".stripMargin)

  val scrubPaymentMethod1Response =
    POSTRequest("/payment-methods/bank0123/scrub", "{}", "PUT")  -> HTTPResponse(200, """{"success": true}""")

  val scrubPaymentMethod2Response =
    POSTRequest("/payment-methods/card0123/scrub", "{}", "PUT")  -> HTTPResponse(200, """{"success": true}""")

  val contactsResponse =
    POSTRequest("/action/query", """{"queryString":"SELECT Id, WorkEmail FROM Contact where AccountId='1234567'"}""") ->
      HTTPResponse(200,
    """{"done": true,
      | "size": 2,
      | "records": [
      |   {"Id": "5678", "WorkEmail": "test@example.com"},
      |   {"Id": "4567", "WorkEmail": "test2@example.com"}
      | ]
      |}""".stripMargin)

  val scrubMainContactResponse =
    POSTRequest("/contacts/5678/scrub", "{}", "PUT")  -> HTTPResponse(200, """{"success": true}""")

  val scrubNonMainContactResponse =
    POSTRequest("/contacts/4567/scrub", "{}", "PUT")  -> HTTPResponse(200, """{"success": true}""")

  val deleteBillingDocumentsResponse =
    POSTRequest("/accounts/billing-documents/files/deletion-jobs", """{"accountIds":["1234567"]}""")  ->
      HTTPResponse(200, """{"id":"98765","success": true,"status":"Pending"}""")

  val deletionJobCheckResponse =
    "/accounts/billing-documents/files/deletion-jobs/98765" -> HTTPResponse(200, """{"id":"98765","success": true,"status":"Completed"}""")


  "verifyErasure" should "pass if all subs cancelled and no outstanding balances" in {
    val service = zuoraRerService(Map(
      subsResponseAllCancelled,
      accountResponseZeroBalances
    ))

    service.verifyErasure(testContact) shouldEqual Right(())
  }

  it should "fail if subject has one or more subs that are not cancelled or expired" in {
    val service = zuoraRerService(Map(
      subsResponseNotCancelled,
      accountResponseZeroBalances
    ))

    service.verifyErasure(testContact) shouldEqual Left(
      PreconditionCheckError("Subscription contains a non-erasable status: Active,Draft"))
  }

  it should "fail if the subject has outstanding balances, positive or negative" in {
    val service = zuoraRerService(Map(
        subsResponseAllCancelled,
        accountResponseOutstandingBalances
    ))

    service.verifyErasure(testContact) shouldEqual Left(
      PreconditionCheckError("Account balances are not zero"))
  }

  "scrubAccount" should "succeed if all steps succeed" in {
    val service = zuoraRerService(Map(
      accountResponseZeroBalances,
      paymentMethodsResponse,
      deletionJobCheckResponse
    ),
      Map(
        scrubAccountPutResponse,
        scrubPaymentMethod1Response,
        scrubPaymentMethod2Response,
        contactsResponse,
        scrubNonMainContactResponse,
        deleteBillingDocumentsResponse,
        scrubMainContactResponse
      ))

    service.scrubAccount(testContact) shouldEqual Right(())
  }

  it should "fail on first error" in {
    val service = zuoraRerService(Map(accountResponseNotFound))

    service.scrubAccount(testContact) shouldEqual Left(ZuoraClientError("Received a 'not found' response from Zuora"))
  }
//  Erasure step fails
//  API GET calls fail or Json serialisation fails
//    Retrieve Account
//    Retrieve payment methods
//  Retrieve contacts
//    API PUT/POST calls fail
//    Scrub account object
//  Scrub payment methods
//    Scrub contacts
//    Delete billing documents (error or timeout)

}
