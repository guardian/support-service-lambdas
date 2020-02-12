package com.gu.delivery_records_api

import java.time.LocalDate

import cats.effect.IO
import com.gu.delivery_records_api.DeliveryRecordsService.deliveryRecordsQuery
import com.gu.salesforce.sttp.{SFApiCompositeResponse, SFApiCompositeResponsePart}
import com.gu.salesforce.sttp.SalesforceStub._
import com.gu.salesforce.{IdentityId, RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceContactId}
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import org.http4s.{Header, Headers, Method, Query, Request, Response, Uri}
import org.scalatest.{EitherValues, FlatSpec, Inside, Matchers}
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax._
import org.http4s.circe._

class DeliveryRecordsApiTest extends FlatSpec with Matchers with EitherValues {
  val config = SFAuthConfig("https://salesforceAuthUrl", "sfClientId", "sfClientSecret", "sfUsername", "sfPassword", "sfToken")
  val auth = SalesforceAuth("salesforce-access-token", "https://salesforceInstanceUrl")
  val subscriptionNumber = "A-213123"
  val identityId = "identity id"
  val buyerContactId = "contact id"
  val deliveryRecordId = "id"
  val deliveryDate: LocalDate = LocalDate.now()
  val deliveryAddress1 = "a delivery address"
  val deliveryAddress2 = "a detailed delivery address"
  val addressLine1 = "an address line 1"
  val addressLine2 = "an address line 2"
  val addressLine3 = "an address line 3"
  val addressTown = "an address town"
  val addressCountry = "an address country"
  val addressPostcode = "an address postcode"
  val deliveryInstruction1 = "leave by the gnome"
  val deliveryInstruction2 = "leave by the red gnome"
  val hasHolidayStop = true
  val doesntHaveHolidayStop = true
  val sfProblemCase = SFApiDeliveryProblemCase(
    Id = "case_id",
    Subject = Some("subject"),
    Description = Some("blah blah"),
    Case_Closure_Reason__c = Some("Paper Damaged")
  )
  val creditAmount = 1.23
  val invoiceDate = LocalDate.of(2019, 12, 10)
  val isActioned = true
  val contactNumbers = SFApiContactPhoneNumbers(
    Id = Some("id"),
    Phone = Some("+447654321234"),
    HomePhone = Some("+441234567890"),
    MobilePhone = Some("garbage"),
    OtherPhone = None
  )

  val sfDeliveryRecordA = SFApiDeliveryRecord(
    Id = deliveryRecordId,
    Delivery_Date__c = Some(deliveryDate),
    Delivery_Address__c = Some(deliveryAddress1),
    Address_Line_1__c = Some(addressLine1),
    Address_Line_2__c = Some(addressLine2),
    Address_Line_3__c = Some(addressLine3),
    Address_Town__c = Some(addressTown),
    Address_Country__c = Some(addressCountry),
    Address_Postcode__c = Some(addressPostcode),
    Delivery_Instructions__c = Some(deliveryInstruction1),
    Has_Holiday_Stop__c = Some(doesntHaveHolidayStop),
    Case__r = Some(sfProblemCase),
    Credit_Amount__c = Some(creditAmount),
    Invoice_Date__c = Some(invoiceDate),
    Is_Actioned__c = isActioned
  )

  val sfDeliveryRecordWithHolidayStop: SFApiDeliveryRecord = sfDeliveryRecordA.copy(
    Has_Holiday_Stop__c = Some(hasHolidayStop),
    Delivery_Address__c = None,
    Delivery_Instructions__c = None
  )

  val sfDeliveryRecordB: SFApiDeliveryRecord = sfDeliveryRecordA.copy(
    Delivery_Address__c = Some(deliveryAddress2),
    Delivery_Instructions__c = Some(deliveryInstruction2)
  )

