package com.gu.delivery_records_api

import java.time.LocalDate

import cats.effect.IO
import com.gu.salesforce.SalesforceQueryConstants.deliveryRecordsQuery
import com.gu.salesforce.sttp.SalesforceStub._
import com.gu.salesforce.{RecordsWrapperCaseClass, SFApiDeliveryRecord, SFApiSubscription, SFAuthConfig, SalesforceAuth}
import com.softwaremill.sttp.impl.cats.CatsMonadError
import com.softwaremill.sttp.testing.SttpBackendStub
import io.circe.Decoder
import org.http4s.{Header, Headers, Method, Request, Response, Uri}
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
  val deliveryInstruction = "leave by the gnome"
  val hasHolidayStop = true

  val validSalesforceResponseBody = RecordsWrapperCaseClass(
    List(
      SFApiSubscription(
        Delivery_Records__r = Some(
          RecordsWrapperCaseClass(
            List(
              SFApiDeliveryRecord(
                Delivery_Date__c = Some(deliveryDate),
                Delivery_Address__c = Some(deliveryAddress),
                Delivery_Instructions__c = Some(deliveryInstruction),
                Has_Holiday_Stop__c = Some(hasHolidayStop)
              )
            )
          )
        )
      )
    )
  )

  val expectedValidDeliveryApiResponse = List(
    DeliveryRecord(
      Some(deliveryDate),
      Some(deliveryInstruction),
      Some(deliveryAddress),
      Some(hasHolidayStop)
    )
  )

  "DeliveryRecordsService" should "lookup subscription with identity id" in {
    val backendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(auth, deliveryRecordsQuery(Left(identityId), subscriptionNumber), validSalesforceResponseBody)

    val app = createApp(backendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-identity-id", identityId))
      )
    ).value.unsafeRunSync().get

    getBody[List[DeliveryRecord]](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
  }
  it should "lookup subscription with contact id" in {
    val backendStub =
      SttpBackendStub[IO, Nothing](new CatsMonadError[IO])
        .stubAuth(config, auth)
        .stubQuery(auth, deliveryRecordsQuery(Right(buyerContactId), subscriptionNumber), validSalesforceResponseBody)

    val app = createApp(backendStub)
    val response = app.run(
      Request(
        method = Method.GET,
        Uri(path = s"/delivery-records/${subscriptionNumber}"),
        headers = Headers.of(Header("x-salesforce-contact-id", buyerContactId))
      )
    ).value.unsafeRunSync().get

    getBody[List[DeliveryRecord]](response) should equal(expectedValidDeliveryApiResponse)
    response.status.code should equal(200)
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

  private def createApp(backendStub: SttpBackendStub[IO, Nothing]) = {
    DeliveryRecordsApiApp(config, backendStub).value.unsafeRunSync().right.value
  }
}
