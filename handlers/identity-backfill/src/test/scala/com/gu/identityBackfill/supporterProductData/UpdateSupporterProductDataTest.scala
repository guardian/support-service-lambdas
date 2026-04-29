package com.gu.identityBackfill.supporterProductData

import com.gu.effects.sqs.AwsSQSSend.{Payload, QueueName}
import com.gu.identityBackfill.salesforce.UpdateSalesforceIdentityId.IdentityId
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

import java.time.LocalDate
import scala.collection.mutable.ListBuffer

class UpdateSupporterProductDataTest extends AnyFlatSpec with Matchers {

  private val queueName = QueueName("supporter-product-data-TEST")
  private val identityId = IdentityId("99999")

  private def subscription(name: String, ratePlans: List[ZuoraRatePlan] = Nil): ZuoraSubscription =
    ZuoraSubscription(
      subscriptionName = name,
      termEndDate = LocalDate.parse("2026-04-29"),
      contractEffectiveDate = LocalDate.parse("2025-04-29"),
      ratePlans = ratePlans,
    )

  private val ratePlanA = ZuoraRatePlan("rp-A-id", "Supporter Plus V2 - Monthly")
  private val ratePlanB = ZuoraRatePlan("rp-B-id", "Guardian Weekly")

  private class Recorder(failOn: Set[String] = Set.empty) {
    val sent: ListBuffer[Payload] = ListBuffer.empty

    def send(queue: QueueName, payload: Payload): Either[String, Unit] = {
      queue shouldBe queueName
      if (failOn.contains(payload.value)) Left("simulated failure")
      else {
        sent += payload
        Right(())
      }
    }
  }

  it should "send one message per rate plan for a single subscription" in {
    val recorder = new Recorder()
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val result = service.update(List(subscription("S-1", List(ratePlanA))), identityId)

    result shouldBe Right(())
    recorder.sent should have size 1
    recorder.sent.head.value should include("\"subscriptionName\":\"S-1\"")
    recorder.sent.head.value should include("\"identityId\":\"99999\"")
    recorder.sent.head.value should include("\"productRatePlanId\":\"rp-A-id\"")
    recorder.sent.head.value should include("\"termEndDate\":\"2026-04-29\"")
  }

  it should "send one message per rate plan when a subscription has multiple rate plans" in {
    val recorder = new Recorder()
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val result =
      service.update(List(subscription("S-1", List(ratePlanA, ratePlanB))), identityId)

    result shouldBe Right(())
    recorder.sent should have size 2
    val productRatePlanIds = recorder.sent.toList.flatMap { p =>
      "\"productRatePlanId\":\"([^\"]+)\"".r.findFirstMatchIn(p.value).map(_.group(1))
    }
    productRatePlanIds should contain theSameElementsAs List("rp-A-id", "rp-B-id")
  }

  it should "send messages across all subscriptions" in {
    val recorder = new Recorder()
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val subs = List(
      subscription("S-1", List(ratePlanA)),
      subscription("S-2", List(ratePlanB)),
    )

    val result = service.update(subs, identityId)

    result shouldBe Right(())
    recorder.sent should have size 2
  }

  it should "succeed without sending anything when there are no subscriptions" in {
    val recorder = new Recorder()
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val result = service.update(Nil, identityId)

    result shouldBe Right(())
    recorder.sent shouldBe empty
  }

  it should "succeed without sending anything when subscriptions have no rate plans" in {
    val recorder = new Recorder()
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val result = service.update(List(subscription("S-1", Nil)), identityId)

    result shouldBe Right(())
    recorder.sent shouldBe empty
  }

  it should "report SQS errors but still attempt every message" in {
    val payloadForA = Payload(
      """{"subscriptionName":"S-1","identityId":"99999","productRatePlanId":"rp-A-id","productRatePlanName":"Supporter Plus V2 - Monthly","termEndDate":"2026-04-29","contractEffectiveDate":"2025-04-29"}""",
    )
    val recorder = new Recorder(failOn = Set(payloadForA.value))
    val service = new UpdateSupporterProductDataService(queueName, recorder.send)

    val result =
      service.update(List(subscription("S-1", List(ratePlanA, ratePlanB))), identityId)

    result.isLeft shouldBe true
    result.left.toOption.get should include("S-1/rp-A-id")
    recorder.sent.map(_.value).exists(_.contains("\"productRatePlanId\":\"rp-B-id\"")) shouldBe true
  }
}