  val validSalesforceResponseBody = RecordsWrapperCaseClass(
    List(
      SFApiSubscription(
        Buyer__r = contactNumbers,
        Delivery_Records__r = Some(
          RecordsWrapperCaseClass(
            List(
              sfDeliveryRecordB,
              sfDeliveryRecordB,
              sfDeliveryRecordWithHolidayStop,
              sfDeliveryRecordA,
              sfDeliveryRecordWithHolidayStop
            )
          )
        )
      )
    )
  )

  val expectedDeliveryRecordA = DeliveryRecord(
    id = deliveryRecordId,
    deliveryDate = Some(deliveryDate),
    deliveryInstruction = Some(deliveryInstruction1),
    deliveryAddress = Some(deliveryAddress1),
    addressLine1 = Some(addressLine1),
    addressLine2 = Some(addressLine2),
    addressLine3 = Some(addressLine3),
    addressTown = Some(addressTown),
    addressCountry = Some(addressCountry),
    addressPostcode = Some(addressPostcode),
    hasHolidayStop = Some(doesntHaveHolidayStop),
    problemCaseId = Some(sfProblemCase.Id),
    isChangedAddress = Some(false),
    isChangedDeliveryInstruction = Some(false),
    credit = Some(DeliveryProblemCredit(
      isActioned = isActioned,
      amount = creditAmount,
      invoiceDate = Some(invoiceDate)
    ))
  )

  val expectedDeliveryRecordWithHolidayStop: DeliveryRecord = expectedDeliveryRecordA.copy(
    deliveryInstruction = None,
    deliveryAddress = None,
    hasHolidayStop = Some(true),
    isChangedAddress = None,
    isChangedDeliveryInstruction = None
  )

  val expectedDeliveryRecordB: DeliveryRecord = expectedDeliveryRecordA.copy(
    deliveryInstruction = Some(deliveryInstruction2),
    deliveryAddress = Some(deliveryAddress2)
  )

  val expectedValidDeliveryApiResponse = DeliveryRecordsApiResponse(
    List(
      expectedDeliveryRecordB,
      expectedDeliveryRecordB.copy(
        isChangedAddress = Some(true),
        isChangedDeliveryInstruction = Some(true)
      ),
      expectedDeliveryRecordWithHolidayStop,
      expectedDeliveryRecordA,
      expectedDeliveryRecordWithHolidayStop
    ),
    Map(
      sfProblemCase.Id -> DeliveryProblemCase(
        id = sfProblemCase.Id,
        subject = sfProblemCase.Subject,
        description = sfProblemCase.Description,
        problemType = sfProblemCase.Case_Closure_Reason__c
      )
    ),
    contactNumbers.copy(MobilePhone = None)
  )

  val validCompositeResponse = SFApiCompositeResponse(List(
    SFApiCompositeResponsePart(200, "CaseCreation"),
    SFApiCompositeResponsePart(200, "LinkDeliveryRecord-deliveryRecordID"),
    SFApiCompositeResponsePart(200, "UpdateContactPhoneNumbers"),
  ))

  val failedCompositeResponse = SFApiCompositeResponse(List(
    SFApiCompositeResponsePart(400, "CaseCreation"),
    SFApiCompositeResponsePart(400, "LinkDeliveryRecord-deliveryRecordID"),
    SFApiCompositeResponsePart(400, "UpdateContactPhoneNumbers"),
  ))

