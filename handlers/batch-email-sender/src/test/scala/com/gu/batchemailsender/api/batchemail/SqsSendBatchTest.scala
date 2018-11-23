package com.gu.batchemailsender.api.batchemail

import com.gu.batchemailsender.api.batchemail.model._
import com.gu.effects.sqs.AwsSQSSend.Payload
import org.scalatest.FlatSpec

import scala.util.{Failure, Success, Try}

class SqsSendBatchTest extends FlatSpec {

  import SqsSendBatchTestData._

  behavior of "SqsSendBatch"

  "sendBatchSync" should "return an empty list when all sends were a success" in {
    SqsSendBatch.sendBatchSync(sqsSendStub)(List(batchItemToSucceed)) === Nil
  }

  "sendBatchSync" should "return an list with batch item ids when there are failed sends" in {
    SqsSendBatch.sendBatchSync(sqsSendStub)(List(batchItemToFail)) === List(EmailBatchItemId("fail-a2E6E000000aBxr"))

  }

}

object SqsSendBatchTestData {

  def sqsSendStub(payload: Payload): Try[Unit] = {
    if (payload.value.contains("fail-a2E6E000000aBxr")){
      Failure(new Exception("something went wrong!"))
    }
    else
      Success(())
  }

  val batchItemToFail = EmailBatchItem(
    payload = EmailBatchItemPayload(
      record_id = EmailBatchItemId("fail-a2E6E000000aBxr"),
      to_address = "dlasdj@dasd.com",
      subscriber_id = SubscriberId("A-S00044748"),
      sf_contact_id = SfContactId("0036E00000KtDaHQAV"),
      product = "Membership",
      next_charge_date = "2018-09-03",
      last_name = "bla",
      identity_id = Some(IdentityUserId("30002177")),
      first_name = "something",
      email_stage = "MBv1 - 1"
    ),
    object_name = "Card_Expiry__c"
  )

  val batchItemToSucceed = EmailBatchItem(
    payload = EmailBatchItemPayload(
      record_id = EmailBatchItemId("succeed-a2E6E000000aBxr"),
      to_address = "blahblah@blah.com",
      subscriber_id = SubscriberId("A-S00044749"),
      sf_contact_id = SfContactId("0036E00000KtDaHQAFG"),
      product = "Membership",
      next_charge_date = "2018-09-03",
      last_name = "bla",
      identity_id = Some(IdentityUserId("30002178")),
      first_name = "something",
      email_stage = "MBv1 - 1"
    ),
    object_name = "Card_Expiry__c"
  )

}
