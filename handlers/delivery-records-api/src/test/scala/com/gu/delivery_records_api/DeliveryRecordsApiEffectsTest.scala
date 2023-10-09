package com.gu.delivery_records_api

import cats.effect.{ContextShift, IO}
import com.gu.delivery_records_api.service.createproblem._
import com.gu.delivery_records_api.service.getrecords.{DeliveryProblemCase, DeliveryProblemCredit, DeliveryRecord, DeliveryRecordsApiResponse}
import com.gu.test.EffectsTest
import com.softwaremill.diffx.generic.auto._
import com.softwaremill.diffx.scalatest.DiffShouldMatcher
import io.circe.Json
import io.circe.generic.auto._
import io.circe.parser._
import io.circe.syntax.EncoderOps
import org.http4s._
import org.http4s.circe._
import org.scalatest.EitherValues
import org.scalatest.flatspec.AnyFlatSpec
import sttp.client3.asynchttpclient.cats.AsyncHttpClientCatsBackend

import java.time.LocalDate
import scala.concurrent._

class DeliveryRecordsApiEffectsTest extends AnyFlatSpec with DiffShouldMatcher with EitherValues {

  private implicit val contextShift: ContextShift[IO] = IO.contextShift(ExecutionContext.global)

  def expectedFor(result: DeliveryRecordsApiResponse): DeliveryRecordsApiResponse = {
    val deliveryProblemCase = result.deliveryProblemMap.values.head
    val caseId = deliveryProblemCase.id
    val caseNo = deliveryProblemCase.ref
    DeliveryRecordsApiResponse(
      results = List(
        DeliveryRecord(
          id = "a339E000000wF7MQAU",
          deliveryDate = Some(LocalDate.of(2023, 10, 4)),
          deliveryInstruction = Some("inst"),
          deliveryAddress = Some("a1, a2, a3, atown, United Kingdom, pcode"),
          addressLine1 = Some("a1"),
          addressLine2 = Some("a2"),
          addressLine3 = Some("a3"),
          addressTown = Some("atown"),
          addressCountry = Some("United Kingdom"),
          addressPostcode = Some("pcode"),
          hasHolidayStop = Some(false),
          bulkSuspensionReason = None,
          problemCaseId = Some(caseId),
          isChangedAddress = Some(false),
          isChangedDeliveryInstruction = Some(false),
          credit = Some(DeliveryProblemCredit(
            1.23,
            Some(LocalDate.of(2000, 1, 1)),
            isActioned = false
          ))
        )
      ),
      deliveryProblemMap = Map(
        caseId ->
          DeliveryProblemCase(
            id = caseId,
            ref = caseNo,
            subject = Some("[Self Service] Delivery Problem : No Delivery (Newspaper - National Delivery - A-S00689849)"),
            description = Some("descdesc"),
            problemType = Some("No Delivery")
          )
      ),
      contactPhoneNumbers = SFApiContactPhoneNumbers(
        Id = Some("0039E00001q22KdQAI"),
        Phone = None,
        HomePhone = None,
        MobilePhone = None,
        OtherPhone = None
      )
    )
  }

  "DeliveryRecordsApp" should "lookup sandbox national delivery subscription with identity id" taggedAs EffectsTest in {

    val subscriptionNumber = "A-S00689849" // test national delivery
    val identityId = "13552794" // has the above subscription

    val request = Request[IO](
      method = Method.GET,
      Uri(path = s"/delivery-records/$subscriptionNumber"),
      headers = Headers.of(Header("x-identity-id", identityId)),
    )

    val result = runRequestOnSandbox(request).unsafeRunSync()

    result shouldMatchTo((200, expectedFor(result._2)))
  }

  it should "create a delivery problem record in salesforce" taggedAs EffectsTest in {

    val subscriptionNumber = "A-S00689849" // test national delivery
    val identityId = "13552794" // has the above subscription

    val createDeliveryProblemBody: Json = CreateDeliveryProblem(
      productName = "Newspaper - National Delivery",
      description = Some("descdesc"),
      problemType = "No Delivery",
      deliveryRecords = List(
        DeliveryRecordToLink(
          id = "a339E000000wF7MQAU",
          creditAmount = Some(1.23),
          invoiceDate = Some(LocalDate.of(2000, 1, 1)),
        ),
      ),
      repeatDeliveryProblem = Some(true),
      newContactPhoneNumbers = None,
    ).asJson

    val request = Request[IO](
      method = Method.POST,
      Uri(path = s"/delivery-records/$subscriptionNumber"),
      headers = Headers.of(Header("x-identity-id", identityId)),
    ).withEntity(
      createDeliveryProblemBody,
    )

    val result = runRequestOnSandbox(request).unsafeRunSync()

    result shouldMatchTo ((200, expectedFor(result._2)))
  }

  private def runRequestOnSandbox(request: Request[IO]): IO[(Int, DeliveryRecordsApiResponse)] =
    for {
      sttp <- AsyncHttpClientCatsBackend[IO]()
      maybeRoutes <- DeliveryRecordsApiApp.buildHttpRoutes(sttp).value
      httpRoutesApp = maybeRoutes.left.map(e => throw new RuntimeException(s"failed to connect to SF: $e")).merge
      maybeResponse <- httpRoutesApp.run(request).value
      response = maybeResponse.get
      bodyData <- response.bodyText.compile.toList
      parsedBody = parse(bodyData.mkString).value.as[DeliveryRecordsApiResponse].value
    } yield (response.status.code, parsedBody)

}