  "DeliveryRecordsApp" should "lookup subscription with identity id" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(auth, deliveryRecordsQuery(IdentityId(identityId), subscriptionNumber, None, None), validSalesforceResponseBody)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-identity-id", identityId))
      )
    ).value.unsafeRunSync().get

    getBody[DeliveryRecordsApiResponse](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }
  it should "lookup subscription with contact id" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(auth, deliveryRecordsQuery(SalesforceContactId(buyerContactId), subscriptionNumber, None, None), validSalesforceResponseBody)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId))
      )
    ).value.unsafeRunSync().get

    getBody[DeliveryRecordsApiResponse](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }
  it should "lookup subscription with date filters" in {
    val endDate = LocalDate.now()
    val startDate = endDate.minusDays(1)

    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(
          auth,
          deliveryRecordsQuery(
            SalesforceContactId(buyerContactId),
            subscriptionNumber,
            Some(startDate),
            Some(endDate)
          ),
          validSalesforceResponseBody
        )

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(
          path = s"/delivery-records/${subscriptionNumber}",
          query = Query("startDate" -> Some(startDate.toString), "endDate" -> Some(endDate.toString))
        ),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId))
      )
    ).value.unsafeRunSync().get

    getBody[DeliveryRecordsApiResponse](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }
  it should "return 404 if no subscription returned from salesforce" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(
          auth,
          deliveryRecordsQuery(SalesforceContactId(buyerContactId), subscriptionNumber, None, None),
          RecordsWrapperCaseClass[SFApiSubscription](Nil)
        )

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId))
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(404)
  }

  val createDeliveryProblemBody = CreateDeliveryProblem(
    productName = "Guardian Weekly",
    description = Some("String"),
    problemType = "No Delivery",
    deliveryRecords = List(DeliveryRecordToLink(
      id = "deliveryRecordID",
      creditAmount = Some(1.23),
      invoiceDate = Some(LocalDate.of(2000, 1, 1))
    )),
    repeatDeliveryProblem = Some(true),
    newContactPhoneNumbers = Some(SFApiContactPhoneNumbers(
      Id = Some("contactID"),
      Phone = Some("1234567890")
    ))).asJson

  it should "create a delivery problem case and update contact with identity id" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubComposite(auth, validCompositeResponse)
        .stubQuery(auth, deliveryRecordsQuery(IdentityId(identityId), subscriptionNumber, None, None), validSalesforceResponseBody)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-identity-id", identityId)),
      ).withEntity(
        createDeliveryProblemBody
      )
    ).value.unsafeRunSync().get

    getBody[DeliveryRecordsApiResponse](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }

  it should "create a delivery problem case and update contact with contact id" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubComposite(auth, validCompositeResponse)
        .stubQuery(auth, deliveryRecordsQuery(SalesforceContactId(buyerContactId), subscriptionNumber, None, None), validSalesforceResponseBody)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId)),
      ).withEntity(
        createDeliveryProblemBody
      )
    ).value.unsafeRunSync().get

    getBody[DeliveryRecordsApiResponse](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }

  it should "fail to create a delivery problem case when parts of the composite request fail" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubComposite(auth, failedCompositeResponse)
        .stubQuery(auth, deliveryRecordsQuery(IdentityId(identityId), subscriptionNumber, None, None), validSalesforceResponseBody)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.POST,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-identity-id", identityId)),
      ).withEntity(
        createDeliveryProblemBody
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(500)
  }

  it should "return 500 request if salesforce fails" in {
    val salesforceBackendStub = SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
      .stubAuth(config, auth)
    //will return 404 for query endpoint

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId))
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(500)
  }
  it should "lookup return 400 if no auth headers" in {
    val salesforceBackendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)

    val app = createApp(salesforceBackendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}")
      )
    ).value.unsafeRunSync().get

    response.status.code should equal(400)
  }
  it should "fail to initialise if salesforce auth fails" in {
    val salesforceBackendStub = SttpBackendStub[IO, Nothing](new CatsMonadError[IO]) //Auth call not stubbed

    DeliveryRecordsApiApp(config, salesforceBackendStub).value.unsafeRunSync().isLeft should be(true)
  }

  private def getBody[A: Decoder](response: Response[IO]) = {
    parse(
      response
        .bodyAsText()
        .compile
        .toList
        .unsafeRunSync()
        .mkString("")
    ).right.value
      .as[A].right.value
  }

  private def createApp(salesforceBackendStub: SttpBackendStub[IO, Nothing]) = {
    Inside.inside(DeliveryRecordsApiApp(config, salesforceBackendStub).value.unsafeRunSync()) {
      case Right(value) => value
    }
  }
}
