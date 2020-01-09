package com.gu.delivery_records_api

import java.time.LocalDate

import cats.effect.IO
import com.gu.delivery_records_api.DeliveryRecordsService.deliveryRecordsQuery
import com.gu.salesforce.sttp.SalesforceStub._
import com.gu.salesforce.{IdentityId, RecordsWrapperCaseClass, SFAuthConfig, SalesforceAuth, SalesforceContactId}
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import org.http4s.{Header, Headers, Method, Query, Request, Response, Uri}
import org.scalatest.{EitherValues, FlatSpec, Matchers}
import io.circe.generic.auto._
import io.circe.parser._

class DeliveryRecordsApiTest extends FlatSpec with Matchers with EitherValues {
  val config = SFAuthConfig("https://salesforceAuthUrl", "sfClientId", "sfClientSecret", "sfUsername", "sfPassword", "sfToken")
  val auth = SalesforceAuth("salesforce-access-token", "https://salesforceInstanceUrl")
  val subscriptionNumber = "A-213123"
  val identityId = "identity id"
  val buyerContactId = "contact id"
  val deliveryDate = LocalDate.now()
  val deliveryAddress = "a delivery address"
  val addressLine1 = "an address line 1"
  val addressLine2 = "an address line 2"
  val addressLine3 = "an address line 3"
  val addressTown = "an address town"
  val addressCountry = "an address country"
  val addressPostcode = "an address postcode"
  val deliveryInstruction = "leave by the gnome"
  val hasHolidayStop = true
  val sfProblemCase = SFApiDeliveryProblemCase(
    Id = "case_id",
    Subject = Some("subject"),
    Description = Some("blah blah"),
    Case_Closure_Reason__c = Some("Paper Damaged")
  )

  val validSalesforceResponseBody = RecordsWrapperCaseClass(
    List(
      SFApiSubscription(
        Delivery_Records__r = Some(
          RecordsWrapperCaseClass(
            List(
              SFApiDeliveryRecord(
                Delivery_Date__c = Some(deliveryDate),
                Delivery_Address__c = Some(deliveryAddress),
                Address_Line_1__c = Some(addressLine1),
                Address_Line_2__c = Some(addressLine2),
                Address_Line_3__c = Some(addressLine3),
                Address_Town__c = Some(addressTown),
                Address_Country__c = Some(addressCountry),
                Address_Postcode__c = Some(addressPostcode),
                Delivery_Instructions__c = Some(deliveryInstruction),
                Has_Holiday_Stop__c = Some(hasHolidayStop),
                Case__r = Some(sfProblemCase)
              )
            )
          )
        )
      )
    )
  )

  val expectedValidDeliveryApiResponse = DeliveryRecordsApiResponse(
    List(
      DeliveryRecord(
        Some(deliveryDate),
        Some(deliveryInstruction),
        Some(deliveryAddress),
        Some(addressLine1),
        Some(addressLine2),
        Some(addressLine3),
        Some(addressTown),
        Some(addressCountry),
        Some(addressPostcode),
        Some(hasHolidayStop),
        Some(sfProblemCase.Id)
      )
    ),
    Map(
      sfProblemCase.Id -> DeliveryProblemCase(
        id = sfProblemCase.Id,
        subject = sfProblemCase.Subject,
        description = sfProblemCase.Description,
        problemType = sfProblemCase.Case_Closure_Reason__c
      )
    )
  )

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
  it should "fail to create if salesforce auth fails" in {
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
    DeliveryRecordsApiApp(config, salesforceBackendStub).value.unsafeRunSync().right.value
  }
}
